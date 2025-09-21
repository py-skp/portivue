import requests
from datetime import date, timedelta

BASE_URL = "https://api.frankfurter.app"

def fetch_rates(base: str, symbols: list[str]) -> tuple[date, dict[str, float]]:
    """
    Returns (as_of_date, {quote: rate}) for base->quote.
    Frankfurter skips weekends; we request today, and if missing,
    the API automatically returns the most recent business day.
    """
    if not symbols:
        return date.today(), {}

    params = {
        "from": base.upper(),
        "to": ",".join(s.upper() for s in symbols if s.upper() != base.upper()),
    }
    r = requests.get(f"{BASE_URL}/latest", params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    # data example: {"amount":1.0,"base":"USD","date":"2025-08-15","rates":{"EUR":0.91,"GBP":0.78}}
    as_of = date.fromisoformat(data["date"])
    return as_of, {k.upper(): float(v) for k, v in data.get("rates", {}).items()}