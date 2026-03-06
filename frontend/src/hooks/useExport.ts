"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { startExport, getDownloadUrl } from "@/lib/api";
import type { JobStatus } from "@/types/timeline";

export function useExport(jobId: string) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const exportDoneRef = useRef(false);
  const esRef = useRef<EventSource | null>(null);

  // When exportProgress reaches 100 and backend confirmed done, auto-download
  useEffect(() => {
    if (exportProgress >= 100 && exportDoneRef.current) {
      const url = getDownloadUrl(jobId);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiktok_${jobId.slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Reset UI
      exportDoneRef.current = false;
      setExportProgress(0);
      setStatus(null);
    }
  }, [exportProgress, jobId]);

  const closeSSE = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const triggerExport = useCallback(async () => {
    setError(null);
    setExportProgress(0);
    exportDoneRef.current = false;
    closeSSE();

    try {
      // Start the export first so the backend status changes to "exporting"
      await startExport(jobId);
      setStatus("exporting" as JobStatus);

      // Then open SSE — at this point status is "exporting" (or already "export_done"
      // if it completed extremely fast), so the stream stays open and delivers events
      const es = new EventSource(`/api/pipeline/${jobId}/stream`);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.ping) return;

          if (typeof data.export_progress === "number") {
            setExportProgress(data.export_progress);
          }

          if (data.status === "export_done") {
            exportDoneRef.current = true;
            setExportProgress(100);
            setStatus("export_done" as JobStatus);
            closeSSE();
          } else if (data.status === "error") {
            setError(data.error ?? "Export failed");
            setStatus("error" as JobStatus);
            closeSSE();
          }
        } catch {}
      };

      es.onerror = () => {
        closeSSE();
      };
    } catch (e) {
      setError(String(e));
      closeSSE();
    }
  }, [jobId, closeSSE]);

  return { triggerExport, status, error, exportProgress };
}
