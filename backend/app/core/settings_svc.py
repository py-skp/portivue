# app/core/settings_svc.py
from typing import Optional
from sqlmodel import Session, select
from app.models.settings import AppSetting
from app.models.user import User


def get_or_create_settings(session: Session, *, user: Optional[User] = None) -> AppSetting:
    """
    Returns a settings row.
    - If `user` is provided → fetch/create a row for that user (scoped by owner_user_id).
    - If no `user` is provided → fetch/create the global row (owner_user_id = NULL).
    """
    if user is not None:
        row = session.exec(
            select(AppSetting).where(AppSetting.owner_user_id == user.id)
        ).first()
        if row:
            return row

        # create new settings row for this user
        row = AppSetting(
            owner_user_id=user.id,
            base_currency_code="USD",  # default, adjust if needed
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return row

    # --- global (fallback) ---
    row = session.exec(
        select(AppSetting).where(AppSetting.owner_user_id.is_(None))
    ).first()
    if row:
        return row

    row = AppSetting(
        owner_user_id=None,
        base_currency_code="USD",
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row