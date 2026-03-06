from __future__ import annotations
import asyncio
import io
import json
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse, PlainTextResponse

from ..config import settings
from ..models.api import StartPipelineRequest, StartPipelineResponse, JobStatusResponse
from ..models.pipeline import Job, JobStatus
from ..services import job_store
from ..workers.pipeline_worker import run_pipeline

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

_LOG_FILE = Path(__file__).parent.parent.parent / "storage" / "jobs.log"


def _log_job(job_id: str, url: str) -> None:
    _LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with _LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(f"{timestamp}  job_id={job_id}  url={url}\n")


@router.post("/start", response_model=StartPipelineResponse)
async def start_pipeline(
    req: StartPipelineRequest,
    background_tasks: BackgroundTasks,
):
    job_id = str(uuid.uuid4())
    job = Job(id=job_id, url=req.url)
    job_store.set_job(job)
    _log_job(job_id, req.url)
    background_tasks.add_task(run_pipeline, job_id, req.url, req.voice_id)
    return StartPipelineResponse(job_id=job_id, status=JobStatus.PENDING)


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_status(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        error=job.error,
        timeline=job.timeline,
    )


@router.get("/{job_id}/file/{filename}")
async def get_job_file(job_id: str, filename: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job_dir = settings.jobs_path / job_id
    file_path = (job_dir / filename).resolve()
    # Security: must stay inside the job directory
    if not str(file_path).startswith(str(job_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    content_type = "text/markdown; charset=utf-8" if filename.endswith(".md") else "text/plain; charset=utf-8"
    return PlainTextResponse(
        file_path.read_text(encoding="utf-8"),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{job_id}/assets.zip")
async def download_assets_zip(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job_dir = settings.jobs_path / job_id
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Visual files
        media_dir = job_dir / "media"
        if media_dir.exists():
            for f in sorted(media_dir.iterdir()):
                if f.is_file():
                    zf.write(f, f"visual/{f.name}")

        # Audio files
        audio_dir = job_dir / "audio"
        if audio_dir.exists():
            for f in sorted(audio_dir.iterdir()):
                if f.is_file():
                    zf.write(f, f"audio/{f.name}")

        # subtitles.txt — generated from timeline
        if job.timeline:
            sub_track = next(
                (t for t in job.timeline.tracks if t.track_type in ("voice", "subtitle")), None
            )
            if sub_track:
                def _fmt(s: float) -> str:
                    m, sec = divmod(int(s), 60)
                    return f"{m}:{sec:02d}" if m else f"{sec}s"
                lines = [
                    f"[{_fmt(c.start_s)} – {_fmt(c.start_s + c.duration_s)}]\n{c.subtitle_text or ''}"
                    for c in sub_track.clips
                ]
                zf.writestr("other/subtitles.txt", "\n\n".join(lines))

        # skills.md and brand.md
        for md_file in ("skills.md", "brand.md"):
            path = job_dir / md_file
            if path.exists():
                zf.write(path, f"other/{md_file}")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="good-news-assets-{job_id[:8]}.zip"'},
    )


@router.get("/{job_id}/stream")
async def stream_status(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        # Send current state immediately
        initial = {
            "status": job.status.value,
            "progress": job.progress,
            "export_progress": job.export_progress,
        }
        if job.timeline:
            initial["timeline"] = job.timeline.model_dump()
        yield f"data: {json.dumps(initial)}\n\n"

        if job.status in (JobStatus.READY, JobStatus.ERROR, JobStatus.EXPORT_DONE):
            return

        q = job_store.subscribe(job_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"data: {json.dumps(event)}\n\n"
                    status = event.get("status", "")
                    if status in ("ready", "error", "export_done"):
                        break
                except asyncio.TimeoutError:
                    yield "data: {\"ping\": true}\n\n"
        finally:
            job_store.unsubscribe(job_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
