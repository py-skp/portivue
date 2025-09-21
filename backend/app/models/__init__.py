# app/models/__init__.py

# Core user/org/auth models
from .user import User
from .oauth_account import OAuthAccount
from .org import Organization, OrganizationMember
from .recovery_code import RecoveryCode

# Domain models
from .instrument import Instrument
from .price_history import PriceHistory
from .account import Account
from .activities import Activity            # <- filename typically "activity.py"
from .broker import Broker
from .currency import Currency
from .fx import FxRate
from .asset_class import AssetClass
from .asset_subclass import AssetSubclass
from .sector import Sector
from .settings import AppSetting

# Mixins / helpers (don’t register tables)
from .tenant_mixin import TenantFields

# Optional models (uncomment if you actually have these files/classes)
# from .account_movement import AccountMovement

__all__ = [
    # user/org/auth
    "User", "OAuthAccount", "Organization", "OrganizationMember", "RecoveryCode",
    # domain
    "Instrument", "PriceHistory", "Account", "Activity", "Broker",
    "Currency", "FXRate", "AssetClass", "AssetSubclass", "Sector", "AppSetting",
    # mixins
    "TenantFields",
    # "AccountMovement",
]