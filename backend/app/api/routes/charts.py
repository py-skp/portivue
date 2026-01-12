from datetime import date, timedelta
from typing import List, Optional
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.db import get_session
from app.models.user import User
from app.api.deps import get_current_user
from app.services.analytics import get_portfolio_history

try:
    from app.core.tenant import get_tenant_ctx, TenantContext
except ImportError:
    get_tenant_ctx = lambda: None
    TenantContext = None

router = APIRouter(prefix="/charts", tags=["charts"])

@router.get("/portfolio_history")
def portfolio_history(
    period: str = Query("1M", description="Period: 1M, 3M, 6M, YTD, 1Y, ALL"),
    base: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    today = date.today()
    start_date = today - relativedelta(months=1) # default
    
    p = period.upper()
    if p == "1M":
        start_date = today - relativedelta(months=1)
    elif p == "3M":
        start_date = today - relativedelta(months=3)
    elif p == "6M":
        start_date = today - relativedelta(months=6)
    elif p == "1Y":
        start_date = today - relativedelta(years=1)
    elif p == "YTD":
        start_date = date(today.year, 1, 1)
    elif p == "ALL":
        start_date = date(1900, 1, 1) # Service handles min activity date
    
    history = get_portfolio_history(session, user, start_date, today, base)
    return history
