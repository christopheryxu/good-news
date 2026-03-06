from __future__ import annotations
import json
import re
import anthropic

from ..config import settings
from ..models.pipeline import Section

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# ── Duration estimation ───────────────────────────────────────────────────────
# Average TTS pace: ~2.5 words per second.
# 30-second maximum → up to 75 words total across all sections.
_WORDS_PER_SECOND = 2.5
_MAX_DURATION_S = 30
_MAX_TOTAL_WORDS = int(_MAX_DURATION_S * _WORDS_PER_SECOND)  # 75


def estimate_duration_s(text: str) -> float:
    """Estimate TTS duration from word count. Used as fallback when audio generation fails."""
    words = len(text.split())
    return max(1.0, words / _WORDS_PER_SECOND)


# ── Main function ─────────────────────────────────────────────────────────────
async def analyze_newsletter(sections: list[Section]) -> dict:
    """
    Single Claude call: produces one concise educational voice_script per section.
    Total across all sections ≤ 75 words (≤ 30 seconds at 2.5 words/sec).

    Returns:
      {
        "sections": [
          { "voice_script": str, "scene_description": str, "keywords": [str] },
          ...
        ]
      }
    """
    client = _get_client()
    n = len(sections)
    words_per_section = max(10, _MAX_TOTAL_WORDS // n)

    section_blocks = "\n\n".join(
        f"Section {i + 1} — {s.heading}:\n{s.raw_text[:600]}"
        for i, s in enumerate(sections)
    )

    system = f"""\
You are a clear, neutral educational summarizer for short-form video.

For each numbered section below, write a brief factual summary to be read aloud as a voiceover.

Rules:
- Each voice_script must be ≤ {words_per_section} words. Plain, informative language — no hype, \
no dramatic phrasing, no calls to action.
- Match the number of output sections exactly to the number of input sections.
- Also provide: scene_description (a calm, descriptive visual prompt for AI image generation, \
portrait 9:16, no text) and 2–3 keywords (plain English, for stock video search).

Return ONLY valid JSON (no markdown fences, no extra text):
{{
  "sections": [
    {{
      "voice_script": "<≤{words_per_section} words, factual summary>",
      "scene_description": "<descriptive visual scene, portrait format>",
      "keywords": ["<keyword1>", "<keyword2>"]
    }}
  ]
}}\
"""

    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1200,
        system=system,
        messages=[{"role": "user", "content": f"Sections to summarize:\n\n{section_blocks}"}],
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    data = json.loads(raw.strip())

    result_sections = [
        {
            "voice_script":      str(seg.get("voice_script", "")),
            "scene_description": str(seg.get("scene_description", "")),
            "keywords":          [str(k) for k in seg.get("keywords", [])],
        }
        for seg in data.get("sections", [])
    ]

    return {"sections": result_sections}


# ── Writing profile ────────────────────────────────────────────────────────────

async def generate_writing_profile(sections: list[Section]) -> str:
    """
    Analyzes the newsletter's writing style and personality.
    Returns a Markdown string to be saved as skills.md.
    """
    client = _get_client()

    combined = "\n\n".join(
        f"### {s.heading}\n{s.raw_text[:500]}"
        for s in sections
        if s.raw_text
    )

    system = """\
You are a writing style analyst. Read the newsletter content below and produce a concise Markdown \
profile of the author's personality and writing style.

Structure your output with exactly these five sections (use ## headings):
## Voice & Tone
## Writing Style
## Vocabulary & Language
## Personality Traits
## Recurring Themes

Each section: 2–4 bullet points. Be specific — cite concrete patterns from the text. \
Return only the Markdown, no preamble or closing remarks.\
"""

    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=900,
        system=system,
        messages=[{"role": "user", "content": f"Newsletter content:\n\n{combined}"}],
    )

    return message.content[0].text.strip()


# ── Brand profile ──────────────────────────────────────────────────────────────

async def generate_brand_profile(sections: list[Section], colors: list[str]) -> str:
    """
    Analyzes the newsletter's visual brand identity.
    Returns a Markdown string to be saved as brand.md.
    """
    client = _get_client()

    combined = "\n\n".join(
        f"### {s.heading}\n{s.raw_text[:400]}"
        for s in sections
        if s.raw_text
    )

    colors_block = (
        f"Detected hex colors from the newsletter HTML: {', '.join(colors)}\n\n"
        if colors else
        "No colors were detected in the HTML — infer likely palette from the brand's tone.\n\n"
    )

    system = """\
You are a brand identity analyst. Based on the newsletter content and detected colors, \
produce a concise Markdown brand profile.

Structure your output with exactly these five sections (use ## headings):
## Brand Identity
## Color Palette
## Visual Style
## Target Audience
## Brand Positioning

For **Color Palette**: list each detected hex color on its own bullet with a short descriptive \
label (e.g. `#C4842A` — Warm Amber, primary accent). If no colors were detected, propose a \
fitting palette inferred from the brand's tone.

Each section: 2–4 bullet points. Be specific. Return only the Markdown, no preamble.\
"""

    message = await client.messages.create(
        model="claude-opus-4-6",
        max_tokens=900,
        system=system,
        messages=[{"role": "user", "content": colors_block + f"Newsletter content:\n\n{combined}"}],
    )

    return message.content[0].text.strip()
