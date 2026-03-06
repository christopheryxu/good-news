"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { Howl } from "howler";
import { useTimelineStore } from "@/store/timelineStore";
import { getMediaUrl } from "@/lib/api";

export function usePlayback(jobId: string) {
  const { timeline, isPlaying, currentTime, setCurrentTime, setPlaying, updateAudioDurations } = useTimelineStore();
  const howlMapRef = useRef<Map<string, Howl>>(new Map());
  const rafRef = useRef<number>(0);
  const startWallRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Stable key derived from audio file paths only — does NOT change when
  // updateAudioDurations mutates durations/timings, so rebuilding Howls
  // mid-playback is avoided.
  const audioClipKey = useMemo(() => {
    const audioTrack = timeline?.tracks.find((t) => t.track_type === "voice")
      ?? timeline?.tracks.find((t) => t.track_type === "audio");
    return (audioTrack?.clips ?? [])
      .filter((c) => !!c.audio_path)
      .map((c) => `${c.id}:${c.audio_path ?? ""}`)
      .join("|");
  }, [timeline]);

  // Build Howl instances only when audio files actually change
  useEffect(() => {
    howlMapRef.current.forEach((h) => h.unload());
    howlMapRef.current = new Map();
    if (!timeline) return;

    const audioTrack = timeline.tracks.find((t) => t.track_type === "voice")
      ?? timeline.tracks.find((t) => t.track_type === "audio");
    if (!audioTrack || audioTrack.clips.length === 0) return;

    const sectionDurations: Record<string, number> = {};
    let loadedCount = 0;
    const total = audioTrack.clips.filter((c) => !!c.audio_path).length;
    if (total === 0) return;

    for (const clip of audioTrack.clips) {
      if (!clip.audio_path) continue;
      const filename = clip.audio_path.split(/[\\/]/).pop()!;
      const url = getMediaUrl(jobId, "audio", filename);
      const howl = new Howl({
        src: [url],
        preload: true,
        onload() {
          if (clip.section_id) {
            sectionDurations[clip.section_id] = howl.duration();
          }
          loadedCount++;
          if (loadedCount === total) {
            updateAudioDurations(sectionDurations);
          }
        },
      });
      howlMapRef.current.set(clip.id, howl);
    }
  }, [audioClipKey, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }, []);

  const play = useCallback(() => {
    if (!timeline) return;
    setPlaying(true);
    clearTimeouts();
    startWallRef.current = performance.now();
    startTimeRef.current = currentTime;

    const audioTrack = timeline.tracks.find((t) => t.track_type === "voice")
      ?? timeline.tracks.find((t) => t.track_type === "audio");
    if (audioTrack) {
      audioTrack.clips.forEach((clip) => {
        const howl = howlMapRef.current.get(clip.id);
        if (!howl) return;
        const delay = Math.max(0, clip.start_s - currentTime) * 1000;
        const id = setTimeout(() => {
          if (currentTime <= clip.start_s + clip.duration_s) {
            const seek = Math.max(0, currentTime - clip.start_s);
            howl.seek(seek);
            howl.play();
          }
        }, delay);
        timeoutIdsRef.current.push(id);
      });
    }

    const tick = () => {
      const elapsed = (performance.now() - startWallRef.current) / 1000;
      const t = startTimeRef.current + elapsed;
      setCurrentTime(t);
      if (t >= (timeline.total_duration_s || 999)) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [timeline, currentTime, setPlaying, setCurrentTime, clearTimeouts]);

  const pause = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    clearTimeouts();
    howlMapRef.current.forEach((h) => h.pause());
  }, [setPlaying, clearTimeouts]);

  const seek = useCallback((t: number) => {
    setCurrentTime(t);
    startWallRef.current = performance.now();
    startTimeRef.current = t;
  }, [setCurrentTime]);

  useEffect(() => {
    if (!isPlaying) cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  return { play, pause, seek, isPlaying };
}
