"""Priya — the tool-wired, DB-backed Hinglish sales agent.

A ``livekit.agents.Agent`` subclass whose method tools talk directly to the
Postgres CRM (properties, leads, calls, appointments). Live lead state lives
in a per-call ``LeadTracker``; after every user turn the rendered state block
is pushed into the Gemini session via ``AgentSession.update_instructions()``
(the Google realtime model supports mutable instructions).

Method tools receive a ``RunContext`` injected by livekit-agents 1.8 — it is
declared in the signature but excluded from the LLM-facing JSON schema.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.llm import ToolError
from sqlalchemy import or_, select

from agent.agents.lead_tracker import LeadTracker, format_price
from agent.prompts.priya_prompt import PRIYA_CORE_PROMPT, build_lead_instructions

logger = logging.getLogger("priya")

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d %Y",
    "%b %d %Y",
    "%d.%m.%Y",
)


def parse_visit_date(raw: str) -> Optional[datetime]:
    """Best-effort parse of a caller-provided date (stdlib only)."""
    text = (raw or "").strip()
    if not text:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


class Priya(Agent):
    """One instance per live call."""

    def __init__(
        self,
        *,
        default_project_id: Optional[str] = None,
    ) -> None:
        self.tracker = LeadTracker()
        self.default_project_id = default_project_id
        self.handoff_requested = False
        self._last_state_block: str = ""
        super().__init__(
            instructions=PRIYA_CORE_PROMPT
            + "\n\n"
            + build_lead_instructions(self.tracker.render())
        )
        self._last_state_block = self.tracker.render()

    # ------------------------------------------------------------------
    # DB access
    # ------------------------------------------------------------------
    @asynccontextmanager
    async def _db(self):
        """Short-lived session per tool call, bound to the CURRENT event loop.

        livekit jobs share the process but get fresh event loops, so a
        module-level engine would hold connections bound to a dead loop.
        """
        from agent.agents.db_runtime import session_scope

        async with session_scope() as session:
            yield session

    # ------------------------------------------------------------------
    # Lifecycle hooks
    # ------------------------------------------------------------------
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=(
                "Say ONLY your opening line in Hinglish, close to: 'Namaste! Main Priya "
                "bol rahi hoon The Deal Closer se. Aap kya kind ki property dhoondh rahe "
                "hain — khud rehne ke liye ya investment ke liye?'"
            ),
        )

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        """Refresh the dynamic lead-context block after every user turn."""
        block = self.tracker.render()
        if block == self._last_state_block:
            return
        self._last_state_block = block
        try:
            await self.session.update_instructions(
                PRIYA_CORE_PROMPT + "\n\n" + build_lead_instructions(block)
            )
        except Exception:
            logger.exception("failed to refresh lead instructions")

    # ------------------------------------------------------------------
    # Tools
    # ------------------------------------------------------------------
    @function_tool
    async def search_properties(
        self,
        ctx: RunContext,
        budget_max_lakhs: Optional[float] = None,
        location: Optional[str] = None,
        configuration: Optional[str] = None,
        bedrooms: Optional[int] = None,
    ) -> str:
        """Search AVAILABLE properties in the CRM matching the caller's criteria. Call this BEFORE quoting any price or project.

        Args:
            budget_max_lakhs: Caller's maximum budget in lakh rupees (e.g. 75 means Rs 75,00,000)
            location: Preferred locality, city or project name
            configuration: Configuration like "2 BHK" or "3 BHK"
            bedrooms: Number of bedrooms (alternative to configuration)
        """
        from backend.app.models.project import Property, Project

        stmt = (
            select_property_join()
            .where(Property.availability == True)  # noqa: E712
        )
        if self.default_project_id:
            stmt = stmt.where(Property.project_id == self.default_project_id)
        if budget_max_lakhs is not None and budget_max_lakhs > 0:
            stmt = stmt.where(Property.price <= budget_max_lakhs * 1e5)
            self.tracker.state.update(budget_max=budget_max_lakhs * 1e5)
        if location:
            like = f"%{location.strip()}%"
            stmt = stmt.where(
                or_(
                    Project.location.ilike(like),
                    Project.city.ilike(like),
                    Project.name.ilike(like),
                )
            )
            self.tracker.state.update(preferred_location=location.strip())
        if configuration:
            stmt = stmt.where(Property.configuration.ilike(configuration.strip()))
            self.tracker.state.update(property_type=configuration.strip())
        if bedrooms is not None and bedrooms > 0:
            stmt = stmt.where(Property.bedrooms == bedrooms)
            self.tracker.state.update(bedrooms=bedrooms)

        stmt = stmt.order_by(Property.price.asc()).limit(5)
        async with self._db() as db:
            rows = (await db.execute(stmt)).all()

        if not rows:
            return (
                "NO_MATCH: no available property matched these criteria. "
                "Do not invent one — ask the caller which criterion is flexible."
            )

        lines = []
        for prop, proj in rows:
            lines.append(
                f"id={prop.id} | {proj.name} by {proj.builder} at {proj.location}, {proj.city}"
                f" | unit {prop.unit_number} | {prop.configuration}"
                f" | {float(prop.carpet_area) if prop.carpet_area else '?'} sqft carpet"
                f" | floor {prop.floor} | facing {prop.facing}"
                f" | {format_price(float(prop.price) if prop.price else None)}"
            )
        return "\n".join(lines)

    @function_tool
    async def get_property_details(self, ctx: RunContext, property_id: str) -> str:
        """Get full details of ONE property using the id from search results.

        Args:
            property_id: The property id exactly as returned by search_properties
        """
        from backend.app.models.project import Property, Project

        stmt = select_property_join().where(Property.id == property_id)
        async with self._db() as db:
            row = (await db.execute(stmt)).first()
        if row is None:
            return f"Property {property_id} not found."

        prop, proj = row
        price = float(prop.price) if prop.price else None
        entry = f"{prop.unit_number} ({prop.configuration}, {format_price(price)})"
        if entry not in self.tracker.shortlisted:
            self.tracker.shortlisted.append(entry)

        return (
            f"Project: {proj.name} by {proj.builder} at {proj.location}, {proj.city} "
            f"(status: {getattr(proj.status, 'value', proj.status)})\n"
            f"Unit: {prop.unit_number} | {prop.configuration} | bedrooms={prop.bedrooms} "
            f"bathrooms={prop.bathrooms}\n"
            f"Carpet: {float(prop.carpet_area) if prop.carpet_area else '?'} sqft | "
            f"Built-up: {float(prop.built_up_area) if prop.built_up_area else '?'} sqft\n"
            f"Floor: {prop.floor} | Facing: {prop.facing} | "
            f"Price: {format_price(price)}\n"
            f"Amenities: {json.dumps(prop.amenities, default=str) if prop.amenities else 'n/a'}"
        )

    @function_tool
    async def calculate_emi(
        self,
        ctx: RunContext,
        principal_lakhs: float,
        interest_rate_pct: float = 8.5,
        tenure_years: int = 20,
    ) -> str:
        """Calculate the monthly EMI for a home loan so the caller can compare it with their rent.

        Args:
            principal_lakhs: Loan amount in lakh rupees (e.g. 55 means Rs 55,00,000)
            interest_rate_pct: Annual interest rate in percent (default 8.5)
            tenure_years: Loan tenure in years (default 20)
        """
        if principal_lakhs <= 0:
            raise ToolError("principal_lakhs must be a positive number")
        if tenure_years <= 0:
            raise ToolError("tenure_years must be a positive number")

        principal = principal_lakhs * 1e5
        monthly_rate = interest_rate_pct / 12 / 100
        months = tenure_years * 12
        growth = (1 + monthly_rate) ** months
        emi = principal * monthly_rate * growth / (growth - 1)
        total_payable = emi * months

        self.tracker.state.update(financing_required=True)

        return (
            f"Loan {format_price(principal)} at {interest_rate_pct}% for {tenure_years} years "
            f"=> EMI about Rs {emi:,.0f} per month. "
            f"Total payable {format_price(total_payable)}, total interest "
            f"{format_price(total_payable - principal)}. Give ONLY the monthly EMI figure "
            f"to the caller in a natural Hinglish sentence."
        )

    @function_tool
    async def save_contact_info(
        self,
        ctx: RunContext,
        full_name: str = "",
        phone: str = "",
        email: str = "",
    ) -> str:
        """Save the caller's contact details the moment they share them. Call this even mid-sentence if the caller gives name or number.

        Args:
            full_name: Caller's name
            phone: 10-digit Indian mobile number (may include +91 or a leading 0)
            email: Caller's email address
        """
        note = self.tracker.capture_contact(
            name=full_name or None,
            phone=phone or None,
            email=email or None,
        )
        return (
            f"Saved: {note}. "
            "If the phone was invalid, ask the caller to repeat it digit by digit. "
            "Otherwise confirm it back once naturally."
        )

    @function_tool
    async def capture_requirement(
        self,
        ctx: RunContext,
        budget_min_lakhs: Optional[float] = None,
        budget_max_lakhs: Optional[float] = None,
        location: Optional[str] = None,
        configuration: Optional[str] = None,
        bedrooms: Optional[int] = None,
        purpose: Optional[str] = None,
        timeline: Optional[str] = None,
        objection: Optional[str] = None,
    ) -> str:
        """Record a requirement or objection the caller just mentioned (budget, location, configuration, purpose, timeline). Call this whenever the caller reveals a new detail.

        Args:
            budget_min_lakhs: Minimum budget in lakh rupees
            budget_max_lakhs: Maximum budget in lakh rupees
            location: Preferred locality or city
            configuration: Configuration like "2 BHK" or "3 BHK"
            bedrooms: Number of bedrooms
            purpose: "self-use" or "investment"
            timeline: When they plan to buy, e.g. "immediate", "3 months", "this year"
            objection: Any hesitation the caller expressed, e.g. "too expensive", "location not preferred"
        """
        s = self.tracker.state
        if budget_min_lakhs is not None and budget_min_lakhs > 0:
            s.update(budget_min=budget_min_lakhs * 1e5)
        if budget_max_lakhs is not None and budget_max_lakhs > 0:
            s.update(budget_max=budget_max_lakhs * 1e5)
        if location:
            s.update(preferred_location=location.strip())
        if configuration:
            s.update(property_type=configuration.strip())
        if bedrooms is not None and bedrooms > 0:
            s.update(bedrooms=bedrooms)
        if purpose:
            s.update(purpose=purpose.strip())
        if timeline:
            s.update(timeline=timeline.strip())
        if objection:
            s.objections.append(objection.strip())

        return "Requirement updated. Continue the conversation naturally — do not read this state back."

    @function_tool
    async def schedule_site_visit(
        self,
        ctx: RunContext,
        preferred_date: str,
        preferred_time: str = "",
        property_id: str = "",
        notes: str = "",
    ) -> str:
        """Book a site visit after the caller has confirmed a specific day and time.

        Args:
            preferred_date: Visit date like 2026-03-15 or 15/03/2026 (confirm with caller first)
            preferred_time: Time of day, e.g. "11:00 AM" or "evening"
            property_id: Property id being visited, from search results
            notes: Anything the caller asked to arrange for the visit
        """
        parsed = parse_visit_date(preferred_date)
        self.tracker.visit_requested = True

        if parsed is None:
            return (
                f"UNPARSED date '{preferred_date}' — ask the caller to confirm the exact "
                "date once more before saving."
            )

        slot = preferred_date.strip() + (f" {preferred_time.strip()}" if preferred_time else "")
        self.tracker.visit_slot = slot
        self.tracker.visit_dt = parsed
        self.tracker.visit_time = preferred_time.strip() or None
        self.tracker.visit_property_id = property_id.strip() or None
        self.tracker.visit_notes = notes.strip() or None

        if property_id:
            already = any(property_id in item for item in self.tracker.shortlisted)
            if not already:
                self.tracker.shortlisted.append(f"visit for property {property_id}")

        logger.info("site visit booked: %s (notes=%s)", slot, notes)
        return (
            f"Site visit recorded for {slot}. Tell the caller it is confirmed, say you "
            "will send the location details, and thank them."
        )

    @function_tool
    async def request_human_handoff(self, ctx: RunContext, reason: str) -> str:
        """Request handoff to a human salesperson — ONLY for legal/registry/title questions or when the caller explicitly asks for a human.

        Args:
            reason: Why the handoff is needed, e.g. "legal question about registry"
        """
        self.handoff_requested = True
        logger.warning("human handoff requested: %s", reason)
        return (
            "Handoff noted. Tell the caller politely that a senior team member will call "
            "them back within 24 hours, thank them, and close the call."
        )


def select_property_join():
    """Property JOIN Project select — imported lazily to keep module import light."""
    from sqlalchemy import select

    from backend.app.models.project import Property, Project

    return select(Property, Project).join(Project, Property.project_id == Project.id)
