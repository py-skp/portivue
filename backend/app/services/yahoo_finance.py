# app/services/yahoo_finance.py
from __future__ import annotations
import sys
from datetime import date
from typing import Dict, List, Optional, Tuple

import requests

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
HDRS = {"User-Agent": UA, "Accept": "application/json"}

DEFAULT_CURRENCY = "USD"  # align with your app config if you expose this

def _log(*a): print("[YF]", *a, file=sys.stderr)

def _get(url: str, params: dict) -> Optional[dict]:
    try:
        r = requests.get(url, params=params, headers=HDRS, timeout=8, allow_redirects=True)
        _log("GET", r.url, r.status_code)
        if r.status_code != 200:
            if "query2" in url:
                alt = url.replace("query2", "query1")
                r = requests.get(alt, params=params, headers=HDRS, timeout=8, allow_redirects=True)
                _log("GET", r.url, r.status_code)
                if r.status_code != 200:
                    return None
            else:
                return None
        return r.json() or {}
    except Exception as e:
        _log("Exception", repr(e))
        return None

# ---------- symbol normalization (crypto) ----------
def convert_to_yahoo_symbol(symbol: str) -> str:
    """
    Ghostfolio appends base currency for crypto (e.g., BTC -> BTC-USD).
    Keep non-crypto symbols unchanged.
    """
    s = (symbol or "").upper().strip()
    if s and s.isalpha() and len(s) in (3, 4, 5):  # naive crypto heuristic, tweak as needed
        # You can plug a real crypto list here
        if s in {"BTC","ETH","SOL","DOGE","BNB","ADA","XRP"}:
            return f"{s}-{DEFAULT_CURRENCY}"
    return s

def convert_from_yahoo_symbol(symbol: str) -> str:
    s = (symbol or "").upper().strip()
    if s.endswith(f"-{DEFAULT_CURRENCY}"):
        return s[:-(len(DEFAULT_CURRENCY) + 1)]
    return s

# ---------- parsing helpers ----------
def parse_asset_class(quote_type: Optional[str], short_name: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    t = (quote_type or "").upper()
    # mirror Ghostfolio’s mapping
    if t in ("EQUITY", "COMMONSTOCK", "STOCK"):
        return "Equity", "Stock"
    if t in ("ETF", "EQUITYETF", "ETP"):
        return "Equity", "ETF"
    if t in ("MUTUALFUND", "FUND"):
        return "Equity", "Mutual Fund"
    if t in ("BOND",):
        return "Fixed Income", "Bond"
    if t in ("CRYPTOCURRENCY", "CRYPTO"):
        return "Alternative Investment", "Crypto"
    if t in ("INDEX",):
        return "Alternative Investment", "Index"
    if t in ("OPTION",):
        return "Alternative Investment", "Option"
    # weak heuristic for preferred, REIT, etc. via name (optional)
    if (short_name or "").upper().endswith(" REIT"):
        return "Real Estate", "REIT"
    return None, None

def format_name(long_name: Optional[str], short_name: Optional[str], quote_type: Optional[str], symbol: str) -> str:
    # Keep it simple; Ghostfolio adds quoteType decoration; we can just pick a nice one.
    return long_name or short_name or symbol

# ---------- endpoints used by Ghostfolio ----------
def search_symbols(query: str, include_indices: bool = False, limit: int = 10) -> List[Dict]:
    """
    Ghostfolio uses yahoo-finance2 search(). We replicate with `autoc` + (optional) v7.
    Return list of items: {symbol, name, currency, type, exchange, assetClass, assetSubClass}
    """
    items: List[Dict] = []

    # 1) autoc
    auto = _get("https://autoc.finance.yahoo.com/autoc", {"query": query, "region": 1, "lang": "en-US"}) or {}
    results = (auto.get("ResultSet") or {}).get("Result") or []
    for r in results[: limit * 3]:
        sym = r.get("symbol")
        if not sym:
            continue
        tdisp = r.get("typeDisp") or r.get("type")
        asset_class, asset_sub = parse_asset_class(tdisp, r.get("name"))
        items.append({
            "symbol": convert_from_yahoo_symbol(sym),
            "name": r.get("name") or sym,
            "currency": r.get("currency"),
            "type": tdisp,
            "exchange": r.get("exch"),
            "assetClass": asset_class,
            "assetSubClass": asset_sub,
        })

    # (Optionally call v7/quote to attach currencies more reliably; leave out if your region blocks it.)

    # De-dup and trim
    seen = set()
    unique = []
    for it in items:
        k = (it["symbol"], it.get("exchange") or "")
        if k in seen: continue
        seen.add(k); unique.append(it)
    return unique[:limit]

def get_quotes(symbols: List[str]) -> Dict[str, Dict]:
    """
    Latest price & currency. Ghostfolio tries quote() then falls back to quoteSummary().
    We’ll do the same: call v7 in chunks of 50; for failures, use quoteSummary price.
    Return {symbol: {marketPrice, currency, marketState}}
    """
    out: Dict[str, Dict] = {}
    if not symbols: return out

    # Convert for Yahoo
    ysyms = [convert_to_yahoo_symbol(s) for s in symbols]

    # chunk by 50
    def chunks(lst, n): 
        for i in range(0, len(lst), n): yield lst[i:i+n]

    failed: List[str] = []
    for chunk in chunks(ysyms, 50):
        data = _get("https://query2.finance.yahoo.com/v7/finance/quote", {"symbols": ",".join(chunk)})
        results = (data or {}).get("quoteResponse", {}).get("result") or []
        if not results:
            failed.extend(chunk)
            continue
        for r in results:
            sym_y = r.get("symbol")
            if not sym_y: continue
            sym_app = convert_from_yahoo_symbol(sym_y)
            out[sym_app] = {
                "currency": r.get("currency") or DEFAULT_CURRENCY,
                "marketPrice": r.get("regularMarketPrice") or 0.0,
                "marketState": "open" if (r.get("marketState") == "REGULAR" or sym_app.endswith(DEFAULT_CURRENCY)) else "closed",
            }

    # Fallback: quoteSummary for those that failed
    for ys in failed:
        qs = _get(f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ys}", {"modules": "price"})
        price = ((qs or {}).get("quoteSummary") or {}).get("result") or []
        if price:
            p = price[0].get("price") or {}
            sym_app = convert_from_yahoo_symbol(p.get("symbol") or ys)
            out[sym_app] = {
                "currency": p.get("currency") or DEFAULT_CURRENCY,
                "marketPrice": (p.get("regularMarketPrice") or {}).get("raw") or 0.0,
                "marketState": "open",  # best-effort
            }
    return out

def get_historical(symbol: str, start: date, end: date) -> Dict[str, Dict]:
    """
    Ghostfolio uses chart(interval=1d, period1/2). Return {YYYY-MM-DD: {marketPrice}}.
    """
    ys = convert_to_yahoo_symbol(symbol)
    data = _get(f"https://query2.finance.yahoo.com/v8/finance/chart/{ys}", {
        "interval": "1d",
        "period1": start.strftime("%Y-%m-%d"),
        "period2": end.strftime("%Y-%m-%d"),
    }) or {}
    res = (data.get("chart") or {}).get("result") or []
    out: Dict[str, Dict] = {}
    if not res: return out
    q = res[0].get("indicators", {}).get("quote", [])
    ts = res[0].get("timestamp", [])
    if not q or not ts: return out
    closes = q[0].get("close", [])
    for t, c in zip(ts, closes):
        if c is None: continue
        from datetime import datetime, timezone
        d = datetime.fromtimestamp(int(t), tz=timezone.utc).date().isoformat()
        out[d] = {"marketPrice": float(c)}
    return out

def get_dividends(symbol: str, start: date, end: date) -> Dict[str, Dict]:
    """
    chart events=dividends. Return {YYYY-MM-DD: {marketPrice: dividend}}
    """
    ys = convert_to_yahoo_symbol(symbol)
    data = _get(f"https://query2.finance.yahoo.com/v8/finance/chart/{ys}", {
        "events": "dividends",
        "interval": "1d",
        "period1": start.strftime("%Y-%m-%d"),
        "period2": end.strftime("%Y-%m-%d"),
    }) or {}
    res = (data.get("chart") or {}).get("result") or []
    out: Dict[str, Dict] = {}
    if not res: return out
    events = (res[0].get("events") or {}).get("dividends") or {}
    from datetime import datetime, timezone
    for _, ev in events.items():
        t = ev.get("date"); amt = ev.get("amount")
        if t is None or amt is None: continue
        d = datetime.fromtimestamp(int(t), tz=timezone.utc).date().isoformat()
        out[d] = {"marketPrice": float(amt)}
    return out

def get_asset_profile(symbol: str) -> Dict:
    """
    Ghostfolio’s getAssetProfile → quoteSummary modules.
    """
    ys = convert_to_yahoo_symbol(symbol)
    data = _get(f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ys}",
                {"modules": "assetProfile,summaryProfile,price,quoteType"}) or {}
    results = (data.get("quoteSummary") or {}).get("result") or []
    if not results: return {}
    r = results[0]
    ap = r.get("assetProfile") or {}
    sp = r.get("summaryProfile") or {}
    price = r.get("price") or {}
    qt = r.get("quoteType") or {}

    long_name = price.get("longName")
    short_name = price.get("shortName")
    quote_type = qt.get("quoteType")
    asset_class, asset_sub = parse_asset_class(quote_type, short_name)
    name = format_name(long_name, short_name, quote_type, symbol)

    return {
        "name": name,
        "sector": ap.get("sector") or sp.get("sector"),
        "country": ap.get("country") or sp.get("country"),
        "currency": price.get("currency") or DEFAULT_CURRENCY,
        "quoteType": quote_type,
        "assetClass": asset_class,
        "assetSubClass": asset_sub,
    }