from __future__ import annotations
from pydantic import BaseModel
from typing import Optional

class AssetClassBase(BaseModel):
    name: str

class AssetClassCreate(AssetClassBase):
    pass

class AssetClassUpdate(BaseModel):
    name: Optional[str] = None

class AssetClassRead(AssetClassBase):
    id: int