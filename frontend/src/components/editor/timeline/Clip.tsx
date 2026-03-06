"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { secondsToPixels, pixelsToSeconds, LABEL_WIDTH } from "@/lib/timelineUtils";
import { useTimelineStore } from "@/store/timelineStore";
import ClipResizeHandle from "./ClipResizeHandle";
import type { Clip as ClipType } from "@/types/timeline";

const TRACK_COLORS: Record<string, string> = {
  visual:   "bg-blue-100 border-blue-300 hover:bg-blue-200",
  voice:    "bg-violet-100 border-violet-300 hover:bg-violet-200",
  audio:    "bg-emerald-100 border-emerald-300 hover:bg-emerald-200",
  subtitle: "bg-violet-100 border-violet-300 hover:bg-violet-200",
};

interface Props {
  clip: ClipType;
  trackType: string;
}

export default function Clip({ clip, trackType }: Props) {
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const totalDuration = useTimelineStore((s) => s.timeline?.total_duration_s ?? 0);
  const isSelected = selectedClipId === clip.id;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
    data: { clip, trackType },
  });

  const style = {
    position: "absolute" as const,
    left: secondsToPixels(clip.start_s),
    width: Math.max(secondsToPixels(clip.duration_s), 20),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    boxShadow: isSelected ? "inset 0 0 0 2px #C4842A" : undefined,
  };

  const colorClass = TRACK_COLORS[trackType] ?? "bg-gray-100 border-gray-300";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        absolute top-0 bottom-0 border rounded-sm ${colorClass}
        ${isSelected ? "ring-2 ring-inset" : ""}
        overflow-hidden select-none cursor-default
      `}
      onClick={(e) => {
        e.stopPropagation();
        selectClip(clip.id);
        const scrollEl = e.currentTarget.closest<HTMLElement>("[data-timeline-scroll]");
        if (scrollEl) {
          const rect = scrollEl.getBoundingClientRect();
          const x = e.clientX - rect.left + scrollEl.scrollLeft - LABEL_WIDTH;
          setCurrentTime(Math.min(Math.max(0, pixelsToSeconds(x)), totalDuration));
        }
      }}
      {...listeners}
      {...attributes}
    >
      <ClipResizeHandle clipId={clip.id} side="left" />
      <ClipResizeHandle clipId={clip.id} side="right" />
    </div>
  );
}
