import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Numeric, Integer, Boolean, ForeignKey, Enum, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from .base import Base

class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    SITE_VISIT = "SITE_VISIT"
    NEGOTIATING = "NEGOTIATING"
    WON = "WON"
    LOST = "LOST"

class CallDirection(str, enum.Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"

class CallStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    FAILED = "FAILED"
    IN_PROGRESS = "IN_PROGRESS"

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255))
    phone = Column(String(50), index=True)
    email = Column(String(255))
    
    # Requirements
    budget_min = Column(Numeric(14, 2))
    budget_max = Column(Numeric(14, 2))
    preferred_location = Column(String(255))
    configuration = Column(String(100))
    bedrooms = Column(Integer)
    purpose = Column(String(100))
    buying_timeline = Column(String(100))
    financing_required = Column(Boolean)
    
    # Status and Scoring
    lead_score = Column(Float)
    lead_status = Column(Enum(LeadStatus), default=LeadStatus.NEW)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    calls = relationship("Call", back_populates="lead")
    appointments = relationship("Appointment", back_populates="lead")
    followups = relationship("Followup", back_populates="lead")

class Call(Base):
    __tablename__ = "calls"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    
    call_id = Column(String(255), unique=True) # external reference ID (e.g., from telephony provider)
    direction = Column(Enum(CallDirection), default=CallDirection.INBOUND)
    
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    duration = Column(Integer) # in seconds
    status = Column(Enum(CallStatus), default=CallStatus.IN_PROGRESS)
    
    recording_url = Column(String(1024))
    transcript = Column(Text)
    summary = Column(Text)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead", back_populates="calls")
    project = relationship("Project", foreign_keys=[project_id])
    events = relationship("CallEvent", back_populates="call")

class CallEvent(Base):
    __tablename__ = "call_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    
    event_type = Column(String(100), nullable=False) # e.g., 'user_speech', 'agent_speech', 'tool_call', 'handoff'
    event_data = Column(JSONB)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    call = relationship("Call", back_populates="events")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    salesperson_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    date = Column(DateTime(timezone=True), nullable=False)
    time = Column(String(50))
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead", back_populates="appointments")
    project = relationship("Project", foreign_keys=[project_id])
    salesperson = relationship("User", foreign_keys=[salesperson_id])

class Followup(Base):
    __tablename__ = "followups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    reason = Column(String(255))
    status = Column(String(50), default="PENDING")
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead", back_populates="followups")
