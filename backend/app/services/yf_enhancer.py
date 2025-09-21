# app/services/yf_enhancer.py
from __future__ import annotations
from typing import Optional, Tuple

DEFAULT_CURRENCY = "USD"  # align with your app config

# --- Convert FROM Yahoo symbol to app symbol (Ghostfolio convertFromYahooFinanceSymbol) ---
def convert_from_yahoo_symbol(yahoo_symbol: str) -> str:
    """
    - BTC-USD -> BTCUSD
    - EURUSD=X -> EURUSD
    - USDCHF=X -> USDCHF
    - BRK-B -> BRK-B (unchanged)
    - USD.AX -> USD.AX (unchanged)
    """
    s = (yahoo_symbol or "").strip()
    if not s:
        return s

    # "-USD" -> "USD"
    if s.endswith(f"-{DEFAULT_CURRENCY}"):
        s = s[: - (len(DEFAULT_CURRENCY) + 1)] + DEFAULT_CURRENCY

    # FX "=X" symbols
    if s.endswith("=X") and DEFAULT_CURRENCY not in s:
        # e.g. EURUSD=X -> ensure it stays EURUSD (already is)
        pass

    # Special case in Ghostfolio: "USDZAC" -> "USDZAc"
    if s.endswith(f"{DEFAULT_CURRENCY}ZAC"):
        s = f"{DEFAULT_CURRENCY}ZAc"

    return s.replace("=X", "")

# --- Convert TO Yahoo symbol from app symbol (Ghostfolio convertToYahooFinanceSymbol) ---
def convert_to_yahoo_symbol(symbol: str, is_crypto: bool = False) -> str:
    """
    Currencies:     USDCHF  -> USDCHF=X  (both legs are ISO currencies)
    Cryptocurrency: BTCUSD  -> BTC-USD   (and DOGEUSD -> DOGE-USD)
    Else:           leave unchanged
    """
    s = (symbol or "").strip().upper()
    if not s or len(s) <= len(DEFAULT_CURRENCY):
        return s

    # If looks like FX pair of two ISO-3 currencies, map to =X
    if len(s) >= 6 and s.endswith(DEFAULT_CURRENCY):
        base = s[:-len(DEFAULT_CURRENCY)]
        quote = s[-len(DEFAULT_CURRENCY):]
        if base.isalpha() and quote.isalpha() and len(base) in (3, 4, 5):
            if not is_crypto:
                return f"{s}=X"
            # crypto in base currency -> BTCUSD -> BTC-USD
            return s[:-len(DEFAULT_CURRENCY)] + f"-{DEFAULT_CURRENCY}"

    # If user already provided BTC-USD style, keep it
    return s

# --- Parse asset class/subclass from Yahoo quoteType & shortName (Ghostfolio parseAssetClass) ---
def parse_asset_class(quote_type: Optional[str], short_name: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    qt = (quote_type or "").lower()
    if qt == "cryptocurrency":
        return ("LIQUIDITY", "CRYPTOCURRENCY")   # Ghostfolio enums; map to your strings if preferred
    if qt == "equity":
        return ("EQUITY", "STOCK")
    if qt == "etf":
        return ("EQUITY", "ETF")
    if qt == "future":
        # Commodity vs Precious Metal heuristic
        sn = (short_name or "").lower()
        if sn.startswith(("gold", "silver", "platinum", "palladium")):
            return ("COMMODITY", "PRECIOUS_METAL")
        return ("COMMODITY", "COMMODITY")
    if qt == "mutualfund":
        return ("EQUITY", "MUTUALFUND")
    # Optional extra mappings you had earlier (bond/index/option) if you want:
    if qt == "bond":
        return ("FIXED INCOME", "BOND")
    if qt == "index":
        return ("ALTERNATIVE INVESTMENT", "INDEX")
    if qt == "option":
        return ("ALTERNATIVE INVESTMENT", "OPTION")
    return (None, None)

def format_name(long_name: Optional[str], short_name: Optional[str], quote_type: Optional[str], symbol: str) -> str:
    """
    Minimal Ghostfolio-like name formatting.
    """
    name = long_name or short_name or symbol
    if quote_type and quote_type.upper() == "FUTURE" and short_name and len(short_name) > 7:
        # "Gold Jun 22" -> "Gold"
        name = short_name[:-7]
    # Replace &amp; etc. if you like; keeping it simple:
    return (name or symbol).replace("&amp;", "&").strip()