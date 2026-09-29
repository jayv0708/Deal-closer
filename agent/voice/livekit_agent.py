"""
LiveKit Voice Agent — The Deal Closer (Priya)
Hinglish-speaking real-estate sales agent with DB-backed tools and CRM persistence.

Stack:
  - Google Gemini Live API realtime voice-to-voice (no separate STT/TTS latency)
  - livekit-agents 1.8 AgentSession + Agent(tools=...)
  - Postgres CRM via the backend async engine (asyncpg)
  - Lead state refreshed into instructions after every user turn
  - Transcript + lead + call summary persisted to the CRM on call end
"""

import asyncio
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

# --- Path setup ---
ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path[:0] = [str(ROOT_DIR), str(BACKEND_DIR)]

load_dotenv(ROOT_DIR / ".env")

# google-genai reads GOOGLE_API_KEY; repo convention stores it in LLM_API_KEY
_llm_key = os.getenv("LLM_API_KEY", "")
if _llm_key:
    os.environ["GOOGLE_API_KEY"] = _llm_key
    os.environ.pop("GEMINI_API_KEY", None)

from livekit.agents import (  # noqa: E402
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.agents.voice import AgentSession  # noqa: E402
from livekit.agents.voice.room_io import RoomInputOptions  # noqa: E402
from livekit.plugins.google import realtime  # noqa: E402

from agent.agents.lead_tracker import format_price  # noqa: E402
from agent.agents.priya_agent import Priya  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deal-closer-agent")

_MODEL = os.getenv("GEMINI_REALTIME_MODEL", "gemini-2.0-flash-exp")
_VOICE = os.getenv("GEMINI_VOICE", "Aoede")
# Which project the agent pitches by default (empty = search across all projects).
DEFAULT_PROJECT_ID = os.getenv("DEFAULT_PROJECT_ID", "").strip() or None


def _build_realtime_model() -> realtime.RealtimeModel:
    """Prewarmed per process and reused across calls."""
    return realtime.RealtimeModel(
        model=_MODEL,
        voice=_VOICE,
        language="hi-IN",
        temperature=0.7,
    )


def prewarm(proc) -> None:
    logger.info("Pre-building Gemini Realtime Model (model=%s voice=%s)...", _MODEL, _VOICE)
    proc.userdata["llm"] = _build_realtime_model()
    logger.info("Gemini Realtime Model initialized")


def _transcript_text(msg) -> str:
    """Best-effort plain text from a ChatMessage."""
    try:
        return msg.text_content or ""
    except Exception:
        return ""


def _format_ts(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%H:%M:%S")


def _rule_based_summary(tracker, room_name: str) -> str:
    s = tracker.state
    config = s.property_type or (f"{s.bedrooms} BHK" if s.bedrooms else "config unknown")
    return (
        f"Hinglish sales call ({room_name}). "
        f"Contact: {s.customer_name or 'not captured'}"
        f"{', phone ' + tracker.phone if tracker.phone else ', phone not captured'}. "
        f"Requirement: {config}, location {s.preferred_location or 'unknown'}, "
        f"budget {format_price(s.budget_min) if s.budget_min else '?'}-"
        f"{format_price(s.budget_max) if s.budget_max else '?'}"
        f"{' (financing)' if s.financing_required else ''}. "
        f"Shortlisted: {'; '.join(tracker.shortlisted) if tracker.shortlisted else 'none'}. "
        f"Objections: {'; '.join(s.objections) if s.objections else 'none'}. "
        f"Site visit: {tracker.visit_slot or 'not booked'}. "
        f"Lead score {tracker.compute_lead_score()}/100."
    )


async def _llm_summary(transcript: str) -> str | None:
    """Optional richer summary via a Gemini text model (best-effort)."""
    api_key = os.getenv("GOOGLE_API_KEY", "")
    if not api_key or not transcript.strip():
        return None
    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=os.getenv("SUMMARY_MODEL", "gemini-2.5-flash-lite"),
            contents=(
                "Summarize this Hinglish real-estate sales call transcript in 5 short "
                "English bullet lines: customer name & phone if mentioned, requirement "
                "(BHK/location/budget/purpose/timeline), properties pitched, objections, "
                "outcome (site visit booked? lead quality). Be factual, no invention.\n\n"
                f"TRANSCRIPT:\n{transcript[:12000]}"
            ),
        )
        return (resp.text or "").strip() or None
    except Exception:
        logger.exception("genai summary failed; using rule-based summary")
        return None


async def _project_id_for_property(db, property_id: str):
    """Resolve the Project id owning a Property, for Appointment.project_id."""
    from sqlalchemy import select

    from backend.app.models.project import Property

    res = await db.execute(select(Property.project_id).where(Property.id == property_id))
    return res.scalar_one_or_none()


async def _persist_call_record(
    *,
    call_ext_id: str,
    room_name: str,
    tracker,
    transcript: str,
    started_at: float,
    duration_s: int,
    summary: str,
) -> None:
    """Create/update the Lead, then the Call row, in the CRM.

    Runs on the session 'close' event inside a short-lived DB session; failures
    are logged, never raised — a CRM outage must not kill the voice job.
    """
    from sqlalchemy import select

    from agent.agents.db_runtime import session_scope
    from backend.app.models.crm import (
        Appointment,
        AppointmentStatus,
        Call,
        CallDirection,
        CallStatus,
        Followup,
        Lead,
        LeadStatus,
    )

    s = tracker.state
    lead_score = tracker.compute_lead_score()

    try:
        async with session_scope() as db:
            # 1) Find or create the Lead (dedupe on phone when we have one)
            lead = None
            if tracker.phone:
                res = await db.execute(select(Lead).where(Lead.phone == tracker.phone).limit(1))
                lead = res.scalars().first()

            if lead is None:
                lead = Lead(
                    name=s.customer_name,
                    phone=tracker.phone,
                    email=tracker.email,
                    budget_min=s.budget_min,
                    budget_max=s.budget_max,
                    preferred_location=s.preferred_location,
                    configuration=s.property_type,
                    bedrooms=s.bedrooms,
                    purpose=s.purpose,
                    buying_timeline=s.timeline,
                    financing_required=s.financing_required,
                    lead_score=lead_score,
                    lead_status=(
                        LeadStatus.SITE_VISIT
                        if tracker.visit_requested
                        else (LeadStatus.QUALIFIED if lead_score >= 40 else LeadStatus.CONTACTED)
                    ),
                )
                db.add(lead)
            else:
                lead.name = lead.name or s.customer_name
                lead.email = lead.email or tracker.email
                lead.budget_min = s.budget_min or lead.budget_min
                lead.budget_max = s.budget_max or lead.budget_max
                lead.preferred_location = s.preferred_location or lead.preferred_location
                lead.configuration = s.property_type or lead.configuration
                lead.bedrooms = s.bedrooms or lead.bedrooms
                lead.purpose = s.purpose or lead.purpose
                lead.buying_timeline = s.timeline or lead.buying_timeline
                lead.financing_required = (
                    s.financing_required
                    if s.financing_required is not None
                    else lead.financing_required
                )
                lead.lead_score = max(lead_score, int(lead.lead_score or 0))
                if tracker.visit_requested:
                    lead.lead_status = LeadStatus.SITE_VISIT
                elif lead_score >= 40 and lead.lead_status in (LeadStatus.NEW, LeadStatus.CONTACTED):
                    lead.lead_status = LeadStatus.QUALIFIED

            await db.flush()

            # 2) Booked site visit -> Appointment row
            if tracker.visit_requested and lead is not None:
                # Requested but date unparsed/ambiguous — still record it (next-week placeholder
                # below), a human can reschedule from the appointments list.
                appt_status = AppointmentStatus.SCHEDULED
                # Naive local datetimes are interpreted as IST (Indian callers).
                visit_when = tracker.visit_dt
                if visit_when is not None and visit_when.tzinfo is None:
                    visit_when = visit_when.replace(tzinfo=timezone(timedelta(hours=5, minutes=30)))
                appt = Appointment(
                    lead_id=lead.id,
                    project_id=tracker.visit_property_id and await _project_id_for_property(
                        db, tracker.visit_property_id
                    ),
                    date=visit_when or (datetime.now(timezone.utc) + timedelta(days=7)),
                    time=tracker.visit_time,
                    status=appt_status,
                    notes=" | ".join(
                        p for p in (
                            f"Booked on call {call_ext_id}",
                            f"property {tracker.visit_property_id}" if tracker.visit_property_id else None,
                            tracker.visit_notes,
                        ) if p
                    ),
                )
                db.add(appt)

            # 3) No contact captured -> Followup row so a human calls back
            if lead is not None and not tracker.phone:
                db.add(Followup(
                    lead_id=lead.id,
                    scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
                    reason="AI call ended without capturing contact details — call back",
                    status="PENDING",
                ))

            # 4) Upsert the Call row (external call id is unique)
            res = await db.execute(select(Call).where(Call.call_id == call_ext_id).limit(1))
            call_row = res.scalars().first()
            if call_row is None:
                call_row = Call(
                    lead_id=lead.id,
                    project_id=DEFAULT_PROJECT_ID,
                    call_id=call_ext_id,
                    direction=CallDirection.INBOUND,
                    status=CallStatus.COMPLETED,
                )
                db.add(call_row)

            call_row.started_at = datetime.fromtimestamp(started_at, tz=timezone.utc)
            call_row.ended_at = datetime.now(timezone.utc)
            call_row.duration = duration_s
            call_row.transcript = transcript[:100_000]
            call_row.summary = summary
            call_row.status = CallStatus.COMPLETED

            # Capture PKs BEFORE commit — commit expires ORM instances and a
            # post-commit attribute access would raise MissingGreenlet.
            persisted_lead_id = lead.id
            persisted_call_id = call_row.call_id
            await db.commit()
            logger.info(
                "CRM persisted: lead=%s call=%s score=%s visit=%s",
                persisted_lead_id, persisted_call_id, lead_score, bool(tracker.visit_requested),
            )
    except Exception:
        logger.exception("Failed to persist call to CRM")


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Agent entrypoint called for room: %s", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("Connected to room, audio subscribed")

    llm_model = ctx.proc.userdata["llm"]

    call_ext_id = f"room:{ctx.room.name}"
    started_at = time.time()
    transcript_parts: list[str] = []

    agent = Priya(default_project_id=DEFAULT_PROJECT_ID)
    session = AgentSession(
        llm=llm_model,
        # Fast, fluent conversation: short endpointing silence so Priya answers
        # quickly after the caller stops speaking, interruptions (barge-in) on,
        # and preemptive generation starts the reply while the caller is still
        # finishing their sentence.
        turn_handling={
            "endpointing": {"mode": "fixed", "min_delay": 0.2, "max_delay": 1.5},
        },
    )
    tracker = agent.tracker

    # ---- transcript capture -------------------------------------------------
    @session.on("conversation_item_added")
    def _on_item(ev) -> None:
        item = ev.item
        text = _transcript_text(item)
        if not text:
            return
        ts = _format_ts(item.created_at)
        if item.role == "assistant":
            transcript_parts.append(f"[{ts}] PRIYA: {text}")
        elif item.role == "user":
            transcript_parts.append(f"[{ts}] CUSTOMER: {text}")

    # The realtime session also emits final user transcripts; dedupe against
    # conversation items by keeping whichever arrives (both is fine — the
    # transcript is for humans reading the CRM later).
    @session.on("user_input_transcribed")
    def _on_user_transcript(ev) -> None:
        if ev.is_final and ev.transcript:
            transcript_parts.append(f"[{_format_ts(ev.created_at)}] CUSTOMER: {ev.transcript}")

    # ---- end-of-call CRM persistence ----------------------------------------
    close_seen = asyncio.Event()   # session close event observed
    persist_done = asyncio.Event()  # CRM persistence finished
    _persist_started = False

    async def _persist_and_signal() -> None:
        nonlocal _persist_started
        if _persist_started:
            return
        _persist_started = True
        transcript = "\n".join(transcript_parts)
        duration_s = int(time.time() - started_at)
        summary = await _llm_summary(transcript) or _rule_based_summary(
            tracker, room_name=ctx.room.name
        )
        await _persist_call_record(
            call_ext_id=call_ext_id,
            room_name=ctx.room.name,
            tracker=tracker,
            transcript=transcript,
            started_at=started_at,
            duration_s=duration_s,
            summary=summary,
        )
        persist_done.set()

    # NOTE: 1.8.1 forbids async callbacks in `.on()`, so the sync handler just
    # schedules the async persistence task.
    @session.on("close")
    def _on_close(ev) -> None:
        logger.info("Session closing (reason=%s) — persisting to CRM", ev.reason)
        asyncio.create_task(_persist_and_signal())
        close_seen.set()

    # Fallback: if the job is shut down before the session close event fires
    # (worker stop, SIGTERM), still persist what we captured.
    async def _on_shutdown(reason: str = "") -> None:
        logger.info("Job shutdown (%s) — final persistence pass", reason or "unknown")
        await _persist_and_signal()
        # This job's event loop is about to die — drop its DB engine so the
        # pooled connections (bound to this loop) are closed cleanly.
        from agent.agents.db_runtime import dispose_current_loop_engine

        await dispose_current_loop_engine()

    ctx.add_shutdown_callback(_on_shutdown)

    await session.start(
        agent,
        room=ctx.room,
        room_input_options=RoomInputOptions(text_enabled=True),
    )
    logger.info("AgentSession started with Gemini Realtime API")

    # Hold the entrypoint open until the session closes (participant left, job
    # shutdown, or error). Without this the job ends before the call does.
    await close_seen.wait()
    # Give the persistence task a moment to finish before the job reaps tasks.
    try:
        await asyncio.wait_for(persist_done.wait(), timeout=30)
    except asyncio.TimeoutError:
        logger.warning("CRM persistence did not finish within 30s")
    logger.info("Call ended after %ds", int(time.time() - started_at))


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name=os.getenv("LIVEKIT_AGENT_NAME", "deal-closer"),
            num_idle_processes=1,
        )
    )
