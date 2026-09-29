from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from decimal import Decimal

class PropertyBase(BaseModel):
    unit_number: Optional[str] = None
    configuration: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    carpet_area: Optional[Decimal] = None
    built_up_area: Optional[Decimal] = None
    floor: Optional[int] = None
    facing: Optional[str] = None
    price: Optional[Decimal] = None
    availability: Optional[bool] = True
    amenities: Optional[Any] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(PropertyBase):
    pass

class PropertyResponse(PropertyBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
