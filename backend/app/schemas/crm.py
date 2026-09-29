from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.crm import LeadStatus, CallDirection, CallStatus

class LeadBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_location: Optional[str] = None
    configuration: Optional[str] = None
    bedrooms: Optional[int] = None
    purpose: Optional[str] = None
    buying_timeline: Optional[str] = None
    financing_required: Optional[bool] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(LeadBase):
    lead_score: Optional[float] = None
    lead_status: Optional[LeadStatus] = None

class LeadResponse(LeadBase):
    id: UUID
    lead_score: Optional[float]
    lead_status: LeadStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CallResponse(BaseModel):
    id: UUID
    call_id: Optional[str] = None
    direction: Optional[CallDirection] = None
    status: Optional[CallStatus] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    lead_id: Optional[UUID] = None
    lead_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
