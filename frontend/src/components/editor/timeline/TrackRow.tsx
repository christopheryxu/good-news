"use client";

import { useDroppable } from "@dnd-kit/core";
import { secondsToPixels } from "@/lib/timelineUtils";
import Clip from "./Clip";
import type { Track } from "@/types/timeline";

const TRACK_LABELS: Record<string, string> = {
  visual: "Visual",
  subtitle: "Voice",
};

interface Props {
  track: Track;
  totalDuration: number;
}

export default function TrackRow({ track, totalDuration }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: track.id });
  const totalWidth = secondsToPixels(totalDuration) + 24;

  return (
    <div className="flex items-stretch border-b border-gray-200 h-10">
      {/* Label */}
      <div className="w-[60px] flex-shrink-0 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
        <span className="text-[10px] text-gray-400 font-medium">{TRACK_LABELS[track.track_type]}</span>
      </div>

      {/* Clip area */}
      <div
        ref={setNodeRef}
        className={`relative flex-shrink-0 overflow-hidden transition-colors ${isOver ? "bg-pink-50" : "bg-white"}`}
        style={{ width: totalWidth }}
      >
        {track.clips.map((clip) => (
          <Clip key={clip.id} clip={clip} trackType={track.track_type} />
        ))}
      </div>
    </div>
  );
}
