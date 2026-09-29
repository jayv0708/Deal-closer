"""
Custom STT using faster-whisper for LiveKit Agents 1.8+
Correct implementation of the _recognize_impl abstract method.
"""

import asyncio
import uuid
import numpy as np

from livekit.agents import stt, NOT_GIVEN, NotGivenOr, APIConnectOptions
from livekit.agents.utils import AudioBuffer
from livekit import rtc
from faster_whisper import WhisperModel


class HinglishSTT(stt.STT):
    """
    Faster-whisper STT that handles Hinglish (Hindi + English).
    Accepts either a pre-loaded WhisperModel or a model size string.
    """

    def __init__(self, model_size: str = "tiny", model=None):
        super().__init__(
            capabilities=stt.STTCapabilities(streaming=False, interim_results=False)
        )
        if model is not None:
            # Use pre-loaded model from prewarm
            self._model = model
        else:
            # Load model now (first-time setup, will download if needed)
            self._model = WhisperModel(model_size, device="cpu", compute_type="int8")

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options: APIConnectOptions,
    ) -> stt.SpeechEvent:
        """
        AudioBuffer is list[AudioFrame] | AudioFrame.
        We combine frames, convert to float32 numpy array, then transcribe.
        """
        # Combine frames to a single AudioFrame
        if isinstance(buffer, list):
            combined = rtc.combine_audio_frames(buffer)
        else:
            combined = buffer

        def run_transcribe() -> str:
            # PCM data is int16, convert to float32 [-1, 1]
            sample_rate = getattr(combined, "sample_rate", 16000)
            arr = np.frombuffer(bytes(combined.data), dtype=np.int16).astype(np.float32) / 32768.0
            if sample_rate != 16000 and len(arr) > 0:
                num_samples = int(len(arr) * 16000 / sample_rate)
                arr = np.interp(
                    np.linspace(0, len(arr), num_samples, endpoint=False),
                    np.arange(len(arr)),
                    arr
                ).astype(np.float32)
            lang = language if language and not isinstance(language, type(NOT_GIVEN)) else "hi"
            segments, _ = self._model.transcribe(
                arr,
                beam_size=1,
                language=lang,
                without_timestamps=True,
            )
            return " ".join(seg.text.strip() for seg in segments)

        # Offload heavy CPU work to thread pool — keeps the async loop free
        text = await asyncio.to_thread(run_transcribe)

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(text=text, language="hi", confidence=1.0)
            ],
        )
