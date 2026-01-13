import sys
from sqlmodel import Session, select
from app.core.db import engine
from app.models.instrument import Instrument

def fix_currencies():
    # Symbols to fix: force them to GBP
    target_map = {
        "VUSA.L": "GBP",
        "VUKG.L": "GBP"
    }
    
    with Session(engine) as session:
        # Find the instruments
        statement = select(Instrument).where(Instrument.symbol.in_(target_map.keys()))
        results = session.exec(statement).all()
        
        if not results:
            print("No matching instruments found to fix.")
            return

        updated_count = 0
        for inst in results:
            target_ccy = target_map.get(inst.symbol)
            if inst.currency_code != target_ccy:
                print(f"Updating {inst.symbol}: {inst.currency_code} -> {target_ccy}")
                inst.currency_code = target_ccy
                session.add(inst)
                updated_count += 1
            else:
                print(f"Skipping {inst.symbol}: already {inst.currency_code}")

        if updated_count > 0:
            session.commit()
            print(f"Successfully updated {updated_count} instruments.")
        else:
            print("No changes needed.")

if __name__ == "__main__":
    print("Starting currency fix...")
    try:
        fix_currencies()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
