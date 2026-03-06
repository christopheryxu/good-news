"use client";

import { useRef } from "react";
import { SkipBack, Play, Pause, SkipForward } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { useTimelineStore } from "@/store/timelineStore";
import { usePlayback } from "@/hooks/usePlayback";
import { pixelsToSeconds, LABEL_WIDTH } from "@/lib/timelineUtils";
import TrackRow from "./TrackRow";
import TimelineRuler from "./TimelineRuler";
import PlayheadMarker from "./PlayheadMarker";

export default function TimelineEditor() {
  const timeline = useTimelineStore((s) => s.timeline);
  const moveClip = useTimelineStore((s) => s.moveClip);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const jobId = timeline?.job_id ?? "";
  const { play, pause, seek, isPlaying } = usePlayback(jobId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrollEl = e.currentTarget.closest<HTMLElement>("[data-timeline-scroll]");
    if (!scrollEl) return;
    const rect = scrollEl.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollEl.scrollLeft - LABEL_WIDTH;
    if (x < 0) return;
    setCurrentTime(Math.min(pixelsToSeconds(x), timeline!.total_duration_s));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  if (!timeline) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!active || !delta) return;
    moveClip(String(active.id), pixelsToSeconds(delta.x));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        className="flex flex-col overflow-hidden bg-white"
        ref={scrollRef}
        onClick={() => selectClip(null)}
      >
        {/* Playback controls */}
        <div className="flex items-center justify-center gap-1.5 py-1.5 border-b border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={() => seek(0)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Rewind to start"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={isPlaying ? pause : play}
            className="p-1.5 rounded-full text-white bg-[#C4842A] hover:bg-[#1A1207] transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => seek(timeline.total_duration_s)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Skip to end"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Ruler + Tracks */}
        <div data-timeline-scroll className="overflow-x-auto flex-1 [transform:scaleY(-1)]
          [&::-webkit-scrollbar]:h-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-gray-300
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-gray-400
        ">
          <div className="[transform:scaleY(-1)]">
            <TimelineRuler totalDuration={timeline.total_duration_s} />
            <div className="relative" onClick={handleTrackClick}>
              <PlayheadMarker />
              {timeline.tracks
                .filter((t) => t.track_type !== "audio")
                .map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    totalDuration={timeline.total_duration_s}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
