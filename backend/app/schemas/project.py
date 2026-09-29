from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from app.models.project import ProjectStatus

class ProjectBase(BaseModel):
    name: str
    builder: str
    description: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    status: Optional[ProjectStatus] = ProjectStatus.UNDER_CONSTRUCTION

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    builder: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    status: Optional[ProjectStatus] = None

class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
