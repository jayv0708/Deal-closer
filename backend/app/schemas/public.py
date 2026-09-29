from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class SiteStats(BaseModel):
    total_properties: int
    total_projects: int
    total_locations: int
    happy_customers: int
    agents_count: int


class LocationStat(BaseModel):
    name: str
    city: str
    property_count: int


class PublicProject(BaseModel):
    id: UUID
    name: str
    builder: str
    description: Optional[str] = None
    city: str
    location: str
    status: str
    unit_count: int = 0
    min_price: Optional[float] = None
    max_price: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class PublicProperty(BaseModel):
    id: UUID
    unit_number: Optional[str] = None
    configuration: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    carpet_area: Optional[float] = None
    built_up_area: Optional[float] = None
    floor: Optional[int] = None
    facing: Optional[str] = None
    price: Optional[float] = None
    availability: Optional[bool] = None
    amenities: Optional[list] = None
    project: PublicProject

    model_config = ConfigDict(from_attributes=True)


class TestimonialOut(BaseModel):
    id: int
    name: str
    role: str
    quote: str
    rating: int


class AgentOut(BaseModel):
    id: str
    name: str
    role: str
    email: str
    phone: Optional[str] = None


class NewsOut(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    excerpt: str
    body: str
    published_at: datetime


class PublicLeadCreate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    preferred_location: Optional[str] = None
    configuration: Optional[str] = None
    bedrooms: Optional[int] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    purpose: Optional[str] = None
