import requests
from typing import Optional, Dict

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0.0.0 Safari/537.36")
HDRS = {"User-Agent": UA, "Accept": "application/json"}

def _map_classes(qt: Optional[str]) -> Dict[str, Optional[str]]:
    t = (qt or "").upper()
    if t in ("EQUITY", "COMMONSTOCK"):      return {"asset_class": "Equity", "asset_subclass": "Stock"}
    if t in ("ETF", "EQUITYETF", "ETP"):    return {"asset_class": "Equity", "asset_subclass": "ETF"}
    if t in ("MUTUALFUND", "FUND"):         return {"asset_class": "Equity", "asset_subclass": "Mutual Fund"}
    if t in ("BOND",):                      return {"asset_class": "Fixed Income", "asset_subclass": "Bond"}
    if t in ("CRYPTO", "CRYPTOCURRENCY"):   return {"asset_class": "Alternative Investment", "asset_subclass": "Crypto"}
    if t in ("OPTION",):                    return {"asset_class": "Alternative Investment", "asset_subclass": "Option"}
    if t in ("INDEX",):                     return {"asset_class": "Alternative Investment", "asset_subclass": "Index"}
    return {"asset_class": None, "asset_subclass": None}

def _get_json(url: str, params: dict) -> Optional[dict]:
    try:
        r = requests.get(url, params=params, headers=HDRS, timeout=8)
        if r.status_code != 200:
            # fallback to query1 if query2
            if "query2" in url:
                alt = url.replace("query2", "query1")
                r = requests.get(alt, params=params, headers=HDRS, timeout=8)
                if r.status_code != 200:
                    return None
            else:
                return None
        return r.json() or {}
    except requests.RequestException:
        return None

def fetch_from_yahoo(symbol: str) -> Optional[Dict]:
    """
    Robust fetch:
      1) v7 quote for core fields (name, currency, price, quoteType)
      2) v10 quoteSummary for profile (sector, country) as best-effort
    """
    sym = (symbol or "").strip().upper()
    if not sym:
        return None

    # 1) v7 quote
    q7 = _get_json("https://query2.finance.yahoo.com/v7/finance/quote", {"symbols": sym})
    try:
        res = (q7.get("quoteResponse", {}).get("result") or [])[0]
    except Exception:
        res = None
    if not res:
        return None

    name = res.get("longName") or res.get("shortName") or sym
    currency = res.get("currency") or res.get("fromCurrency") or "USD"
    quote_type = res.get("quoteType")
    last = res.get("regularMarketPrice")
    last_ts = res.get("regularMarketTime")

    sector = None
    country = None

    # 2) best-effort profile (optional; don’t fail if blocked)
    prof = _get_json(
        f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{sym}",
        {"modules": "assetProfile,summaryProfile"}
    )
    if prof:
        results = (prof.get("quoteSummary") or {}).get("result") or []
        if results:
            ap = results[0].get("assetProfile") or {}
            sp = results[0].get("summaryProfile") or {}
            sector = ap.get("sector") or sp.get("sector") or sector
            country = ap.get("country") or sp.get("country") or country

    mapped = _map_classes(quote_type)
    return {
        "symbol": sym,
        "name": name,
        "sector": sector,
        "currency_code": currency,
        "country": country,
        "asset_class": mapped["asset_class"],
        "asset_subclass": mapped["asset_subclass"],
        "latest_price": float(last) if last is not None else None,
        "latest_price_ts": int(last_ts) if last_ts else None,
    }