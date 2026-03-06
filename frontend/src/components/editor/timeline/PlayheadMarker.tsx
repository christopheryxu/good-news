"use client";

import { useRef } from "react";
import { secondsToPixels, pixelsToSeconds, LABEL_WIDTH } from "@/lib/timelineUtils";
import { useTimelineStore } from "@/store/timelineStore";

export default function PlayheadMarker() {
  const currentTime = useTimelineStore((s) => s.currentTime);
  const totalDuration = useTimelineStore((s) => s.timeline?.total_duration_s ?? 0);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setPlaying = useTimelineStore((s) => s.setPlaying);
  const startXRef = useRef<number>(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const x = secondsToPixels(currentTime) + LABEL_WIDTH;

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setPlaying(false);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!(e.buttons & 1)) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = e.clientX;

    // Auto-scroll and include scroll delta in time calculation
    let scrollDelta = 0;
    const scroll = e.currentTarget.closest<HTMLElement>("[data-timeline-scroll]");
    if (scroll) {
      const { left, right } = scroll.getBoundingClientRect();
      const edgeZone = 60;
      if (e.clientX > right - edgeZone) {
        scrollDelta = 12;
      } else if (e.clientX < left + edgeZone) {
        scrollDelta = -12;
      }
      if (scrollDelta !== 0) scroll.scrollLeft += scrollDelta;
    }

    const newTime = Math.max(
      0,
      Math.min(totalDuration, currentTimeRef.current + pixelsToSeconds(dx + scrollDelta))
    );
    setCurrentTime(newTime);
  };

  return (
    // Wide invisible hit area for easy grabbing
    <div
      className="absolute top-0 bottom-0 w-4 z-20 cursor-col-resize -translate-x-1/2"
      style={{ left: x }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      {/* Thin visual line */}
      <div className="absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2" style={{ backgroundColor: "#C4842A" }} />
      {/* Circle handle */}
      <div className="w-2 h-2 rounded-full absolute top-0 left-1/2 -translate-x-1/2" style={{ backgroundColor: "#C4842A" }} />
    </div>
  );
}
