import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { putTimeline } from "@/lib/api";
import type { Timeline, Clip } from "@/types/timeline";
import { clamp } from "@/lib/timelineUtils";

interface TimelineState {
  timeline: Timeline | null;
  selectedClipId: string | null;
  selectedFile: string | null;   // e.g. "subtitles"
  currentTime: number;
  isPlaying: boolean;

  setTimeline: (t: Timeline) => void;
  clearTimeline: () => void;
  selectClip: (id: string | null) => void;
  selectFile: (id: string | null) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (p: boolean) => void;

  moveClip: (clipId: string, deltaSecs: number) => void;
  resizeClip: (clipId: string, side: "left" | "right", deltaSecs: number) => void;
  updateAudioDurations: (sectionDurations: Record<string, number>) => void;

  syncToBackend: () => Promise<void>;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export const useTimelineStore = create<TimelineState>()(
  immer((set, get) => ({
    timeline: null,
    selectedClipId: null,
    selectedFile: null,
    currentTime: 0,
    isPlaying: false,

    setTimeline: (t) => set((s) => { s.timeline = t; }),
    clearTimeline: () => set((s) => { s.timeline = null; s.currentTime = 0; s.selectedClipId = null; s.selectedFile = null; }),
    selectClip: (id) => set((s) => { s.selectedClipId = id; s.selectedFile = null; }),
    selectFile: (id) => set((s) => { s.selectedFile = id; s.selectedClipId = null; }),
    setCurrentTime: (t) => set((s) => { s.currentTime = t; }),
    setPlaying: (p) => set((s) => { s.isPlaying = p; }),

    moveClip: (clipId, deltaSecs) => {
      set((s) => {
        if (!s.timeline) return;
        for (const track of s.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            const { left, right } = _gapBounds(track.clips, clipId);
            const newStart = clamp(clip.start_s + deltaSecs, left, Math.max(left, right - clip.duration_s));
            const actualDelta = newStart - clip.start_s;
            clip.start_s = newStart;

            // Shift subtitle cue timestamps with the clip
            if (actualDelta !== 0 && clip.cues) {
              for (const cue of clip.cues) {
                cue.start_s += actualDelta;
                cue.end_s += actualDelta;
              }
            }

            // Keep the paired audio clip in sync when a subtitle clip is moved
            if (track.track_type === "subtitle" && clip.section_id && actualDelta !== 0) {
              const audioTrack = s.timeline.tracks.find((t) => t.track_type === "audio");
              if (audioTrack) {
                const audioClip = audioTrack.clips.find((c) => c.section_id === clip.section_id);
                if (audioClip) audioClip.start_s = newStart;
              }
            }
            break;
          }
        }
        _recalcDuration(s.timeline);
      });
      _scheduleSyncToBackend(get);
    },

    resizeClip: (clipId, side, deltaSecs) => {
      set((s) => {
        if (!s.timeline) return;
        for (const track of s.timeline.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            const { left, right } = _gapBounds(track.clips, clipId);
            if (side === "right") {
              const newEnd = clamp(clip.start_s + clip.duration_s + deltaSecs, clip.start_s + 0.5, right);
              clip.duration_s = newEnd - clip.start_s;
            } else {
              const newStart = clamp(clip.start_s + deltaSecs, left, clip.start_s + clip.duration_s - 0.5);
              const diff = newStart - clip.start_s;
              clip.start_s = newStart;
              clip.duration_s = clip.duration_s - diff;
            }
            break;
          }
        }
        _recalcDuration(s.timeline);
      });
      _scheduleSyncToBackend(get);
    },

    updateAudioDurations: (sectionDurations) => {
      set((s) => {
        if (!s.timeline) return;
        const audioTrack = s.timeline.tracks.find((t) => t.track_type === "audio");
        if (!audioTrack) return;

        let cursor = 0;
        for (const audioClip of audioTrack.clips) {
          const sectionId = audioClip.section_id;
          if (!sectionId) { cursor += audioClip.duration_s; continue; }

          const newDuration = sectionDurations[sectionId] ?? audioClip.duration_s;
          const oldDuration = audioClip.duration_s;
          const scale = oldDuration > 0 ? newDuration / oldDuration : 1;

          for (const track of s.timeline.tracks) {
            for (const clip of track.clips) {
              if (clip.section_id !== sectionId) continue;
              const oldClipStart = clip.start_s;
              clip.start_s = cursor;
              clip.duration_s = newDuration;
              // Scale subtitle cue timings proportionally
              if (clip.cues && clip.cues.length > 0) {
                for (const cue of clip.cues) {
                  const relStart = cue.start_s - oldClipStart;
                  const relEnd = cue.end_s - oldClipStart;
                  cue.start_s = cursor + relStart * scale;
                  cue.end_s = cursor + relEnd * scale;
                }
              }
            }
          }
          cursor += newDuration;
        }
        _recalcDuration(s.timeline);
      });
    },

    syncToBackend: async () => {
      const { timeline } = get();
      if (!timeline) return;
      try {
        await putTimeline(timeline.job_id, timeline);
      } catch (e) {
        console.error("Failed to sync timeline:", e);
      }
    },
  }))
);

/** Returns the gap [left wall, right wall] a clip can occupy without overlapping its neighbors. */
function _gapBounds(clips: Clip[], clipId: string): { left: number; right: number } {
  const clip = clips.find((c) => c.id === clipId);
  if (!clip) return { left: 0, right: 3600 };
  let left = 0;
  let right = 3600;
  for (const other of clips) {
    if (other.id === clipId) continue;
    const otherEnd = other.start_s + other.duration_s;
    // Neighbor ends at or before our start → left boundary
    if (otherEnd <= clip.start_s + 0.001) left = Math.max(left, otherEnd);
    // Neighbor starts at or after our end → right boundary
    if (other.start_s >= clip.start_s + clip.duration_s - 0.001) right = Math.min(right, other.start_s);
  }
  return { left, right };
}

function _recalcDuration(timeline: Timeline) {
  let max = 0;
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.start_s + clip.duration_s);
    }
  }
  timeline.total_duration_s = max;
}

function _scheduleSyncToBackend(get: () => TimelineState) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    get().syncToBackend();
  }, 800);
}
