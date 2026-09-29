from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, or_
from livekit.agents import llm
from backend.app.models.project import Property

class PropertyTools:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    @llm.function_tool(description="Search properties based on criteria such as budget_max, location, configuration (e.g. '2 BHK'), bedrooms, minimum_area, and maximum_area.")
    async def search_properties(
        self,
        project_id: str,
        budget_max: Optional[float] = None,
        location: Optional[str] = None,
        configuration: Optional[str] = None,
        bedrooms: Optional[int] = None,
        minimum_area: Optional[float] = None,
        maximum_area: Optional[float] = None
    ) -> str:
        """
        Search properties based on criteria.
        """
        conditions = [Property.project_id == project_id, Property.availability == True]
        
        if budget_max is not None:
            conditions.append(Property.price <= budget_max)
        if configuration is not None:
            conditions.append(Property.configuration == configuration)
        if bedrooms is not None:
            conditions.append(Property.bedrooms == bedrooms)
        if minimum_area is not None:
            conditions.append(Property.carpet_area >= minimum_area)
        if maximum_area is not None:
            conditions.append(Property.carpet_area <= maximum_area)
            
        stmt = select(Property).where(and_(*conditions))
        result = await self.db.execute(stmt)
        properties = result.scalars().all()
        
        import json
        return json.dumps([
            {
                "id": str(p.id),
                "unit_number": p.unit_number,
                "configuration": p.configuration,
                "bedrooms": p.bedrooms,
                "carpet_area": float(p.carpet_area) if p.carpet_area else None,
                "price": float(p.price) if p.price else None,
                "floor": p.floor,
                "facing": p.facing,
                "amenities": p.amenities
            }
            for p in properties
        ])

    @llm.function_tool(description="Get detailed information about a specific property by its ID.")
    async def get_property_details(self, property_id: str) -> str:
        """
        Get specific property details.
        """
        result = await self.db.execute(select(Property).where(Property.id == property_id))
        p = result.scalars().first()
        
        if not p:
            return "Property not found."
            
        import json
        return json.dumps({
            "id": str(p.id),
            "project_id": str(p.project_id),
            "unit_number": p.unit_number,
            "configuration": p.configuration,
            "bedrooms": p.bedrooms,
            "carpet_area": float(p.carpet_area) if p.carpet_area else None,
            "price": float(p.price) if p.price else None,
            "floor": p.floor,
            "availability": p.availability,
            "amenities": p.amenities
        })
