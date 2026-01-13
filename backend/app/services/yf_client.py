# app/services/yf_client.py
from __future__ import annotations
import re
from typing import Optional, Dict
from datetime import datetime, timezone
import os
import time
import logging
import csv
import io

import requests
from yahooquery import Ticker

from .yf_enhancer import (
    convert_to_yahoo_symbol,
    convert_from_yahoo_symbol,
    parse_asset_class,
    format_name,
)

key = os.getenv("ALPHA_VANTAGE_KEY")
USE_YFINANCE_FALLBACK = os.getenv("ENABLE_YFINANCE_FALLBACK", "0").lower() in ("1","true","yes")

# make the import lazy to avoid loading when disabled
def _yf():
    if not USE_YFINANCE_FALLBACK:
        return None
    import yfinance as _yfinance  # local import
    return _yfinance

# Default currency fallback (only used for upsert/metadata)
DEFAULT_CURRENCY = "USD"

logger = logging.getLogger(__name__)

# =========================================================
# Small helpers
# =========================================================

def _get_dict(val) -> dict:
    return val if isinstance(val, dict) else {}

def _to_utc_dt(val):
    """Coerce Yahoo 'regularMarketTime' into a timezone-aware UTC datetime."""
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        if isinstance(val, (int, float)) or (isinstance(val, str) and val.isdigit()):
            return datetime.fromtimestamp(int(float(val)), tz=timezone.utc)
    except Exception:
        pass
    if isinstance(val, str):
        s = val.strip().replace(" ", "T")
        for cand in (s, s + "Z"):
            try:
                dt = datetime.fromisoformat(cand.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue
    return None

def _now_utc():
    return datetime.now(tz=timezone.utc)

def _float_or_none(x):
    try:
        return float(x)
    except Exception:
        return None

# =========================================================
# Upsert: profile + (one) price via yahooquery
# =========================================================

def fetch_profile_and_price(symbol: str, is_crypto: bool = False) -> Optional[Dict]:
    """
    Fetch metadata (name, sector, country, asset class) + latest price.
    Uses yahooquery; only called by /upsert_from_yahoo.
    """
    s = (symbol or "").upper().strip()
    if not s:
        return None

    ys = convert_to_yahoo_symbol(s, is_crypto=is_crypto)

    max_retries = 3
    backoff_s = 1.2
    for attempt in range(1, max_retries + 1):
        try:
            t = Ticker(ys, asynchronous=False)

            price_map = _get_dict(getattr(t, "price", {}))
            quotes_map = _get_dict(getattr(t, "quotes", {}))
            asset_profile_map = _get_dict(getattr(t, "asset_profile", {}))
            summary_profile_map = _get_dict(getattr(t, "summary_profile", {}))

            p  = _get_dict(price_map.get(ys, {}))
            q  = _get_dict(quotes_map.get(ys, {}))
            ap = _get_dict(asset_profile_map.get(ys, {}))
            sp = _get_dict(summary_profile_map.get(ys, {}))

            if not p and not q:
                raise RuntimeError("No price/quote payload")

            long_name  = p.get("longName")
            short_name = p.get("shortName") or q.get("shortName")
            quote_type = p.get("quoteType") or q.get("quoteType")

            name = format_name(long_name, short_name, quote_type, s)
            asset_class, asset_subclass = parse_asset_class(quote_type, short_name)

            currency = (p.get("currency") or q.get("currency") or DEFAULT_CURRENCY).upper()
            last     = p.get("regularMarketPrice") or q.get("regularMarketPrice")
            last_ts  = p.get("regularMarketTime")  or q.get("regularMarketTime")

            # ---- LSE norm: GBX → GBp (Post-Brexit/standardization)
            if currency == "GBX":
                currency = "GBp"
            # ----------------------------------------

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
                "latest_price_at": _to_utc_dt(last_ts),
                "yahoo_symbol": ys,
                "app_symbol": convert_from_yahoo_symbol(ys),
            }
        except Exception as e:
            logger.warning("[yahooquery] attempt %d/%d failed for %s: %s",
                           attempt, max_retries, s, e)
            if attempt < max_retries:
                time.sleep(backoff_s * attempt)
                continue
            return None

# =========================================================
# Latest price providers (no direct Yahoo endpoints here)
# =========================================================

# ---------- Stooq (daily close, no key) ----------
_STOOQ_SUFFIX_MAP = {
    "US": "us",  # default fallback
    "L":  "uk",  # London Stock Exchange (e.g., HSBA.L -> hsba.uk)
    "DE": "de",  # Frankfurt/Xetra      (e.g., SAP.DE -> sap.de)
    "PA": "pa",  # Paris                 (e.g., AIR.PA -> air.pa)
    "HK": "hk",  # Hong Kong             (e.g., 0005.HK -> 0005.hk)
    # extend as needed...
}

def _stooq_symbol(yahoo_symbol: str) -> str:
    """
    Map Yahoo-style tickers to Stooq tickers.

    Examples:
      LSE:  TSCO.L   -> tsco.uk
      US:   BRK.B    -> brk-b.us
      US:   AAPL     -> aapl.us
      DE:   SAP.DE   -> sap.de
      PA:   AIR.PA   -> air.pa
      HK:   0005.HK  -> 0005.hk
    """
    s = (yahoo_symbol or "").strip().upper()
    if not s:
        return ""

    # If there is an explicit exchange suffix like ".L", ".DE", ".PA", ".HK"
    m = re.match(r"^([A-Z0-9\-]+)\.([A-Z]{1,3})$", s)
    if m:
        base, suf = m.groups()
        stooq_suf = _STOOQ_SUFFIX_MAP.get(suf)
        if stooq_suf:
            return f"{base.lower()}.{stooq_suf}"

    # No recognized suffix -> assume US
    base = s.replace(".", "-")  # BRK.B -> BRK-B
    return f"{base.lower()}.{_STOOQ_SUFFIX_MAP['US']}"

def fetch_latest_price_stooq(symbol: str) -> Optional[Dict]:
    """Fetch last daily close from Stooq CSV."""
    sym = (symbol or "").strip().upper()
    if not sym:
        return None

    stq = _stooq_symbol(sym)
    url = f"https://stooq.com/q/d/l/?s={stq}&i=d"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code != 200 or not r.text.strip():
            return None

        reader = csv.DictReader(io.StringIO(r.text))
        rows = list(reader)
        if not rows:
            return None

        last = rows[-1]
        price = _float_or_none(last.get("Close"))
        if price is None:
            return None

        try:
            ts = datetime.fromisoformat(last["Date"]).replace(tzinfo=timezone.utc)
        except Exception:
            ts = _now_utc()

        return {"symbol": sym, "latest_price": price, "latest_price_at": ts}
    except Exception as e:
        logger.debug("[stooq] fetch failed for %s: %s", sym, e)
        return None

# ---------- Alpha Vantage (needs API key) ----------
def fetch_latest_price_alpha_vantage(symbol: str) -> Optional[Dict]:
    key = os.getenv("ALPHA_VANTAGE_KEY")
    if not key:
        return None

    sym = (symbol or "").strip().upper()
    if not sym:
        return None

    url = "https://www.alphavantage.co/query"
    params = {"function": "GLOBAL_QUOTE", "symbol": sym, "apikey": key}
    try:
        r = requests.get(url, params=params, timeout=12)
        if r.status_code != 200:
            return None
        data = r.json()
        q = data.get("Global Quote") or {}
        px = _float_or_none(q.get("05. price") or q.get("05.price"))
        if px is None:
            return None
        return {"symbol": sym, "latest_price": px, "latest_price_at": _now_utc()}
    except Exception as e:
        logger.debug("[alphavantage] fetch failed for %s: %s", sym, e)
        return None

# ---------- yfinance fallback ----------
def fetch_latest_price_yfinance(symbol: str) -> Optional[Dict]:
    if not USE_YFINANCE_FALLBACK:
        return None
    sym = (symbol or "").strip().upper()
    if not sym:
        return None
    try:
        yf = _yf()
        if yf is None:
            return None
        t = yf.Ticker(sym)
        hist = t.history(period="5d", interval="1d")
        if hist is None or hist.empty:
            return None
        last = hist.iloc[-1]
        price = float(last["Close"])
        idx = last.name
        if hasattr(idx, "to_pydatetime"):
            idx = idx.to_pydatetime()
        ts = idx if isinstance(idx, datetime) else _now_utc()
        if ts and not ts.tzinfo:
            ts = ts.replace(tzinfo=timezone.utc)
        return {"symbol": sym, "latest_price": price, "latest_price_at": ts}
    except Exception as e:
        logger.debug("[yfinance] fetch failed for %s: %s", sym, e)
        return None

# ---------- Unified selector ----------
def fetch_latest_price_by_provider(symbol: str, provider: str = "auto") -> Optional[Dict]:
    """
    provider ∈ {"auto", "alphavantage", "stooq"}.
    auto: AlphaVantage (if key) → Stooq → yfinance.
    """
    p = (provider or "auto").lower().strip()
    if p == "alphavantage":
        return fetch_latest_price_alpha_vantage(symbol)
    if p == "stooq":
        return fetch_latest_price_stooq(symbol)

    res = fetch_latest_price_alpha_vantage(symbol)
    if res:
        return res
    res = fetch_latest_price_stooq(symbol)
    if res:
        return res
    return fetch_latest_price_yfinance(symbol)

# ---------- Compatibility helper ----------
def fetch_latest_price(symbol: str) -> Optional[Dict]:
    """Generic latest price using provider='auto'."""
    return fetch_latest_price_by_provider(symbol, provider="auto")