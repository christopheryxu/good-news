"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useTimelineStore } from "@/store/timelineStore";
import { formatTime } from "@/lib/timelineUtils";
import { getMediaUrl, getJobFileUrl } from "@/lib/api";
import SectionScript from "./SectionScript";
import type { Clip } from "@/types/timeline";

// ── Subtitle file view ────────────────────────────────────────────────────────

function SubtitleFileView() {
  const timeline = useTimelineStore((s) => s.timeline);
  const subtitleTrack = timeline?.tracks.find((t) => t.track_type === "subtitle");
  const clips = subtitleTrack?.clips ?? [];

  const handleDownload = () => {
    const lines = clips.map((c) => {
      const start = formatTime(c.start_s);
      const end   = formatTime(c.start_s + c.duration_s);
      return `[${start} – ${end}]\n${c.subtitle_text ?? ""}`;
    });
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "subtitles.txt";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full text-sm text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-gray-400" />
          <h3 className="font-semibold text-base text-gray-900">subtitles.txt</h3>
        </div>
        <button
          onClick={handleDownload}
          title="Download subtitles.txt"
          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-gray-200
        [&::-webkit-scrollbar-thumb]:rounded-full
      ">
        {clips.length === 0 ? (
          <p className="text-gray-400 text-xs">No subtitle content.</p>
        ) : (
          clips.map((clip, i) => (
            <div key={clip.id} className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-gray-400">
                {formatTime(clip.start_s)} – {formatTime(clip.start_s + clip.duration_s)}
              </span>
              <p className="text-xs text-gray-700 leading-relaxed">
                {clip.subtitle_text ?? "—"}
              </p>
              {i < clips.length - 1 && <div className="border-b border-gray-100 mt-1" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Generic markdown file view ─────────────────────────────────────────────────

function MarkdownFileView({ filename }: { filename: string }) {
  const timeline = useTimelineStore((s) => s.timeline);
  const jobId = timeline?.job_id ?? "";
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    fetch(getJobFileUrl(jobId, filename))
      .then((r) => r.ok ? r.text() : Promise.reject())
      .then((text) => { setContent(text); setLoading(false); })
      .catch(() => { setContent(null); setLoading(false); });
  }, [jobId, filename]);

  const renderMarkdown = (md: string) =>
    md.split("\n").map((line, i) => {
      if (line.startsWith("## "))
        return <p key={i} className="text-xs font-semibold text-gray-700 mt-3 mb-1 first:mt-0">{line.slice(3)}</p>;
      if (line.startsWith("- ") || line.startsWith("* "))
        return <p key={i} className="text-xs text-gray-600 leading-relaxed pl-2 before:content-['•'] before:mr-1.5 before:text-gray-400">{line.slice(2)}</p>;
      if (line.trim() === "") return null;
      return <p key={i} className="text-xs text-gray-600 leading-relaxed">{line}</p>;
    });

  return (
    <div className="flex flex-col h-full text-sm text-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-gray-400" />
          <h3 className="font-semibold text-base text-gray-900">{filename}</h3>
        </div>
        {content && (
          <a
            href={getJobFileUrl(jobId, filename)}
            download={filename}
            title={`Download ${filename}`}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Download size={14} />
          </a>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-gray-200
        [&::-webkit-scrollbar-thumb]:rounded-full
      ">
        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : content ? (
          <div className="flex flex-col gap-0.5">{renderMarkdown(content)}</div>
        ) : (
          <p className="text-xs text-gray-400">{filename} not found. Re-run the pipeline to generate it.</p>
        )}
      </div>
    </div>
  );
}

// ── Main inspector ────────────────────────────────────────────────────────────

export default function ClipInspector() {
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectedFile   = useTimelineStore((s) => s.selectedFile);
  const timeline       = useTimelineStore((s) => s.timeline);

  // File views
  if (selectedFile === "subtitles") return <SubtitleFileView />;
  if (selectedFile === "skills")    return <MarkdownFileView filename="skills.md" />;
  if (selectedFile === "brand")     return <MarkdownFileView filename="brand.md" />;

  if (!selectedClipId || !timeline) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a clip to inspect
      </div>
    );
  }

  let selectedClip: Clip | undefined;
  let trackType = "";
  for (const track of timeline.tracks) {
    const found = track.clips.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      trackType = track.track_type;
      break;
    }
  }

  if (!selectedClip) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Clip not found
      </div>
    );
  }

  const jobId = timeline.job_id;

  // Resolve file info + download URL for visual / audio clips
  let filename: string | null = null;
  let downloadUrl: string | null = null;
  if (trackType === "visual" && selectedClip.local_path) {
    filename = selectedClip.local_path.split(/[\\/]/).pop() ?? null;
    if (filename) downloadUrl = getMediaUrl(jobId, "media", filename);
  } else if (trackType === "audio" && selectedClip.audio_path) {
    filename = selectedClip.audio_path.split(/[\\/]/).pop() ?? null;
    if (filename) downloadUrl = getMediaUrl(jobId, "audio", filename);
  }

  return (
    <div className="flex flex-col h-full text-sm text-gray-900">
      <div className="flex flex-col gap-4 p-4 flex-shrink-0 border-b border-gray-100">
        {/* Title + download */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base capitalize text-gray-900">{trackType} Clip</h3>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename ?? undefined}
              title="Download file"
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download size={14} />
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400">Start</span>
            <span className="font-mono text-gray-700">{formatTime(selectedClip.start_s)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400">Duration</span>
            <span className="font-mono text-gray-700">{formatTime(selectedClip.duration_s)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-400">End</span>
            <span className="font-mono text-gray-700">
              {formatTime(selectedClip.start_s + selectedClip.duration_s)}
            </span>
          </div>
          {selectedClip.media_type && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-400">Media Type</span>
              <span className="capitalize text-gray-700">{selectedClip.media_type}</span>
            </div>
          )}
        </div>

        {filename && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">File</span>
            <span className="font-mono text-xs text-gray-500 break-all">{filename}</span>
          </div>
        )}
      </div>

      {trackType === "subtitle" && selectedClip.subtitle_text !== undefined && (
        <SectionScript
          sectionId={selectedClip.section_id}
          initialScript={selectedClip.subtitle_text}
        />
      )}
    </div>
  );
}
