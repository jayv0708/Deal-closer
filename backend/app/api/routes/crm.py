from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.crm import Lead, Call
from app.models.user import User
from app.schemas.crm import LeadCreate, LeadUpdate, LeadResponse, CallResponse
from app.api.dependencies.auth import get_current_active_user

router = APIRouter()

@router.get("/leads", response_model=List[LeadResponse])
async def list_leads(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    result = await db.execute(select(Lead).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/leads", response_model=LeadResponse)
async def create_lead(
    lead_in: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    lead = Lead(**lead_in.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead

@router.get("/leads/{id}", response_model=LeadResponse)
async def get_lead(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    result = await db.execute(select(Lead).where(Lead.id == id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.get("/calls", response_model=List[CallResponse])
async def list_calls(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Call history joined with lead names for the admin Call History page."""
    result = await db.execute(
        select(Call, Lead.name)
        .outerjoin(Lead, Call.lead_id == Lead.id)
        .order_by(Call.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    calls: List[CallResponse] = []
    for call, lead_name in result.all():
        item = CallResponse.model_validate(call)
        item.lead_name = lead_name
        calls.append(item)
    return calls


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    result = await db.execute(
        select(Call, Lead.name)
        .outerjoin(Lead, Call.lead_id == Lead.id)
        .where(Call.id == call_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Call not found")
    call, lead_name = row
    item = CallResponse.model_validate(call)
    item.lead_name = lead_name
    return item


@router.put("/leads/{id}", response_model=LeadResponse)
async def update_lead(
    id: UUID,
    lead_in: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    result = await db.execute(select(Lead).where(Lead.id == id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    update_data = lead_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
        
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead
