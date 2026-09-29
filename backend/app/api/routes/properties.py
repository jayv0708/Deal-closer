from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.project import Property, Project
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from app.api.dependencies.auth import get_current_active_user

router = APIRouter()

@router.get("/projects/{project_id}/properties", response_model=List[PropertyResponse])
async def list_properties_in_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve properties in a specific project.
    """
    result = await db.execute(select(Property).where(Property.project_id == project_id).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/projects/{project_id}/properties", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    property_in: PropertyCreate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Create a new property in a project.
    """
    # Verify project exists
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_property = Property(**property_in.model_dump(), project_id=project_id)
    db.add(new_property)
    await db.commit()
    await db.refresh(new_property)
    return new_property

@router.get("/properties/{id}", response_model=PropertyResponse)
async def get_property(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get property by ID.
    """
    result = await db.execute(select(Property).where(Property.id == id))
    property_obj = result.scalars().first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_obj

@router.put("/properties/{id}", response_model=PropertyResponse)
async def update_property(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    property_in: PropertyUpdate,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update a property.
    """
    result = await db.execute(select(Property).where(Property.id == id))
    property_obj = result.scalars().first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = property_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property_obj, field, value)
        
    db.add(property_obj)
    await db.commit()
    await db.refresh(property_obj)
    return property_obj

@router.delete("/properties/{id}")
async def delete_property(
    *,
    db: AsyncSession = Depends(get_db),
    id: UUID,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a property.
    """
    result = await db.execute(select(Property).where(Property.id == id))
    property_obj = result.scalars().first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
        
    await db.delete(property_obj)
    await db.commit()
    return {"detail": "Property deleted successfully"}
