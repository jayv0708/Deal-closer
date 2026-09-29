from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from livekit.agents import llm
from backend.app.models.crm import Lead, Call, CallStatus, LeadStatus, CallDirection
from agent.agents.conversation_state import ConversationState

class CRMTools:
    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def extract_lead_from_state(self, state: ConversationState) -> Lead:
        """
        Creates or updates a lead based on conversation state.
        """
        # Simplistic check if we have enough info
        # If phone/email exists, we'd search first
        lead = Lead(
            name=state.customer_name,
            budget_min=state.budget_min,
            budget_max=state.budget_max,
            preferred_location=state.preferred_location,
            configuration=state.property_type,
            bedrooms=state.bedrooms,
            purpose=state.purpose,
            buying_timeline=state.timeline,
            financing_required=state.financing_required,
            lead_score=state.lead_score,
            lead_status=LeadStatus.QUALIFIED if state.intent == 'High' else LeadStatus.CONTACTED
        )
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def save_call_summary(
        self,
        call_id_ext: str,
        lead_id: UUID,
        project_id: Optional[UUID],
        transcript: str,
        summary: str,
        duration: int
    ) -> Call:
        """
        Save the completed call summary to CRM.
        """
        call_record = Call(
            lead_id=lead_id,
            project_id=project_id,
            call_id=call_id_ext,
            direction=CallDirection.INBOUND,
            duration=duration,
            status=CallStatus.COMPLETED,
            transcript=transcript,
            summary=summary
        )
        self.db.add(call_record)
        await self.db.commit()
        await self.db.refresh(call_record)
        return call_record

    @llm.function_tool(description="Trigger a human handoff if the user explicitly requests to speak to a human, or has highly complex legal/financial questions.")
    async def trigger_human_handoff(self, reason: str, customer_name: str = "Unknown") -> str:
        """
        Trigger human handoff logic.
        """
        handoff_message = (
            f"HANDOFF TRIGGERED. Reason: {reason}\n"
            f"Customer: {customer_name}\n"
        )
        
        # Log this handoff securely
        print(handoff_message)
        return "A human sales representative will contact you shortly."
