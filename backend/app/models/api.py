from pydantic import BaseModel
from .pipeline import JobStatus, Timeline


class StartPipelineRequest(BaseModel):
    url: str
    voice_id: str = "Rachel"


class StartPipelineResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int
    error: str | None = None
    timeline: Timeline | None = None


class UpdateTimelineRequest(BaseModel):
    timeline: Timeline


class ExportStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    output_path: str | None = None
    error: str | None = None
    export_progress: int = 0
