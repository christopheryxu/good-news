from __future__ import annotations
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from ..models.api import ExportStatusResponse
from ..models.pipeline import JobStatus
from ..services import job_store
from ..services.ffmpeg_service import render_timeline
from ..config import settings

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/{job_id}")
async def start_export(job_id: str, background_tasks: BackgroundTasks):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.timeline:
        raise HTTPException(status_code=400, detail="Timeline not ready")

    job.status = JobStatus.EXPORTING
    job_store.set_job(job)
    background_tasks.add_task(_do_export, job_id)
    return {"job_id": job_id, "status": JobStatus.EXPORTING.value}


@router.get("/{job_id}/status", response_model=ExportStatusResponse)
async def get_export_status(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ExportStatusResponse(
        job_id=job.id,
        status=job.status,
        output_path=job.output_path,
        error=job.error,
        export_progress=job.export_progress,
    )


@router.get("/{job_id}/progress")
async def get_export_progress(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"progress": job.export_progress}


@router.get("/{job_id}/download")
async def download_export(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.EXPORT_DONE or not job.output_path:
        raise HTTPException(status_code=400, detail="Export not ready")
    if not Path(job.output_path).exists():
        raise HTTPException(status_code=404, detail="Output file not found")
    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=f"tiktok_{job_id[:8]}.mp4",
    )


async def _do_export(job_id: str) -> None:
    import asyncio
    loop = asyncio.get_running_loop()
    job = job_store.get_job(job_id)
    if not job or not job.timeline:
        return
    output_path = settings.jobs_path / job_id / "output.mp4"

    def on_progress(pct: int):
        job.export_progress = pct
        job_store.set_job(job)
        asyncio.run_coroutine_threadsafe(
            job_store.publish(job_id, {"status": "exporting", "export_progress": pct}),
            loop,
        )

    try:
        ok, error = await asyncio.to_thread(
            render_timeline, job.timeline, output_path, on_progress
        )
        if ok:
            job.status = JobStatus.EXPORT_DONE
            job.output_path = str(output_path)
        else:
            job.status = JobStatus.ERROR
            job.error = error or "ffmpeg render failed"
    except Exception as e:
        job.status = JobStatus.ERROR
        job.error = str(e)
    job_store.set_job(job)
    await job_store.publish(job_id, {
        "status": job.status.value,
        "export_progress": 100 if job.status == JobStatus.EXPORT_DONE else job.export_progress,
    })
