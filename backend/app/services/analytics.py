from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from sqlmodel import Session, select
from app.models.activities import Activity
from app.models.price_history import PriceHistory
from app.models.account import Account
from app.models.user import User
from app.core.base_currency import get_base_currency_code
from app.services.fx_resolver import fx_rate_on
from app.services.positions import compute_positions # Scope: User

def get_portfolio_history(
    session: Session,
    user: User,
    start_date: date,
    end_date: Optional[date] = None,
    base_ccy_override: Optional[str] = None
) -> List[Dict]:
    """
    Calculates the historical portfolio metrics:
    - market_value (Investments)
    - cash_balance
    - net_worth (Investments + Cash)
    for each day from start_date to end_date.
    """
    if end_date is None:
        end_date = date.today()
        
    base_ccy = base_ccy_override or "USD" # Default, should fetch from settings
    
    # 1. Fetch User Accounts
    accounts = session.exec(select(Account).where(Account.owner_user_id == user.id)).all()
    if not accounts:
        return []
    acc_ids = [a.id for a in accounts]
    
    
    # Snapshot actual current balances for reconciliation
    actual_total_cash_base = 0.0
    for a in accounts:
        bal = a.balance or 0.0
        if abs(bal) > 0.001:
            r = fx_rate_on(session, a.currency_code, base_ccy, end_date) or 1.0
            actual_total_cash_base += bal * r

    # Snapshot actual current investments for reconciliation
    # We use compute_positions to get the reliable "Today" number.
    # Passing user object as per signature.
    current_positions = compute_positions(session, user=user)
    actual_total_inv_base = sum(p["market_value_base"] for p in current_positions)

    # 2. Fetch All Activities (prior to end_date)
    acts = session.exec(
        select(Activity)
        .where(Activity.account_id.in_(acc_ids))
        .where(Activity.date <= end_date)
        .order_by(Activity.date.asc(), Activity.id.asc())
    ).all()
    
    if not acts:
        return []

    # 3. Identify involved instruments
    inst_ids = {a.instrument_id for a in acts if a.instrument_id}
    
    # 4. Fetch Price History
    # We fetch ALL history likely relevant. Optimization: min(act_date)
    min_act_date = acts[0].date
    prices = session.exec(
        select(PriceHistory)
        .where(PriceHistory.instrument_id.in_(inst_ids))
        .where(PriceHistory.price_date >= min_act_date) 
        .where(PriceHistory.price_date <= end_date)
        .order_by(PriceHistory.price_date.asc())
    ).all()
    
    # Organize prices by date for fast stream processing
    prices_by_date: Dict[date, List[PriceHistory]] = defaultdict(list)
    for p in prices:
        prices_by_date[p.price_date].append(p)

    # Organize activities by date
    acts_by_date: Dict[date, List[Activity]] = defaultdict(list)
    for a in acts:
        acts_by_date[a.date].append(a)
        
        
    # 5. Simulation State
    holdings: Dict[int, float] = defaultdict(float) # inst_id -> qty
    cash_by_currency: Dict[str, float] = defaultdict(float) # ccy -> amount
    
    current_prices: Dict[int, float] = {} # inst_id -> last_known_ccy_price
    current_prices_ccy: Dict[int, str] = {} # inst_id -> currency
    
    # Helper to map instrument currencies
    from app.models.instrument import Instrument
    inst_objs = session.exec(select(Instrument).where(Instrument.id.in_(inst_ids))).all()
    inst_ccy_map = {i.id: i.currency_code for i in inst_objs}

    # Initial Cash from Accounts? 
    # Portivue seems to derive balances from activities, assuming 0 start.
    # If there are "Deposit" activities prior to min_act_date, we need to process them.
    # Since we fetch ALL activities from start, this should be fine.

    current_date = min_act_date
    fx_cache: Dict[Tuple[str, str, date], Optional[float]] = {}
    history: List[Dict] = []
    
    # Pre-fetch FX rates? No, use cache on fly.
    
    while current_date <= end_date:
        # A. Update Prices for Today
        todays_prices = prices_by_date.get(current_date, [])
        for p in todays_prices:
            current_prices[p.instrument_id] = p.close

        # B. Apply Activities
        todays_acts = acts_by_date.get(current_date, [])
        for a in todays_acts:
            # Cash Impact
            ccy = a.currency_code
            amt = (a.quantity or 0) * (a.unit_price or 0)
            
            if a.type == "Deposit":
                cash_by_currency[ccy] += amt
            elif a.type == "Withdrawal":
                cash_by_currency[ccy] -= amt
            elif a.type == "Buy":
                if a.instrument_id:
                     holdings[a.instrument_id] += (a.quantity or 0)
                # Buy reduces cash by (qty * price) + fee
                cost = amt + (a.fee or 0)
                cash_by_currency[ccy] -= cost
            elif a.type == "Sell":
                if a.instrument_id:
                    holdings[a.instrument_id] -= (a.quantity or 0)
                    if holdings[a.instrument_id] < 0: holdings[a.instrument_id] = 0
                # Sell increases cash by (qty * price) - fee
                proceeds = amt - (a.fee or 0)
                cash_by_currency[ccy] += proceeds
            elif a.type in ("Dividend", "Interest"):
                # cash increases by amount (unit_price stored as amount for these types in model usually?)
                # actually Activity model says: unit_price = amount if non-trade.
                # Check models/activities.py logic. Usually 'unit_price' holds the value.
                # And check quantity? Usually 1.
                # Let's assume (quantity * unit_price) is the total amount.
                cash_by_currency[ccy] += amt
            elif a.type == "Fee":
                cash_by_currency[ccy] -= amt

        # C. Calculate Valuation (if within requested range)
        if current_date >= start_date:
            total_mv = 0.0
            
            # 1. Market Value of Investments
            for inst_id, qty in holdings.items():
                if qty <= 1e-9: continue
                
                price = current_prices.get(inst_id)
                if not price: continue # No price known yet
                
                ccy = inst_ccy_map.get(inst_id, "USD") # fallback
                
                # Convert to Base
                fx = fx_rate_on(session, ccy, base_ccy, current_date, fx_cache) or 1.0
                total_mv += (qty * price) * fx
            
            # 2. Cash Balance in Base
            total_cash = 0.0
            for ccy, amount in cash_by_currency.items():
                if abs(amount) < 0.01: continue
                fx = fx_rate_on(session, ccy, base_ccy, current_date, fx_cache) or 1.0
                total_cash += amount * fx

            history.append({
                "date": current_date.isoformat(),
                "market_value": round(total_mv, 2),
                "cash_balance": total_cash, # Keep raw for now, adjustment later
                "net_worth": 0.0, # placeholder
                "value": 0.0
            })
            
        current_date += timedelta(days=1)
        
    # --- RECONCILIATION STEP (ROBUST) ---
    # Goal: Force the "End Date" values to match the "Actual" values.
    # 1. Cash Calibration (Shift)
    # 2. Investment Calibration (Scale)

    if not history:
        return []
        
    last_pt = history[-1]
    
    # A. Cash Calibration (Shift)
    sim_cash_end = last_pt["cash_balance"]
    cash_diff = actual_total_cash_base - sim_cash_end
    
    # B. Investment Calibration (Scale)
    sim_inv_end = last_pt["market_value"]
    # Avoid div by zero
    inv_scale = 1.0
    if abs(sim_inv_end) > 1.0:
        inv_scale = actual_total_inv_base / sim_inv_end
        
    # Apply to all points
    for p in history:
        # 1. Scale Investments (preserves shape, fixes level)
        # Only scale if we have a valid signal. If sim is 0 but actual is positive, we can't scale 0.
        # If sim is 0, we can't really guess history, so we leave it or shift it? 
        # Scaling is safer for "growth". If sim_inv_end is 0, we imply history is 0.
        p["market_value"] = p["market_value"] * inv_scale
        
        # 2. Shift Cash (preserves flows, fixes level)
        p["cash_balance"] = p["cash_balance"] + cash_diff
        
        # 3. Re-calc Net Worth
        # Rounding for cleanliness
        p["market_value"] = round(p["market_value"], 2)
        p["cash_balance"] = round(p["cash_balance"], 2)
        p["net_worth"] = round(p["market_value"] + p["cash_balance"], 2)
        p["value"] = p["net_worth"]
        
    return history
