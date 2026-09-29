"""Live end-to-end test of the Priya voice agent.

1. GET /api/voice/token  (backend creates a room + dispatches the agent)
2. Join the room as the guest participant
3. Wait for the agent to join and publish an audio track
4. Report PASS/FAIL with timings
"""

import asyncio
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from livekit import rtc  # noqa: E402

API = os.getenv("TEST_API_URL", "http://127.0.0.1:8000/api")


def request_token() -> tuple[str, str, str]:
    req = urllib.request.Request(f"{API}/voice/token", method="GET")
    req.add_header("x-user-name", "Automated Test Caller")
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json_loads(resp.read())
    return data["token"], data["ws_url"], data.get("room", "")


def json_loads(b: bytes) -> dict:
    import json

    return json.loads(b.decode("utf-8"))


async def main() -> int:
    print("[1/4] Requesting voice token (this also dispatches the agent)...")
    token, ws_url, room_hint = request_token()
    print(f"      got token for ws={ws_url}")

    room = rtc.Room()
    agent_joined = asyncio.Event()
    audio_received = asyncio.Event()
    first_agent = {}

    @room.on("participant_connected")
    def _on_join(p: rtc.RemoteParticipant) -> None:
        print(f"      participant joined: identity={p.identity!r} name={p.name!r}")
        if not p.identity.startswith("guest-"):
            first_agent["identity"] = p.identity
            agent_joined.set()

    @room.on("track_subscribed")
    def _on_track(track, pub, participant: rtc.RemoteParticipant) -> None:
        print(f"      track subscribed: {track.kind} from {participant.identity}")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            audio_received.set()

    @room.on("data_received")
    def _on_data(ev) -> None:
        pass

    print("[2/4] Connecting to LiveKit room as guest...")
    await room.connect(ws_url, token)
    print(f"      connected; room={room.name} local_identity={room.local_participant.identity}")

    print("[3/4] Waiting for the Priya agent to join and speak (max 60s)...")
    t0 = time.time()
    try:
        await asyncio.wait_for(agent_joined.wait(), timeout=30)
        print(f"      agent joined after {time.time() - t0:.1f}s: {first_agent.get('identity')}")
    except asyncio.TimeoutError:
        # maybe the agent was already in the room before our handler attached
        for p in room.remote_participants.values():
            if not p.identity.startswith("guest-"):
                agent_joined.set()
                print(f"      agent already present: {p.identity}")
        if not agent_joined.is_set():
            print("FAIL: no agent joined within 30s")
            await room.disconnect()
            return 1

    try:
        await asyncio.wait_for(audio_received.wait(), timeout=30)
        print(f"      agent audio track received after {time.time() - t0:.1f}s total")
    except asyncio.TimeoutError:
        print("FAIL: agent joined but never published audio (Gemini session may have failed)")
        await room.disconnect()
        return 2

    print("[4/4] Listening for agent activity for 10s, then disconnecting...")
    await asyncio.sleep(10)

    # Check CRM for the call row afterwards is done manually; here just report.
    await room.disconnect()
    print("PASS: agent joined, published audio, and the voice pipeline is live")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
