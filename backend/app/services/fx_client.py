import httpx
from typing import Dict

FRANK = "https://api.frankfurter.app"

def fetch_frank_latest() -> dict:
    r = httpx.get(f"{FRANK}/latest", timeout=10)
    r.raise_for_status()
    return r.json()  # {base:'EUR', date:'YYYY-MM-DD', rates:{'USD':..., ...}}

def cross_to_base(base: str, eur_rates: Dict[str, float]) -> Dict[str, float]:
    base = base.upper()
    if base == "EUR":
        return eur_rates
    b = eur_rates.get(base)
    if not b:
        raise ValueError(f"EUR->{base} not provided by Frankfurter")
    out = {k: v / b for k, v in eur_rates.items() if k != base}
    out["EUR"] = 1.0 / b
    return out