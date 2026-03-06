"use client";

import { useState, useEffect } from "react";
import { useTimelineStore } from "@/store/timelineStore";

interface Props {
  sectionId: string;
  initialScript: string;
}

export default function SectionScript({ sectionId, initialScript }: Props) {
  const [script, setScript] = useState(initialScript);
  const timeline = useTimelineStore((s) => s.timeline);
  const syncToBackend = useTimelineStore((s) => s.syncToBackend);

  const handleChange = (val: string) => {
    setScript(val);
    if (timeline) {
      const subtitleTrack = timeline.tracks.find((t) => t.track_type === "voice")
        ?? timeline.tracks.find((t) => t.track_type === "subtitle");
      if (subtitleTrack) {
        const clip = subtitleTrack.clips.find((c) => c.section_id === sectionId);
        if (clip) clip.subtitle_text = val;
      }
    }
    syncToBackend();
  };

  useEffect(() => { setScript(initialScript); }, [initialScript]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pb-4 pt-3 gap-2">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-shrink-0">
        Voice Script
      </label>
      <textarea
        value={script}
        onChange={(e) => handleChange(e.target.value)}
        className="
          flex-1 min-h-0 w-full rounded-lg bg-gray-50 border border-gray-200
          px-3 py-2 text-xs text-gray-800 placeholder-gray-400 resize-none
          focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-gray-300
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-gray-400
        "
      />
    </div>
  );
}
