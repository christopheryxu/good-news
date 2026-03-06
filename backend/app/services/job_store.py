from __future__ import annotations
import json
import asyncio
from pathlib import Path
from typing import Optional

from ..models.pipeline import Job, Timeline
from ..config import settings


_jobs: dict[str, Job] = {}
_listeners: dict[str, list[asyncio.Queue]] = {}


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def set_job(job: Job) -> None:
    _jobs[job.id] = job
    _persist_job(job)


def _persist_job(job: Job) -> None:
    job_dir = settings.jobs_path / job.id
    job_dir.mkdir(parents=True, exist_ok=True)
    job_file = job_dir / "job.json"
    job_file.write_text(job.model_dump_json(indent=2), encoding="utf-8")
    if job.timeline:
        timeline_file = job_dir / "timeline.json"
        timeline_file.write_text(job.timeline.model_dump_json(indent=2), encoding="utf-8")


def update_timeline(job_id: str, timeline: Timeline) -> Optional[Job]:
    job = _jobs.get(job_id)
    if not job:
        return None
    job.timeline = timeline
    _persist_job(job)
    return job


def hydrate_from_disk() -> None:
    """Re-load jobs from disk on server restart."""
    jobs_root = settings.jobs_path
    if not jobs_root.exists():
        return
    for job_dir in jobs_root.iterdir():
        if not job_dir.is_dir():
            continue
        job_file = job_dir / "job.json"
        if job_file.exists():
            try:
                job = Job.model_validate_json(job_file.read_text(encoding="utf-8"))
                _jobs[job.id] = job
            except Exception:
                pass


def subscribe(job_id: str) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    _listeners.setdefault(job_id, []).append(q)
    return q


def unsubscribe(job_id: str, q: asyncio.Queue) -> None:
    listeners = _listeners.get(job_id, [])
    if q in listeners:
        listeners.remove(q)


async def publish(job_id: str, event: dict) -> None:
    for q in _listeners.get(job_id, []):
        await q.put(event)
