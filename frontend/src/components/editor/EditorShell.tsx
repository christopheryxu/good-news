"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useJobStatus } from "@/hooks/useJobStatus";
import { useTimelineStore } from "@/store/timelineStore";
import { getJobStatus } from "@/lib/api";
import TimelineEditor from "./timeline/TimelineEditor";
import PreviewPanel from "./PreviewPanel";
import ClipInspector from "./inspector/ClipInspector";
import AssetsPanel from "./AssetsPanel";
import ExportButton from "./ExportButton";

const PIPELINE_STEPS = [
  { label: "Fetching the news...",        minProgress: 0  },
  { label: "Analyzing the newsletter...", minProgress: 20 },
  { label: "Generating media...",         minProgress: 40 },
  { label: "Generating audio...",         minProgress: 65 },
  { label: "Putting it together...",      minProgress: 85 },
  { label: "Done!",                       minProgress: 100 },
];

function getActiveStep(progress: number): number {
  for (let i = PIPELINE_STEPS.length - 1; i >= 0; i--) {
    if (progress >= PIPELINE_STEPS[i].minProgress) return i;
  }
  return 0;
}

interface Props {
  jobId: string;
}

export default function EditorShell({ jobId }: Props) {
  const { status, progress, timeline, error } = useJobStatus(jobId);
  const setTimeline = useTimelineStore((s) => s.setTimeline);
  const clearTimeline = useTimelineStore((s) => s.clearTimeline);
  const storedTimeline = useTimelineStore((s) => s.timeline);

  useEffect(() => { clearTimeline(); }, [jobId]);
  useEffect(() => { if (timeline) setTimeline(timeline); }, [timeline, setTimeline]);

  const [displayProgress, setDisplayProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const targetRef = useRef(0);
  const pipelineReadyRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resizable preview panel
  const [previewHeight, setPreviewHeight] = useState(320);
  const dragStartY = useRef<number>(0);
  const dragStartH = useRef<number>(0);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = previewHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - dragStartY.current;
      setPreviewHeight(Math.max(360, Math.min(600, dragStartH.current + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    getJobStatus(jobId).then((job) => {
      if (job.status === "ready" || job.status === "export_done") {
        pipelineReadyRef.current = true;
        targetRef.current = 100;
        setDisplayProgress(100);
        if (job.timeline) setTimeline(job.timeline);
        setTimeout(() => setIsReady(true), 50);
      }
    }).catch(() => {});
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === "ready") {
      pipelineReadyRef.current = true;
      targetRef.current = 100;
      // Fallback: fetch job directly in case the SSE event dropped the timeline payload.
      if (!storedTimeline) {
        getJobStatus(jobId).then((job) => {
          if (job.timeline) setTimeline(job.timeline);
        }).catch(() => {});
      }
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setDisplayProgress((p) => {
        const target = targetRef.current;
        if (p >= target) return p;
        return Math.min(target, p + 1);
      });
    }, 16);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (displayProgress >= 100 && pipelineReadyRef.current && storedTimeline && !isReady) {
      setIsReady(true);
    }
  }, [displayProgress, storedTimeline, isReady]);

  useEffect(() => {
    if (!pipelineReadyRef.current) {
      targetRef.current = progress;
    }
  }, [progress]);

  const activeStep = getActiveStep(displayProgress);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 cursor-default">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.2rem", color: "#1A1207", letterSpacing: "-0.5px" }}>
            Good
          </span>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: "italic", fontSize: "0.8rem", color: "#C4842A", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            News
          </span>
        </div>
        {isReady && <ExportButton jobId={jobId} />}
      </div>

      {!isReady ? (
        status === "error" ? (
          /* ── Error state ── */
          <div className="flex-1 flex items-center justify-center flex-col gap-4 px-6">
            <div className="text-4xl">⚠️</div>
            <p className="text-red-500 font-semibold text-lg">Pipeline failed</p>
            <p className="text-gray-500 text-sm text-center max-w-md">{error ?? "An unknown error occurred."}</p>
            <p className="text-gray-400 text-xs text-center max-w-sm mt-1">
              Common causes: paywalled or login-required URL, newsletter host blocking scrapers, or invalid URL.
            </p>
            <a
              href="/"
              className="mt-2 px-4 py-2 rounded-lg bg-[#C4842A] hover:bg-[#1A1207] text-white text-sm font-medium transition-colors"
            >
              Try another URL
            </a>
          </div>
        ) : (
          /* ── Pipeline step tracker ── */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col gap-0">
              {PIPELINE_STEPS.map((step, i) => {
                const isCompleted = i < activeStep;
                const isActive    = i === activeStep;
                const isLast      = i === PIPELINE_STEPS.length - 1;

                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {isCompleted ? (
                        <div className="w-7 h-7 rounded-full bg-[#C4842A] flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      ) : isActive ? (
                        <div className="w-7 h-7 rounded-full border-2 border-[#C4842A] border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-gray-200 flex-shrink-0" />
                      )}
                      {!isLast && (
                        <div className={`w-px h-7 mt-0.5 ${isCompleted ? "bg-[#C4842A]" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${
                      isCompleted ? "text-[#C4842A]"
                      : isActive  ? "text-gray-900 font-medium"
                      : "text-gray-300"
                    }`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* ── Editor ── */
        <div className="flex flex-1 overflow-hidden">
          {/* Left assets panel */}
          <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
            <AssetsPanel />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
            <div
              className="flex justify-center items-center flex-shrink-0 relative overflow-hidden bg-white border-b border-gray-200"
              style={{ height: previewHeight }}
            >
              <PreviewPanel jobId={jobId} height={previewHeight} />
              <div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 hover:bg-pink-400 cursor-row-resize transition-colors"
                onMouseDown={onResizeStart}
              />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <TimelineEditor />
            </div>
          </div>
          <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
            <ClipInspector />
          </div>
        </div>
      )}
    </div>
  );
}
