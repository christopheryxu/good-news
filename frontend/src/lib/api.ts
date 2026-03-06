import type { Timeline, Job, JobStatus } from "@/types/timeline";

const BASE = "/api";

export async function startPipeline(url: string, voiceId = "Rachel"): Promise<{ job_id: string; status: JobStatus }> {
  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, voice_id: voiceId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/pipeline/${jobId}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTimeline(jobId: string): Promise<Timeline> {
  const res = await fetch(`${BASE}/timeline/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function putTimeline(jobId: string, timeline: Timeline): Promise<Timeline> {
  const res = await fetch(`${BASE}/timeline/${jobId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeline }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startExport(jobId: string): Promise<void> {
  const res = await fetch(`${BASE}/export/${jobId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
}

export async function getExportStatus(jobId: string): Promise<{ status: JobStatus; output_path?: string; error?: string }> {
  const res = await fetch(`${BASE}/export/${jobId}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getMediaUrl(jobId: string, type: "audio" | "media", filename: string): string {
  return `/api/media/${jobId}/${type}/${encodeURIComponent(filename)}`;
}

export function getDownloadUrl(jobId: string): string {
  return `/api/export/${jobId}/download`;
}

export function getJobFileUrl(jobId: string, filename: string): string {
  return `/api/pipeline/${jobId}/file/${encodeURIComponent(filename)}`;
}
