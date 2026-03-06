export type JobStatus =
  | "pending"
  | "scraping"
  | "analyzing"
  | "fetching_media"
  | "generating_audio"
  | "build_timeline"
  | "ready"
  | "exporting"
  | "export_done"
  | "error";

export interface SubtitleCue {
  start_s: number;
  end_s: number;
  text: string;
}

export interface Clip {
  id: string;
  clip_type: "visual" | "audio" | "subtitle" | "voice";
  section_id: string;
  start_s: number;
  duration_s: number;
  // visual
  media_type?: string;
  local_path?: string;
  // audio
  audio_path?: string;
  // subtitle
  subtitle_text?: string;
  cues?: SubtitleCue[];
}

export interface Track {
  id: string;
  track_type: "visual" | "audio" | "subtitle" | "voice";
  clips: Clip[];
}

export interface Timeline {
  job_id: string;
  tracks: Track[];
  total_duration_s: number;
  canvas_width: number;
  canvas_height: number;
  fps: number;
}

export interface Section {
  id: string;
  heading: string;
  raw_text: string;
  category: string;
  summary: string;
  voice_script: string;
  keywords: string[];
}

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  progress: number;
  error?: string;
  sections: Section[];
  timeline?: Timeline;
  output_path?: string;
}

export interface SSEEvent {
  status: JobStatus;
  progress: number;
  timeline?: Timeline;
  error?: string;
  ping?: boolean;
}
