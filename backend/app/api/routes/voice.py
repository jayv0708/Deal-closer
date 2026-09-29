import os
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
import uuid
from livekit import api as lkapi

from app.models.user import User
from app.api.dependencies.auth import get_current_active_user

router = APIRouter()
logger = logging.getLogger("voice")


class TokenResponse(BaseModel):
    token: str
    ws_url: str


@router.get("/token", response_model=TokenResponse)
async def get_livekit_token(
    request: Request,
) -> Any:
    """
    Generate a LiveKit access token and dispatch the voice agent into the room.
    The browser client may not have a valid JWT yet, so this route intentionally
    supports guest voice sessions and generates a unique room for each call.
    """
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    livekit_url = os.getenv("LIVEKIT_URL")
    agent_name = os.getenv("LIVEKIT_AGENT_NAME", "deal-closer")

    if not livekit_api_key or not livekit_api_secret or not livekit_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LiveKit credentials are not configured on the server. Please verify LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
        )

    # Each call creates a UNIQUE room so we always get exactly ONE agent per session.
    # Using uuid4 ensures no two sessions ever share a room → no duplicate agents.
    session_id = uuid.uuid4().hex[:12]
    room_name = f"deal-closer-guest-{session_id}"
    participant_identity = f"guest-{uuid.uuid4().hex[:10]}"

    requested_name = request.headers.get("x-user-name", "")
    participant_name = requested_name.strip() if requested_name else "Guest Buyer"

    # Generate participant token with canPublish=True so the user can send audio
    token = (
        lkapi.AccessToken(livekit_api_key, livekit_api_secret)
        .with_identity(participant_identity)
        .with_name(participant_name)
        .with_grants(
            lkapi.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )
    )

    # Dispatch exactly ONE agent to this new room
    try:
        async with lkapi.LiveKitAPI(
            url=livekit_url,
            api_key=livekit_api_key,
            api_secret=livekit_api_secret,
        ) as lk:
            await lk.agent_dispatch.create_dispatch(
                lkapi.CreateAgentDispatchRequest(
                    agent_name=agent_name,
                    room=room_name,
                )
            )
            logger.info(f"Agent '{agent_name}' dispatched to room '{room_name}'")
    except Exception as e:
        logger.warning(f"Agent dispatch warning: {e}")

    return {
        "token": token.to_jwt(),
        "ws_url": livekit_url,
    }


class VoiceChatRequest(BaseModel):
    message: str


class VoiceChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=VoiceChatResponse)
async def voice_chat(
    payload: VoiceChatRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Fallback text-only chat endpoint (used if LiveKit is unavailable).
    Responds in Hinglish like a property sales agent.
    """
    msg = payload.message.lower().strip()

    if any(w in msg for w in ["hi", "hello", "hey", "namaste", "start", "kaise"]):
        reply = "Namaste! Main Priya hoon, The Deal Closer se aapki property consultant. Aap kaunsi property ke baare mein jaanna chahte hain?"
    elif any(w in msg for w in ["bhk", "bedroom", "flat", "apartment", "size", "kamre"]):
        reply = "Hamare paas 2 BHK, 3 BHK, aur 4 BHK luxury flats hain — sab RERA registered aur ready-to-move options ke saath."
    elif any(w in msg for w in ["price", "cost", "budget", "rate", "kitna", "paisa", "daam"]):
        reply = "2 BHK ₹65-85 lakh mein, 3 BHK ₹95 lakh se 1.25 crore, aur 4 BHK ₹1.5 crore se upar hain. Aapka budget kya hai?"
    elif any(w in msg for w in ["emi", "loan", "finance", "kist", "bank"]):
        reply = "Bilkul sir! Hamare leading banks ke saath tie-ups hain. Home loan 8.5% se start hota hai, 30 saal tak ka repayment option."
    elif any(w in msg for w in ["amenities", "pool", "gym", "facility", "suvidha"]):
        reply = "5-star clubhouse, infinity pool, fully equipped gym, rooftop garden aur 24/7 security — sab available hai!"
    elif any(w in msg for w in ["location", "address", "where", "kaha", "jagah"]):
        reply = "Prime location pe hai — CBD ke paas, airport aur top schools se sirf 10 minute ki doori par."
    elif any(w in msg for w in ["visit", "book", "schedule", "dekhna", "kab"]):
        reply = "Zaroor! Main aapke liye ek exclusive VIP site visit arrange kar sakti hoon. Kal subah ya dopahar — kaunsa time aapke liye better hai?"
    else:
        reply = f"Aapne '{payload.message}' bola. Main property consultant hoon, floor plans, pricing aur site visits ke baare mein help kar sakti hoon. Aap kya jaanna chahte hain?"

    return {"response": reply}
