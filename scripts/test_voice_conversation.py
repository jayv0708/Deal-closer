"""Full-conversation test: actually SPEAKS Hinglish to Priya and verifies she answers.

1. GET /api/voice/token  (backend dispatches the deal-closer agent)
2. Join the room as a guest
3. Synthesize a Hinglish buyer utterance with Gemini TTS (24 kHz PCM)
4. Publish it as a microphone track and play it into the room
5. Listen to the agent's audio and measure speech energy (did Priya answer?)
6. Disconnect; the CRM transcript is checked afterwards via Postgres
"""

import asyncio
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
load_dotenv(os.path.join(ROOT, ".env"))

from google import genai as genai  # noqa: E402
from google.genai import types as gtypes  # noqa: E402
from livekit import rtc  # noqa: E402

API = os.getenv("TEST_API_URL", "http://127.0.0.1:8000/api")
TTS_MODEL = "gemini-2.5-flash-preview-tts"

UTTERANCE = (
    "Namaste Priya! Mujhe Hinjewadi mein 2 BHK flat chahiye, "
    "budget around 70 lakh hai. Kuch options dikhao."
)


def request_token() -> tuple[str, str]:
    req = urllib.request.Request(f"{API}/voice/token", method="GET")
    req.add_header("x-user-name", "Automated Conversation Test")
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = __import__("json").loads(resp.read())
    return data["token"], data["ws_url"]


def synthesize(text: str) -> bytes:
    """Return raw 24 kHz 16-bit mono PCM for the utterance."""
    client = genai.Client(api_key=os.environ["LLM_API_KEY"])
    resp = client.models.generate_content(
        model=TTS_MODEL,
        contents=text,
        config=gtypes.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=gtypes.SpeechConfig(
                voice_config=gtypes.VoiceConfig(
                    prebuilt_voice_config=gtypes.PrebuiltVoiceConfig(voice_name="Kore"),
                )
            ),
        ),
    )
    part = resp.candidates[0].content.parts[0]
    return part.inline_data.data


def rms(frame: rtc.AudioFrame) -> float:
    import array

    samples = array.array("h", bytes(frame.data))
    if not samples:
        return 0.0
    acc = 0
    for s in samples:
        acc += s * s
    return (acc / len(samples)) ** 0.5 / 32768.0


async def main() -> int:
    print("[1/6] Requesting voice token (dispatches the agent)...")
    token, ws_url = request_token()

    print("[2/6] Synthesizing Hinglish utterance with Gemini TTS...")
    pcm = synthesize(UTTERANCE)
    dur = len(pcm) / 2 / 24000
    print(f"      {len(pcm)} bytes -> {dur:.1f}s of 24 kHz mono audio")

    room = rtc.Room()
    agent_audio = asyncio.Event()

    @room.on("track_subscribed")
    def _on_track(track, pub, participant) -> None:
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            agent_audio.set()

    print("[3/6] Connecting to room as guest...")
    await room.connect(ws_url, token)
    room_name = room.name
    print(f"      connected: {room_name}")

    # Let Priya's greeting play out before we speak.
    print("[4/6] Waiting 15s for Priya's Hinglish greeting...")
    for _ in range(30):
        if agent_audio.is_set():
            break
        await asyncio.sleep(0.5)
    await asyncio.sleep(12)

    print("[5/6] Speaking: " + UTTERANCE)
    source = rtc.AudioSource(24000, 1)
    track = rtc.LocalAudioTrack.create_audio_track("mic", source)
    await room.local_participant.publish_track(
        track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    )
    await asyncio.sleep(0.3)  # let the track settle on the other side

    silence_frame = b"\x00\x00" * 480  # 20ms of silence at 24 kHz

    async def push(data: bytes) -> None:
        """Stream 16-bit mono 24 kHz PCM in 20ms frames, real-mic style."""
        for off in range(0, len(data), 960):
            chunk = data[off:off + 960]
            frame = rtc.AudioFrame(chunk, 24000, 1, len(chunk) // 2)
            await source.capture_frame(frame)

    # Lead-in silence so VAD sees the turn start, then the utterance, then
    # trailing silence so VAD sees the turn end.
    await push(silence_frame * 50)   # ~1s
    await push(pcm)
    await push(silence_frame * 50)   # ~1s
    if hasattr(source, "wait_for_playout"):
        await source.wait_for_playout()
    else:
        await asyncio.sleep(dur + 2)
    print("      utterance played into the room")

    # Listen for Priya's reply: measure speech energy for 45s.
    print("[6/6] Listening for Priya's reply (45s)...")
    speech_ms = 0
    listened_ms = 0
    audio_stream = None
    tracks = [t for p in room.remote_participants.values() for t in p.track_publications.values()]
    if tracks:
        audio_stream = rtc.AudioStream.from_track(track=tracks[0].track)
        async for ev in audio_stream:
            frame = ev.frame
            listened_ms += frame.samples_per_channel / frame.sample_rate * 1000
            if rms(frame) > 0.02:
                speech_ms += frame.samples_per_channel / frame.sample_rate * 1000
            if listened_ms >= 45_000:
                break
    else:
        await asyncio.sleep(45)

    await room.disconnect()

    ratio = (speech_ms / listened_ms) if listened_ms else 0.0
    print(f"      listened {listened_ms/1000:.0f}s — agent speech: {speech_ms/1000:.1f}s ({ratio:.0%})")

    if speech_ms < 1.5:
        print("FAIL: Priya never spoke after our utterance")
        return 1

    print(f"PASS: conversation completed in room '{room_name}'")
    print(f"      -> check CRM: SELECT transcript FROM calls WHERE call_id='room:{room_name}';")
    with open(os.path.join(ROOT, "logs", "last_test_room.txt"), "w") as fh:
        fh.write(room_name)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
