import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .base import Base

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB) # using metadata_ to avoid conflict with Base.metadata
    
    # 1536 is standard for OpenAI text-embedding-3-small/ada-002. Adjust as needed for specific LLM.
    embedding = Column(Vector(1536))
    
    page_number = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", foreign_keys=[project_id])
    document = relationship("Document", foreign_keys=[document_id])
