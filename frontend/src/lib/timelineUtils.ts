export const PIXELS_PER_SECOND = 80;
export const LABEL_WIDTH = 60; // matches w-[60px] in TrackRow

export function secondsToPixels(seconds: number, pps = PIXELS_PER_SECOND): number {
  return seconds * pps;
}

export function pixelsToSeconds(pixels: number, pps = PIXELS_PER_SECOND): number {
  return pixels / pps;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
