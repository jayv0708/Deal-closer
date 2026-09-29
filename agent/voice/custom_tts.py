"""
Custom TTS using Edge-TTS for LiveKit Agents 1.8+

Correct implementation for non-streaming TTS:
- Subclass tts.TTS with streaming=False
- Subclass tts.ChunkedStream and implement _run(output_emitter)
- Do NOT call start_segment() / end_segment() when streaming=False
  (the framework auto-starts a segment; only call push() and end_input())
- Use PyAV to decode MP3 -> PCM (no ffmpeg binary needed)
"""

import asyncio
import io
import uuid
import logging

import edge_tts
import av
import numpy as np

from livekit.agents import tts
from livekit.agents.types import APIConnectOptions, DEFAULT_API_CONNECT_OPTIONS
from livekit.agents.tts import AudioEmitter

logger = logging.getLogger("deal-closer-tts")

TARGET_SAMPLE_RATE = 24000
TARGET_CHANNELS = 1
CHUNK_BYTES = 4096  # Push audio in 4KB chunks for smooth playback


class HinglishTTS(tts.TTS):
    """
    Microsoft Edge-TTS using hi-IN-SwaraNeural voice.
    Natural, professional female Hindi/Hinglish voice.
    """

    def __init__(self, voice: str = "hi-IN-SwaraNeural", rate: str = "+0%", volume: str = "+0%"):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=TARGET_SAMPLE_RATE,
            num_channels=TARGET_CHANNELS,
        )
        self.voice = voice
        self.rate = rate
        self.volume = volume

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "EdgeTTSStream":
        return EdgeTTSStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
            voice=self.voice,
            rate=self.rate,
            volume=self.volume,
        )


class EdgeTTSStream(tts.ChunkedStream):
    """Async wrapper around edge_tts that feeds PCM into LiveKit."""

    def __init__(
        self,
        *,
        tts: HinglishTTS,
        input_text: str,
        conn_options: APIConnectOptions,
        voice: str,
        rate: str,
        volume: str,
    ):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self._voice = voice
        self._rate = rate
        self._volume = volume

    async def _run(self, output_emitter: AudioEmitter) -> None:
        """
        For non-streaming TTS (streaming=False):
        - The framework calls initialize() automatically before _run()
        - We must call push(bytes) then end_input()
        - Do NOT call start_segment() or end_segment() — only valid for streaming=True
        """
        request_id = str(uuid.uuid4())

        # Step 1: Fetch MP3 audio from Edge-TTS
        try:
            mp3_bytes = await _fetch_edge_tts_mp3(self._input_text, self._voice, self._rate, self._volume)
        except Exception as e:
            logger.error(f"Edge-TTS fetch failed: {e}")
            output_emitter.end_input()
            return

        if not mp3_bytes:
            logger.warning("Edge-TTS returned empty audio")
            output_emitter.end_input()
            return

        # Step 2: Decode MP3 -> int16 PCM via PyAV (no system ffmpeg needed)
        try:
            pcm_bytes = await asyncio.to_thread(
                _decode_mp3_to_int16_pcm, mp3_bytes, TARGET_SAMPLE_RATE
            )
        except Exception as e:
            logger.error(f"Audio decode failed: {e}")
            output_emitter.end_input()
            return

        # Step 3: Initialize the emitter and push audio in chunks for smooth playback
        output_emitter.initialize(
            request_id=request_id,
            sample_rate=TARGET_SAMPLE_RATE,
            num_channels=TARGET_CHANNELS,
            mime_type="audio/pcm",
        )

        # Push in chunks so LiveKit can start playing immediately
        for i in range(0, len(pcm_bytes), CHUNK_BYTES):
            chunk = pcm_bytes[i : i + CHUNK_BYTES]
            output_emitter.push(chunk)

        output_emitter.end_input()


async def _fetch_edge_tts_mp3(text: str, voice: str, rate: str, volume: str) -> bytes:
    """Fetch MP3 audio from Edge-TTS asynchronously."""
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    return bytes(audio_data)


def _decode_mp3_to_int16_pcm(mp3_bytes: bytes, target_rate: int) -> bytes:
    """
    Decode MP3 bytes -> int16 PCM at target_rate using PyAV.
    No ffmpeg system binary required.
    """
    buf = io.BytesIO(mp3_bytes)
    container = av.open(buf, format="mp3")
    audio_stream = container.streams.audio[0]

    resampler = av.AudioResampler(
        format="s16",    # signed 16-bit LE
        layout="mono",
        rate=target_rate,
    )

    frames = []
    for packet in container.demux(audio_stream):
        for frame in packet.decode():
            resampled = resampler.resample(frame)
            for rf in resampled:
                frames.append(bytes(rf.planes[0]))

    # Flush resampler
    for rf in resampler.resample(None):
        frames.append(bytes(rf.planes[0]))

    container.close()
    return b"".join(frames)
