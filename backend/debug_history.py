from datetime import date, timedelta
from sqlmodel import Session, select
from app.core.db import engine
from app.models.user import User
from app.services.analytics import get_portfolio_history

def test_history():
    with Session(engine) as session:
        # Get first user
        user = session.exec(select(User)).first()
        if not user:
            print("No user found")
            return

        print(f"Testing for User: {user.email} (ID: {user.id})")
        
        end = date.today()
        start = end - timedelta(days=30)
        
        print(f"Range: {start} to {end}")
        
        history = get_portfolio_history(session, user, start, end, "GBP")
        
        print(f"Result count: {len(history)}")
        if not history:
            print("History is empty.")
        else:
            # Print first 3 and last 3
            for p in history[:3]:
                print(p)
            print("...")
            for p in history[-3:]:
                print(p)

if __name__ == "__main__":
    test_history()
