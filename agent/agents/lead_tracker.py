"""In-call lead state for the Priya sales agent.

One ``LeadTracker`` instance exists per live call. Tools read/write it, the
rendered block is injected into the LLM instructions via
``AgentSession.update_instructions()``, and at call end it is flushed to the
CRM (``leads`` / ``calls`` / ``appointments`` tables).
"""

from __future__ import annotations

import logging
from typing import Optional

from agent.agents.conversation_state import ConversationState

logger = logging.getLogger("lead-tracker")


def format_price(value: Optional[float]) -> str:
    """Format a rupee amount the Indian way: 6_500_000 -> '65 lakh'."""
    if value is None:
        return "unknown"
    v = float(value)
    if v >= 1e7:
        return f"{v / 1e7:.2f}".rstrip("0").rstrip(".") + " crore"
    if v >= 1e5:
        return f"{v / 1e5:.1f}".rstrip("0").rstrip(".") + " lakh"
    return f"{int(v)}"


def normalize_phone(raw: str) -> Optional[str]:
    """Normalize an Indian phone number spoken/typed by a caller.

    Accepts '+91 98123 45678', '09812345678', '98-12-34-56-78' etc.
    Returns the 10-digit number, or None if it cannot be validated.
    """
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "123456789":
        return digits
    return None


class LeadTracker:
    """Mutable state for one live call."""

    def __init__(self, state: Optional[ConversationState] = None) -> None:
        self.state = state or ConversationState()
        self.phone: Optional[str] = None
        self.email: Optional[str] = None
        self.visit_requested: bool = False
        self.visit_slot: Optional[str] = None
        # Structured visit info for CRM persistence (Appointment row)
        self.visit_dt: Optional[object] = None  # datetime, naive = caller-local (IST)
        self.visit_time: Optional[str] = None
        self.visit_property_id: Optional[str] = None
        self.visit_notes: Optional[str] = None
        self.shortlisted: list[str] = []

    # ------------------------------------------------------------------
    def capture_contact(
        self,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> str:
        """Merge contact info into the tracker. Returns a status note."""
        notes: list[str] = []
        if name:
            self.state.customer_name = name.strip().title()
            notes.append(f"name={self.state.customer_name}")
        if phone:
            normalized = normalize_phone(phone)
            if normalized:
                self.phone = normalized
                notes.append(f"phone={normalized}")
            else:
                notes.append(f"INVALID phone '{phone}' — ask the caller to repeat it")
        if email:
            self.email = email.strip().lower()
            notes.append(f"email={self.email}")
        return ", ".join(notes) if notes else "nothing captured"

    # ------------------------------------------------------------------
    def compute_lead_score(self) -> int:
        s = self.state
        score = 0
        if self.phone:
            score += 30
        if s.customer_name:
            score += 10
        if s.budget_max:
            score += 15
        if s.preferred_location:
            score += 10
        if s.bedrooms or s.property_type:
            score += 5
        if s.purpose:
            score += 5
        if s.timeline:
            score += 5
        if self.visit_requested:
            score += 20
        return min(score, 100)

    # ------------------------------------------------------------------
    def render(self) -> str:
        """Compact state block for the dynamic instruction section."""
        s = self.state

        name = s.customer_name or "NOT CAPTURED"
        phone = self.phone or "NOT CAPTURED"

        req_bits: list[str] = []
        if s.bedrooms or s.property_type:
            req_bits.append(s.property_type or f"{s.bedrooms} BHK")
        if s.preferred_location:
            req_bits.append(f"in {s.preferred_location}")
        if s.budget_min or s.budget_max:
            if s.budget_min:
                lo = format_price(s.budget_min)
                req_bits.append(f"budget {lo} to {format_price(s.budget_max)}")
            else:
                req_bits.append(f"budget up to {format_price(s.budget_max)}")
        if s.purpose:
            req_bits.append(f"purpose={s.purpose}")
        if s.timeline:
            req_bits.append(f"timeline={s.timeline}")
        requirement = " ".join(req_bits) if req_bits else "not yet known"

        shortlist = "; ".join(self.shortlisted) if self.shortlisted else "none"
        objections = "; ".join(s.objections) if s.objections else "none"

        if self.visit_slot:
            visit = f"BOOKED for {self.visit_slot}"
        elif self.visit_requested:
            visit = "requested, slot not confirmed"
        else:
            visit = "not booked"

        if self.phone:
            next_action = "confirm the site visit slot, then close politely"
        else:
            next_action = "capture the caller's name and phone number next"

        return (
            f"- Contact: name={name}, phone={phone}\n"
            f"- Requirement: {requirement}\n"
            f"- Shortlisted units: {shortlist}\n"
            f"- Objections: {objections}\n"
            f"- Site visit: {visit}\n"
            f"- Next action: {next_action}"
        )
