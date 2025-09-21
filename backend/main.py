# app/main.py
from app.core.db import init_db

@app.on_event("startup")
def _startup():
    init_db()



# # backend/main.py
# import asyncio
# from datetime import datetime
# from typing import Any, Dict, List, Optional

# import httpx, yfinance as yf
# from fastapi import FastAPI, HTTPException, Query
# from fastapi.middleware.cors import CORSMiddleware
# from sqlmodel import SQLModel, Session, create_engine, select

# from models import Currency, AssetClass, Account, MarketInstrument, Activity

# DB_URL = "sqlite:///./portfolio.db"
# engine = create_engine(DB_URL, echo=False)
# SQLModel.metadata.create_all(engine)

# app = FastAPI(title="Portfolio API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_methods=["*"],
#     allow_headers=["*"],
#     allow_credentials=True,
# )

# # ---------- seed a few lookups ----------
# with Session(engine) as s:
#     if not s.exec(select(Currency)).first():
#         s.add_all([Currency(code=c) for c in ["USD","GBP","EUR","AED","PKR"]])
#     if not s.exec(select(AssetClass)).first():
#         s.add_all([AssetClass(name=n) for n in ["Equity","ETF","Bond","Crypto","Cash"]])
#     if not s.exec(select(Account)).first():
#         s.add(Account(name="Trading212-GBP", currency_code="GBP"))
#     s.commit()

# # ---------- lookups (list & create) ----------
# @app.get("/lookups/currencies")
# def list_currencies():
#     with Session(engine) as s:
#         return s.exec(select(Currency)).all()

# @app.post("/lookups/currencies")
# def create_currency(code: str, name: str | None = None):
#     with Session(engine) as s:
#         if s.get(Currency, code):
#             return {"ok": True}
#         s.add(Currency(code=code, name=name))
#         s.commit()
#         return {"ok": True}

# @app.get("/lookups/asset-classes")
# def list_asset_classes():
#     with Session(engine) as s:
#         return s.exec(select(AssetClass)).all()

# @app.post("/lookups/asset-classes")
# def create_asset_class(name: str):
#     with Session(engine) as s:
#         ac = AssetClass(name=name)
#         s.add(ac); s.commit(); s.refresh(ac)
#         return ac

# @app.get("/lookups/accounts")
# def list_accounts():
#     with Session(engine) as s:
#         return s.exec(select(Account)).all()

# @app.post("/lookups/accounts")
# def create_account(name: str, currency_code: str):
#     with Session(engine) as s:
#         acc = Account(name=name, currency_code=currency_code)
#         s.add(acc); s.commit(); s.refresh(acc)
#         return acc

# # ---------- instrument search & upsert ----------
# YF_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search"

# def _norm_yahoo(x: Dict[str, Any]) -> Dict[str, Any]:
#     return {
#         "provider": "yahoo",
#         "symbol": x.get("symbol"),
#         "name": x.get("shortname") or x.get("longname") or x.get("name"),
#         "exchange": x.get("exchDisp"),
#         "currency": x.get("currency"),
#         "asset_class_guess": x.get("quoteType"),  # EQUITY/ETF/CRYPTO/CURRENCY
#     }

# @app.get("/instruments/search")
# async def search_instruments(q: str = Query(..., min_length=1), limit: int = 10):
#     async with httpx.AsyncClient(timeout=6.0) as client:
#         r = await client.get(YF_SEARCH, params={"q": q, "quotesCount": limit, "newsCount": 0})
#         r.raise_for_status()
#         items = r.json().get("quotes") or []
#         return {"items": [_norm_yahoo(i) for i in items[:limit]]}

# @app.post("/instruments/upsert_from_yahoo")
# def upsert_from_yahoo(symbol: str, asset_class_id: int | None = None):
#     """Fetch profile via yfinance, then upsert MarketInstrument."""
#     t = yf.Ticker(symbol)
#     info = t.fast_info  # light
#     name = getattr(t, "info", {}).get("shortName") or symbol  # info may be slow; fallback
#     currency = info.get("currency") or "USD"
#     exch = info.get("exchange") or None

#     # try ISIN via .isin (yfinance may not always have it)
#     isin = getattr(t, "isin", None)
#     with Session(engine) as s:
#         # ensure currency exists
#         if not s.get(Currency, currency):
#             s.add(Currency(code=currency)); s.commit()
#         # pick asset class if passed; otherwise leave null
#         mi = s.exec(select(MarketInstrument).where(MarketInstrument.symbol==symbol)).first()
#         if not mi:
#             mi = MarketInstrument(
#                 name=name, symbol=symbol, isin=isin, exchange=exch,
#                 currency_code=currency, asset_class_id=asset_class_id,
#                 provider="yahoo", provider_ref=symbol
#             )
#             s.add(mi)
#         else:
#             mi.name = name or mi.name
#             mi.exchange = exch or mi.exchange
#             mi.currency_code = currency or mi.currency_code
#             if asset_class_id: mi.asset_class_id = asset_class_id
#             mi.provider = "yahoo"; mi.provider_ref = symbol
#         s.commit(); s.refresh(mi)
#         return mi

# @app.post("/instruments/manual")
# def create_manual_instrument(
#     name: str, symbol: str | None = None, isin: str | None = None,
#     currency_code: str | None = None, asset_class_id: int | None = None, exchange: str | None = None
# ):
#     with Session(engine) as s:
#         mi = MarketInstrument(
#             name=name, symbol=symbol, isin=isin, exchange=exchange,
#             currency_code=currency_code, asset_class_id=asset_class_id,
#             provider="manual", provider_ref=None
#         )
#         s.add(mi); s.commit(); s.refresh(mi)
#         return mi

# # ---------- quotes (latest price + timestamp) ----------
# @app.get("/quotes/{symbol}")
# def latest_quote(symbol: str):
#     try:
#         t = yf.Ticker(symbol)
#         price = t.fast_info.get("last_price")
#         hist = t.history(period="1d", interval="1m")
#         if hist.empty: hist = t.history(period="5d")
#         ts = hist.index[-1].isoformat()
#         return {"symbol": symbol, "price": float(price), "as_of": ts}
#     except Exception as e:
#         raise HTTPException(status_code=502, detail=str(e))

# # ---------- activities ----------
# @app.post("/activities")
# def create_activity(payload: Dict[str, Any]):
#     required = ["type","account_id","date","currency_code"]
#     if not all(k in payload for k in required):
#         raise HTTPException(400, detail=f"Missing required fields: {required}")
#     with Session(engine) as s:
#         act = Activity(
#             type=payload["type"],
#             account_id=payload["account_id"],
#             instrument_id=payload.get("instrument_id"),
#             date=datetime.fromisoformat(payload["date"]),
#             quantity=payload.get("quantity"),
#             unit_price=payload.get("unit_price"),
#             fee=payload.get("fee", 0.0),
#             note=payload.get("note"),
#             currency_code=payload["currency_code"],
#         )
#         s.add(act); s.commit(); s.refresh(act)
#         return act