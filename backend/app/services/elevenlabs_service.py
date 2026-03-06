from __future__ import annotations
import base64
import shutil
import subprocess
import json
import httpx
from pathlib import Path

from .ffmpeg_service import FFPROBE


_BASE = "https://api.elevenlabs.io/v1"
_VOICE_MAP = {
    "Rachel": "21m00Tcm4TlvDq8ikWAM",
    "Adam": "pNInz6obpgDQGcFmaJgB",
    "Antoni": "ErXwobaYiN019PkySvjV",
    "Josh": "TxGEqnHWrfWFTfGW9XjX",
}

# (word, start_s, end_s)
WordTimestamp = tuple[str, float, float]


async def generate_audio(
    text: str, voice_id: str, dest_path: Path, api_key: str
) -> tuple[bool, list[WordTimestamp], float]:
    """Generate audio via ElevenLabs with-timestamps endpoint.

    Returns (success, word_timestamps, duration_s).
    Falls back to the plain TTS endpoint if timestamps aren't available.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    resolved = _VOICE_MAP.get(voice_id, voice_id)

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    async with httpx.AsyncClient(timeout=60) as client:
        # Try with-timestamps first
        try:
            resp = await client.post(
                f"{_BASE}/text-to-speech/{resolved}/with-timestamps",
                headers=headers,
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                audio_bytes = base64.b64decode(data["audio_base64"])
                dest_path.write_bytes(audio_bytes)

                alignment = data.get("alignment", {})
                chars = alignment.get("characters", [])
                starts = alignment.get("character_start_times_seconds", [])
                ends = alignment.get("character_end_times_seconds", [])

                words = _parse_word_timestamps(chars, starts, ends)
                duration = float(ends[-1]) if ends else probe_duration(dest_path)
                return True, words, duration
        except Exception:
            pass

        # Fallback: plain TTS endpoint
        try:
            resp = await client.post(
                f"{_BASE}/text-to-speech/{resolved}",
                headers={**headers, "Accept": "audio/mpeg"},
                json=payload,
            )
            if resp.status_code == 200:
                dest_path.write_bytes(resp.content)
                duration = probe_duration(dest_path)
                return True, [], duration
        except Exception:
            pass

    return False, [], 0.0


def _parse_word_timestamps(
    chars: list[str], starts: list[float], ends: list[float]
) -> list[WordTimestamp]:
    """Group ElevenLabs character-level timestamps into word-level tuples."""
    words: list[WordTimestamp] = []
    current_word = ""
    word_start: float | None = None
    word_end: float | None = None

    for char, start, end in zip(chars, starts, ends):
        if char in (" ", "\n", "\t"):
            if current_word and word_start is not None and word_end is not None:
                words.append((current_word, word_start, word_end))
            current_word = ""
            word_start = None
            word_end = None
        else:
            if word_start is None:
                word_start = start
            word_end = end
            current_word += char

    if current_word and word_start is not None and word_end is not None:
        words.append((current_word, word_start, word_end))

    return words


def probe_duration(audio_path: Path) -> float:
    """Use ffprobe to get audio duration in seconds."""
    try:
        result = subprocess.run(
            [
                FFPROBE, "-v", "quiet", "-print_format", "json",
                "-show_streams", str(audio_path),
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        data = json.loads(result.stdout)
        for stream in data.get("streams", []):
            dur = stream.get("duration")
            if dur:
                return float(dur)
        result2 = subprocess.run(
            [
                FFPROBE, "-v", "quiet", "-print_format", "json",
                "-show_format", str(audio_path),
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        data2 = json.loads(result2.stdout)
        dur = data2.get("format", {}).get("duration")
        if dur:
            return float(dur)
    except Exception:
        pass
    return 5.0
