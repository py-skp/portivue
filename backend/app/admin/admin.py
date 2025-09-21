# app/admin/admin.py
import os
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.middleware.sessions import SessionMiddleware
from wtforms.fields import SelectField, FloatField
from starlette.requests import Request
from wtforms.fields import SelectField

from sqlmodel import Session, select
from app.core.db import engine

from app.models.currency import Currency
from app.models.broker import Broker
from app.models.asset_class import AssetClass
from app.models.asset_subclass import AssetSubclass
from app.models.sector import Sector
from app.models.account import Account
from app.models.settings import AppSetting


# --- Auth (same as before) ----------------------------------------------------
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "dev-secret")

class BasicAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        if form.get("username") == ADMIN_USER and form.get("password") == ADMIN_PASS:
            request.session.update({"user": ADMIN_USER})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request):
        return request.session.get("user")


# --- Helper: fetch list of currency codes safely ------------------------------
def get_currency_codes() -> list[str]:
    with Session(engine) as s:
        res = s.exec(select(Currency.code))
        # In some envs res is Result (needs scalars()), in others ScalarResult
        try:
            return res.scalars().all()
        except AttributeError:
            return res.all()


# --- Mount Admin --------------------------------------------------------------
def mount_admin(app):
    # sessions for SQLAdmin
    app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

    admin = Admin(app, engine, authentication_backend=BasicAuth(secret_key=SESSION_SECRET))

    # 1) Currency admin (unchanged)
    class CurrencyAdmin(ModelView, model=Currency):
        column_list   = [Currency.code, Currency.name]
        form_include_pk = True
        form_columns  = [Currency.code, Currency.name]

    # 2) Asset Class admin (unchanged)
    class AssetClassAdmin(ModelView, model=AssetClass):
        column_list  = [AssetClass.id, AssetClass.name]
        form_columns = [AssetClass.name]

    class AssetSubclassAdmin(ModelView, model=AssetSubclass):
        column_list  = [AssetSubclass.id, AssetSubclass.name]
        form_columns = [AssetSubclass.name]

    class SectorAdmin(ModelView, model=Sector):
        column_list  = [Sector.id, Sector.name]
        form_columns = [Sector.name]

    # 3) Account admin (dropdown with existing currencies)
    class AccountAdmin(ModelView, model=Account):
        column_list  = [Account.id, Account.name, Account.currency_code, Account.type, Account.balance]
        form_columns = [Account.name, Account.currency_code, Account.type, Account.balance]

        async def scaffold_form(self, rules=None):
            BaseForm = await super().scaffold_form(rules)
            codes = get_currency_codes()

            class AccountForm(BaseForm):
                pass

            # currency dropdown (existing)
            setattr(
                AccountForm,
                "currency_code",
                SelectField("Currency", choices=[(c, c) for c in codes])
            )

            # NEW: account type dropdown
            setattr(
                AccountForm,
                "type",
                SelectField(
                    "Type",
                    choices=[
                        ("current", "current"),
                        ("savings", "savings"),
                        ("fixed deposit", "fixed deposit"),
                        ("investment", "investment"),
                        ("broker", "broker"),
                        ("other", "other"),
                    ],
                    default="other",
                ),
            )

            # NEW: balance numeric (optional)
            setattr(AccountForm, "balance", FloatField("Balance"))

            return AccountForm

    # 4) Settings admin (dropdown with existing currencies + USD default)
    class AppSettingAdmin(ModelView, model=AppSetting):
        name = "Settings"
        name_plural = "Settings"
        icon = "fa fa-gear"

        column_list  = [AppSetting.base_currency_code]
        form_columns = [AppSetting.base_currency_code]

        async def scaffold_form(self, rules=None):
            BaseForm = await super().scaffold_form(rules)
            codes = get_currency_codes()
            default_code = "USD" if "USD" in codes else (codes[0] if codes else None)

            class SettingForm(BaseForm):
                pass

            setattr(
                SettingForm,
                "base_currency_code",
                SelectField(
                    "Base Currency",
                    choices=[(c, c) for c in codes],
                    default=default_code
                )
            )
            return SettingForm
        
    # 4) Broker admin (unchanged)
    class BrokerAdmin(ModelView, model=Broker):
        column_list  = [Broker.id, Broker.name]
        form_columns = [Broker.name]

    # Register views in sidebar
    admin.add_view(BrokerAdmin)
    admin.add_view(CurrencyAdmin)
    admin.add_view(AssetClassAdmin)
    admin.add_view(AssetSubclassAdmin)
    admin.add_view(SectorAdmin)
    admin.add_view(AccountAdmin)
    admin.add_view(AppSettingAdmin)