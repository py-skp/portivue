from __future__ import annotations
from pydantic import BaseModel
from typing import Optional

class BrokerBase(BaseModel):
    name: str

class BrokerCreate(BrokerBase):
    pass

class BrokerUpdate(BaseModel):
    name: Optional[str] = None

class BrokerRead(BrokerBase):
    id: int