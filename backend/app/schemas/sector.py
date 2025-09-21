from __future__ import annotations
from pydantic import BaseModel
from typing import Optional

class SectorBase(BaseModel):
    name: str

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    name: Optional[str] = None

class SectorRead(SectorBase):
    id: int