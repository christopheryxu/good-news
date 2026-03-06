from __future__ import annotations
from enum import Enum
from typing import Literal
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    SCRAPING = "scraping"
    ANALYZING = "analyzing"
    FETCHING_MEDIA = "fetching_media"
    GENERATING_AUDIO = "generating_audio"
    BUILD_TIMELINE = "build_timeline"
    READY = "ready"
    EXPORTING = "exporting"
    EXPORT_DONE = "export_done"
    ERROR = "error"


class SubtitleCue(BaseModel):
    start_s: float
    end_s: float
    text: str


class Section(BaseModel):
    id: str
    heading: str
    raw_text: str
    category: str = ""
    summary: str = ""
    voice_script: str = ""
    keywords: list[str] = Field(default_factory=list)


class MediaAsset(BaseModel):
    id: str
    section_id: str
    media_type: Literal["image", "video"]
    source: Literal["pexels", "google"]
    local_path: str
    url: str
    duration_s: float | None = None


class AudioAsset(BaseModel):
    id: str
    section_id: str
    local_path: str
    duration_s: float


class Clip(BaseModel):
    id: str
    clip_type: Literal["visual", "audio", "subtitle", "voice"]
    section_id: str
    start_s: float
    duration_s: float
    # visual fields
    media_type: str | None = None
    local_path: str | None = None
    # audio fields
    audio_path: str | None = None
    # subtitle fields
    subtitle_text: str | None = None
    cues: list[SubtitleCue] | None = None


class Track(BaseModel):
    id: str
    track_type: Literal["visual", "audio", "subtitle", "voice"]
    clips: list[Clip] = Field(default_factory=list)


class Timeline(BaseModel):
    job_id: str
    tracks: list[Track] = Field(default_factory=list)
    total_duration_s: float = 0.0
    canvas_width: int = 1080
    canvas_height: int = 1920
    fps: int = 30


class Job(BaseModel):
    id: str
    url: str
    status: JobStatus = JobStatus.PENDING
    progress: int = 0
    error: str | None = None
    sections: list[Section] = Field(default_factory=list)
    media_assets: list[MediaAsset] = Field(default_factory=list)
    audio_assets: list[AudioAsset] = Field(default_factory=list)
    timeline: Timeline | None = None
    output_path: str | None = None
    export_progress: int = 0
