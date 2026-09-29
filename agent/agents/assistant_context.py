import logging
from typing import Optional
from livekit.agents import llm
from sqlalchemy.ext.asyncio import AsyncSession

from agent.tools.property_tools import PropertyTools
from agent.tools.crm_tools import CRMTools

logger = logging.getLogger("assistant_context")

class AssistantFncCtx(llm.ToolContext):
    def __init__(self, db_session: AsyncSession):
        super().__init__()
        self.property_tools = PropertyTools(db_session)
        self.crm_tools = CRMTools(db_session)

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
        logger.info(f"Calling search_properties for project {project_id}")
        return await self.property_tools.search_properties(
            project_id=project_id,
            budget_max=budget_max,
            location=location,
            configuration=configuration,
            bedrooms=bedrooms,
            minimum_area=minimum_area,
            maximum_area=maximum_area
        )

    @llm.function_tool(description="Get detailed information about a specific property by its ID.")
    async def get_property_details(self, property_id: str) -> str:
        logger.info(f"Calling get_property_details for {property_id}")
        return await self.property_tools.get_property_details(property_id=property_id)

    @llm.function_tool(description="Trigger a human handoff if the user explicitly requests to speak to a human, or has highly complex legal/financial questions.")
    async def trigger_human_handoff(self, reason: str, customer_name: str = "Unknown") -> str:
        logger.info(f"Calling trigger_human_handoff for {customer_name}")
        return await self.crm_tools.trigger_human_handoff(reason=reason, customer_name=customer_name)
