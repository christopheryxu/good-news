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

  // Collect all subtitle cues from voice track (fallback to legacy subtitle track)
  const allCues: SubtitleCue[] = [];
  if (timeline) {
    const cueTrack = timeline.tracks.find((t) => t.track_type === "voice")
      ?? timeline.tracks.find((t) => t.track_type === "subtitle");
    if (cueTrack) {
      for (const clip of cueTrack.clips) {
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

  // Track the active visual clip so we can compute seek offset
  const activeClipRef = useRef<{ start_s: number; duration_s: number } | null>(null);
  useEffect(() => {
    if (!timeline) { activeClipRef.current = null; return; }
    const visualTrack = timeline.tracks.find((t) => t.track_type === "visual");
    const clip = visualTrack?.clips.find(
      (c) => currentTime >= c.start_s && currentTime < c.start_s + c.duration_s
    );
    activeClipRef.current = clip ? { start_s: clip.start_s, duration_s: clip.duration_s } : null;
  }, [currentTime, timeline]);

  // Play/pause the video element in sync with the timeline
  // Re-run when isPlaying or activeSrc changes so newly loaded videos auto-play
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && activeSrc) {
      // Seek to the correct offset within this clip
      if (activeClipRef.current) {
        const offset = Math.max(0, currentTime - activeClipRef.current.start_s);
        if (Math.abs(video.currentTime - offset) > 0.3) {
          video.currentTime = offset;
        }
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, activeSrc]); // eslint-disable-line react-hooks/exhaustive-deps

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
