"use client";

import { useEffect, useRef, useState } from "react";
import { useTimelineStore } from "@/store/timelineStore";
import { getMediaUrl } from "@/lib/api";
import SubtitleTrack from "./timeline/SubtitleTrack";
import type { SubtitleCue } from "@/types/timeline";

interface Props {
  jobId: string;
  height?: number;
}

export default function PreviewPanel({ jobId, height = 340 }: Props) {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const isPlaying = useTimelineStore((s) => s.isPlaying);

  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<string>("image");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Collect all subtitle cues
  const allCues: SubtitleCue[] = [];
  if (timeline) {
    const subTrack = timeline.tracks.find((t) => t.track_type === "subtitle");
    if (subTrack) {
      for (const clip of subTrack.clips) {
        if (clip.cues) allCues.push(...clip.cues);
      }
    }
  }

  // Find active visual clip
  useEffect(() => {
    if (!timeline) return;
    const visualTrack = timeline.tracks.find((t) => t.track_type === "visual");
    if (!visualTrack) return;
    const activeClip = visualTrack.clips.find(
      (c) => currentTime >= c.start_s && currentTime < c.start_s + c.duration_s
    );
    if (activeClip?.local_path) {
      const filename = activeClip.local_path.split(/[\\/]/).pop()!;
      const url = getMediaUrl(jobId, "media", filename);
      setActiveSrc(url);
      setActiveMediaType(activeClip.media_type ?? "image");
    } else {
      setActiveSrc(null);
    }
  }, [currentTime, timeline, jobId]);

  // Play/pause the video element in sync with the timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Derive video dimensions from container height (9:16, with padding)
  const videoH = Math.max(80, height - 24);
  const videoW = Math.round(videoH * 9 / 16);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative bg-black rounded-xl overflow-hidden border-[3px] border-gray-600"
        style={{ width: videoW, height: videoH }}
      >
        {activeSrc && activeMediaType === "video" ? (
          <video
            ref={videoRef}
            src={activeSrc}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : activeSrc ? (
          <img
            src={activeSrc}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-black" />
        )}
        <SubtitleTrack cues={allCues} />
      </div>
    </div>
  );
}
