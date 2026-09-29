import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Numeric, Integer, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from .base import Base

class ProjectStatus(str, enum.Enum):
    PRE_LAUNCH = "PRE_LAUNCH"
    UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION"
    READY_TO_MOVE = "READY_TO_MOVE"
    SOLD_OUT = "SOLD_OUT"

class DocumentType(str, enum.Enum):
    BROCHURE = "BROCHURE"
    PRICE_LIST = "PRICE_LIST"
    FLOOR_PLAN = "FLOOR_PLAN"
    PAYMENT_PLAN = "PAYMENT_PLAN"
    FAQ = "FAQ"
    OTHER = "OTHER"

class DocumentStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    builder = Column(String(255), nullable=False)
    description = Column(Text)
    city = Column(String(100))
    location = Column(String(255))
    status = Column(Enum(ProjectStatus), default=ProjectStatus.UNDER_CONSTRUCTION)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    properties = relationship("Property", back_populates="project")
    documents = relationship("Document", back_populates="project")

class Property(Base):
    __tablename__ = "properties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    unit_number = Column(String(50))
    configuration = Column(String(50)) # e.g., "3 BHK"
    bedrooms = Column(Integer)
    bathrooms = Column(Integer)
    carpet_area = Column(Numeric(10, 2))
    built_up_area = Column(Numeric(10, 2))
    floor = Column(Integer)
    facing = Column(String(50))
    price = Column(Numeric(14, 2))
    availability = Column(Boolean, default=True)
    amenities = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="properties")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    storage_path = Column(String(512), nullable=False)
    processing_status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    project = relationship("Project", back_populates="documents")
