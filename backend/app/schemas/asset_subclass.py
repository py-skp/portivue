from __future__ import annotations
from pydantic import BaseModel
from typing import Optional

class AssetSubclassBase(BaseModel):
    name: str

class AssetSubclassCreate(AssetSubclassBase):
    pass

class AssetSubclassUpdate(BaseModel):
    name: Optional[str] = None

class AssetSubclassRead(AssetSubclassBase):
    id: int