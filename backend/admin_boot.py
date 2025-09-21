# # backend/admin_boot.py
# import os
# from fastapi import FastAPI
# from starlette.middleware.sessions import SessionMiddleware
# from sqladmin import Admin, ModelView
# from sqladmin.authentication import AuthenticationBackend
# from starlette.requests import Request
# from sqlmodel import SQLModel, create_engine

# # Import your models
# from models import Currency, AssetClass, Account, MarketInstrument

# DATABASE_URL = "sqlite:///./portfolio.db"
# engine = create_engine(DATABASE_URL, echo=False)

# # Create tables if they don't exist
# SQLModel.metadata.create_all(engine)

# app = FastAPI(title="Finlytics Admin")

# # --- simple auth for admin ---
# ADMIN_USER = os.getenv("ADMIN_USER", "admin")
# ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")
# SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "dev-secret")
# app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# class BasicAuth(AuthenticationBackend):
#     async def login(self, request: Request) -> bool:
#         form = await request.form()
#         u, p = form.get("username"), form.get("password")
#         if u == ADMIN_USER and p == ADMIN_PASS:
#             request.session.update({"user": u})
#             return True
#         return False

#     async def logout(self, request: Request) -> bool:
#         request.session.clear()
#         return True

#     async def authenticate(self, request: Request):
#         return request.session.get("user")

# auth_backend = BasicAuth(secret_key=SESSION_SECRET)

# # --- SQLAdmin setup ---
# admin = Admin(app, engine, authentication_backend=auth_backend)

# class CurrencyAdmin(ModelView, model=Currency):
#     name_plural = "Currencies"
#     column_list = [Currency.code, Currency.name]
#     form_include_pk = True

# class AssetClassAdmin(ModelView, model=AssetClass):
#     name_plural = "Asset Classes"
#     column_list = [AssetClass.id, AssetClass.name]

# class AccountAdmin(ModelView, model=Account):
#     name_plural = "Accounts"
#     column_list = [Account.id, Account.name, Account.currency_code]

# # class MarketInstrumentAdmin(ModelView, model=MarketInstrument):
# #     name_plural = "Market Instruments"
# #     column_list = [
# #         MarketInstrument.id, MarketInstrument.name, MarketInstrument.symbol,
# #         MarketInstrument.isin, MarketInstrument.exchange, MarketInstrument.currency_code
# #     ]

# admin.add_view(CurrencyAdmin)
# admin.add_view(AssetClassAdmin)
# admin.add_view(AccountAdmin)
# # admin.add_view(MarketInstrumentAdmin)