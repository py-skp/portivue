# app/services/positions.py
from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Tuple, Any

from sqlmodel import Session, select
from app.models.activities import Activity
from app.models.instrument import Instrument
from app.models.account import Account
from app.models.user import User
from app.core.settings_svc import get_or_create_settings
from app.services.fx_resolver import fx_rate_on

# optional tenant support
try:
    from app.core.tenant import TenantContext
except Exception:
    TenantContext = Any


@dataclass
class Lot:
    qty: float = 0.0
    cost_ccy: float = 0.0   # cost in instrument txn currency
    cost_base: float = 0.0  # cost in app base currency


def _safe_div(a: float, b: float) -> float:
    return a / b if b else 0.0


def compute_positions(
    session: Session,
    base_ccy_override: Optional[str] = None,
    *,
    user: Optional[User] = None,
    ctx: Optional[TenantContext] = None,
) -> List[Dict]:
    """
    Rolls all Activities by (account_id, instrument_id) using moving-average method.
    Produces closing positions and valuations in both instrument currency and base currency.
    Scoped to a specific user (and optionally tenant/org via ctx).
    """
    if not user:
        return []

    # 0) base currency (from settings, but user-specific if you’ve extended settings per user)
    settings = get_or_create_settings(session, user=user)
    base_ccy = (base_ccy_override or settings.base_currency_code or "USD").upper()

    # 1) load this user's accounts
    accounts = session.exec(
        select(Account).where(Account.owner_user_id == user.id)
    ).all()
    if not accounts:
        return []
    acc_map: Dict[int, Account] = {a.id: a for a in accounts}
    acc_ids = list(acc_map.keys())

    # 2) load this user's activities (only from their accounts)
    acts = session.exec(
        select(Activity)
        .where(Activity.account_id.in_(acc_ids))
        .order_by(Activity.date.asc(), Activity.id.asc())
    ).all()
    if not acts:
        return []

    # 3) cache instruments
    inst_ids = {a.instrument_id for a in acts if a.instrument_id}
    inst_map: Dict[int, Instrument] = {}
    if inst_ids:
        rows = session.exec(select(Instrument).where(Instrument.id.in_(inst_ids))).all()
        inst_map = {r.id: r for r in rows}

    # 4) rolling lots
    Key = Tuple[int, int]
    lots: Dict[Key, Lot] = defaultdict(Lot)
    fx_cache: Dict[Tuple[str, str, date], Optional[float]] = {}

    for a in acts:
        if not a.instrument_id or a.type not in ("Buy", "Sell"):
            continue

        key: Key = (a.account_id, a.instrument_id)
        lot = lots[key]

        q = float(a.quantity or 0.0)
        p = float(a.unit_price or 0.0)
        fee = float(a.fee or 0.0)
        ccy = (a.currency_code or "").upper()
        trade_total = q * p + fee

        r = fx_rate_on(session, ccy, base_ccy, a.date, cache=fx_cache) or 0.0
        trade_total_base = trade_total * r

        if a.type == "Buy":
            lot.qty += q
            lot.cost_ccy += trade_total
            lot.cost_base += trade_total_base
        else:  # Sell
            if lot.qty <= 0:
                lot.qty -= q
            else:
                avg_ccy = _safe_div(lot.cost_ccy, lot.qty)
                avg_base = _safe_div(lot.cost_base, lot.qty)

                lot.qty -= q
                lot.cost_ccy -= avg_ccy * q
                lot.cost_base -= avg_base * q

            if lot.qty < 1e-10:
                lot.qty = 0.0
                lot.cost_ccy = 0.0
                lot.cost_base = 0.0

        lots[key] = lot

    # 5) build rows
    today = date.today()
    rows: List[Dict] = []
    for (account_id, instrument_id), lot in lots.items():
        if lot.qty <= 0:
            continue

        inst = inst_map.get(instrument_id)
        acc = acc_map.get(account_id)
        if not inst:
            rows.append({
                "account_id": account_id,
                "account_name": acc.name if acc else account_id,
                "instrument_id": instrument_id,
                "symbol": None,
                "name": None,
                "asset_class": None,
                "asset_subclass": None,
                "instrument_currency": None,
                "qty": lot.qty,
                "avg_cost_ccy": _safe_div(lot.cost_ccy, lot.qty),
                "avg_cost_base": _safe_div(lot.cost_base, lot.qty),
                "last_ccy": 0.0,
                "last_base": 0.0,
                "market_value_ccy": 0.0,
                "market_value_base": 0.0,
                "unrealized_ccy": -lot.cost_ccy,
                "unrealized_base": -lot.cost_base,
                "base_currency": base_ccy,
            })
            continue

        inst_ccy = (inst.currency_code or "").upper()
        last_ccy = float(inst.latest_price or 0.0)
        fx_today = fx_rate_on(session, inst_ccy, base_ccy, today, cache=fx_cache) or 0.0
        last_base = last_ccy * fx_today

        mv_ccy = lot.qty * last_ccy
        mv_base = lot.qty * last_base

        avg_cost_ccy = _safe_div(lot.cost_ccy, lot.qty)
        avg_cost_base = _safe_div(lot.cost_base, lot.qty)

        rows.append({
            "account_id": account_id,
            "account_name": acc.name if acc else account_id,
            "instrument_id": instrument_id,
            "symbol": inst.symbol or None,
            "name": inst.name,
            "asset_class": inst.asset_class,
            "asset_subclass": inst.asset_subclass,
            "instrument_currency": inst_ccy,
            "qty": lot.qty,
            "avg_cost_ccy": avg_cost_ccy,
            "avg_cost_base": avg_cost_base,
            "last_ccy": last_ccy,
            "last_base": last_base,
            "market_value_ccy": mv_ccy,
            "market_value_base": mv_base,
            "unrealized_ccy": mv_ccy - lot.cost_ccy,
            "unrealized_base": mv_base - lot.cost_base,
            "base_currency": base_ccy,
        })

    rows.sort(key=lambda r: (str(r["account_name"]), str(r["name"] or r["symbol"] or r["instrument_id"])))
    return rows