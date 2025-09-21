# # backend/admin.py
# import asyncio
# from fastapi import FastAPI
# from fastapi_admin.app import app as admin_app
# from fastapi_admin.providers.login import UsernamePasswordProvider
# from fastapi_admin.resources import Field, Model
# from fastapi_admin.file_upload import FileUpload
# from fastapi_admin.template import templates
# from fastapi_admin.models import AbstractAdmin

# from sqlmodel import SQLModel, create_engine
# from models import Currency, AssetClass, Account, MarketInstrument  # your models

# DATABASE_URL = "sqlite+aiosqlite:///./portfolio.db"
# engine = create_engine("sqlite:///./portfolio.db", echo=True)

# # Admin user model (simplest possible)
# class Admin(AbstractAdmin, table=True):
#     pass

# async def create_app():
#     app = FastAPI()

#     # Init fastapi-admin
#     await admin_app.configure(
#         logo_url="https://fastapi-admin-docs.netlify.app/logo.png",
#         template_folders=[templates],
#         favicon_url="https://fastapi-admin-docs.netlify.app/logo.png",
#         title="Portfolio Admin",
#         admin_model=Admin,
#         redis="redis://localhost:6379",  # adjust if remote Redis
#         providers=[
#             UsernamePasswordProvider(
#                 login_logo_url="https://fastapi-admin-docs.netlify.app/logo.png",
#                 admin_model=Admin,
#             )
#         ],
#     )

#     # Register resources
#     admin_app.register_resources(
#         [
#             Model(Currency, icon="fa fa-money", fields=[Field("code"), Field("name")]),
#             Model(AssetClass, icon="fa fa-tags", fields=[Field("name")]),
#             Model(Account, icon="fa fa-bank", fields=[Field("name"), Field("currency_code")]),
#             Model(MarketInstrument, icon="fa fa-line-chart", fields=[
#                 Field("name"), Field("symbol"), Field("isin"), Field("exchange"), Field("currency_code")
#             ]),
#         ]
#     )

#     app.mount("/admin", admin_app)
#     return app