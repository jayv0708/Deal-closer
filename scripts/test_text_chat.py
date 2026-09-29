"""Text-path test: join the room, send a message on the lk.chat text-stream topic
(the agent's RoomIO text input), and verify Priya answers with speech."""

import asyncio
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(ROOT, ".env"))

from livekit import rtc  # noqa: E402

API = os.getenv("TEST_API_URL", "http://127.0.0.1:8000/api")
MESSAGE = "Mujhe Hinjewadi mein 2 BHK chahiye, budget 70 lakh ke andar. Kuch options batao."


def request_token() -> tuple[str, str]:
    req = urllib.request.Request(f"{API}/voice/token", method="GET")
    req.add_header("x-user-name", "Text Path Test")
    with urllib.request.urlopen(req, timeout=30) as resp:
        import json

        data = json.loads(resp.read())
    return data["token"], data["ws_url"]


def rms(frame) -> float:
    import array

    samples = array.array("h", bytes(frame.data))
    if not samples:
        return 0.0
    acc = sum(s * s for s in samples)
    return (acc / len(samples)) ** 0.5 / 32768.0


async def main() -> int:
    print("[1/4] Requesting token (dispatches agent)...")
    token, ws_url = request_token()

    room = rtc.Room()
    agent_audio = asyncio.Event()

    @room.on("track_subscribed")
    def _on_track(track, pub, participant) -> None:
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            agent_audio.set()

    print("[2/4] Connecting...")
    await room.connect(ws_url, token)
    room_name = room.name
    print(f"      connected: {room_name}")

    # Greeting window
    print("[3/4] Waiting 12s for greeting, then sending text...")
    await asyncio.sleep(12)

    await room.local_participant.send_text(MESSAGE, topic="lk.chat")
    print(f"      sent: {MESSAGE}")

    print("[4/4] Listening for Priya's reply (45s)...")
    speech_ms = listened_ms = 0.0
    tracks = [t for p in room.remote_participants.values() for t in p.track_publications.values()]
    if tracks:
        stream = rtc.AudioStream.from_track(track=tracks[0].track)
        async for ev in stream:
            f = ev.frame
            listened_ms += f.samples_per_channel / f.sample_rate * 1000
            if rms(f) > 0.02:
                speech_ms += f.samples_per_channel / f.sample_rate * 1000
            if listened_ms >= 45_000:
                break

    await room.disconnect()
    print(f"      listened {listened_ms/1000:.0f}s — agent speech: {speech_ms/1000:.1f}s")
    if speech_ms < 1.5:
        print("FAIL: no spoken reply to the text message")
        return 1
    print(f"PASS: text path works — check CRM for room '{room_name}'")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
