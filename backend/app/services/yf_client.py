# app/services/yf_client.py
from __future__ import annotations
from typing import Optional, Dict
from datetime import datetime, timezone
from yahooquery import Ticker
from .yf_enhancer import (
    convert_to_yahoo_symbol,
    convert_from_yahoo_symbol,
    parse_asset_class,
    format_name,
    DEFAULT_CURRENCY,
)

def _get_dict(val) -> dict:
    return val if isinstance(val, dict) else {}

def _to_utc_dt(val):
    """Coerce Yahoo 'regularMarketTime' into a timezone-aware UTC datetime."""
    if not val:
        return None
    # Already a datetime?
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    # Numeric epoch seconds (int/float)?
    try:
        if isinstance(val, (int, float)) or (isinstance(val, str) and val.isdigit()):
            return datetime.fromtimestamp(int(float(val)), tz=timezone.utc)
    except Exception:
        pass
    # String like "2025-08-16 01:00:01" or ISO-like
    if isinstance(val, str):
        s = val.strip().replace(" ", "T")  # make it ISO-ish
        # Try with 'Z' fallback
        for cand in (s, s + "Z"):
            try:
                dt = datetime.fromisoformat(cand.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue
    # Give up: return None rather than crashing
    return None

def fetch_profile_and_price(symbol: str, is_crypto: bool = False) -> Optional[Dict]:
    s = (symbol or "").upper().strip()
    if not s:
        return None

    ys = convert_to_yahoo_symbol(s, is_crypto=is_crypto)
    t = Ticker(ys, asynchronous=False)

    # yahooquery returns dicts keyed by the Yahoo symbol
    price_map         = _get_dict(getattr(t, "price", {}))
    quotes_map        = _get_dict(getattr(t, "quotes", {}))          # ✅ correct attr
    asset_profile_map = _get_dict(getattr(t, "asset_profile", {}))
    summary_profile_map = _get_dict(getattr(t, "summary_profile", {}))

    p  = _get_dict(price_map.get(ys))
    q  = _get_dict(quotes_map.get(ys))
    ap = _get_dict(asset_profile_map.get(ys))
    sp = _get_dict(summary_profile_map.get(ys))

    # If both are empty, Yahoo didn’t return anything for this symbol
    if not p and not q:
        return None

    long_name  = p.get("longName")
    short_name = p.get("shortName") or q.get("shortName")
    quote_type = p.get("quoteType") or q.get("quoteType")

    name = format_name(long_name, short_name, quote_type, s)
    asset_class, asset_subclass = parse_asset_class(quote_type, short_name)

    currency = p.get("currency") or q.get("currency") or DEFAULT_CURRENCY
    last     = p.get("regularMarketPrice") or q.get("regularMarketPrice")
    last_ts  = p.get("regularMarketTime")  or q.get("regularMarketTime")

    sector  = ap.get("sector")  or sp.get("sector")
    country = ap.get("country") or sp.get("country")

    return {
        "symbol": s,
        "name": name,
        "sector": sector,
        "country": country,
        "currency_code": currency,
        "asset_class": asset_class,
        "asset_subclass": asset_subclass,
        "latest_price": float(last) if last is not None else None,
        "latest_price_at": _to_utc_dt(last_ts),   # <-- use coercion here
        "yahoo_symbol": ys,
        "app_symbol": convert_from_yahoo_symbol(ys),
    }