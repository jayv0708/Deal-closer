from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.project import DocumentType, DocumentStatus

class DocumentBase(BaseModel):
    filename: str
    document_type: DocumentType

class DocumentCreate(DocumentBase):
    project_id: UUID
    storage_path: str

class DocumentResponse(DocumentBase):
    id: UUID
    project_id: UUID
    storage_path: str
    processing_status: DocumentStatus
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
