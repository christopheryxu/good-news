"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Film,
  Image,
  Mic,
  FileText,
  Download,
  Check,
} from "lucide-react";
import { useTimelineStore } from "@/store/timelineStore";
import { getMediaUrl, getJobFileUrl, getAssetsZipUrl } from "@/lib/api";

type DownloadState = "idle" | "loading" | "done";

// ── Folder ────────────────────────────────────────────────────────────────────

interface FolderRowProps {
  label: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FolderRow({ label, count, children, defaultOpen = false }: FolderRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded transition-colors select-none"
      >
        {open
          ? <ChevronDown size={12} className="flex-shrink-0 text-gray-400" />
          : <ChevronRight size={12} className="flex-shrink-0 text-gray-400" />}
        {open
          ? <FolderOpen size={13} className="flex-shrink-0 text-amber-400" />
          : <Folder size={13} className="flex-shrink-0 text-amber-400" />}
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{count}</span>
        )}
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}

// ── File row ──────────────────────────────────────────────────────────────────

interface FileRowProps {
  name: string;
  icon: React.ReactNode;
  detail?: string;
  onClick?: () => void;
  downloadUrl?: string;
  onDownload?: () => void;
}

function FileRow({ name, icon, detail, onClick, downloadUrl, onDownload }: FileRowProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) { onDownload(); return; }
  };

  return (
    <div className="group flex items-center w-full px-3 py-1 rounded hover:bg-gray-50 transition-colors">
      <button
        onClick={onClick}
        className="flex items-center gap-2 flex-1 min-w-0 text-xs text-gray-600 text-left select-none"
      >
        <span className="flex-shrink-0 text-gray-400">{icon}</span>
        <span className="truncate flex-1">{name}</span>
        {detail && <span className="text-[10px] text-gray-300 flex-shrink-0">{detail}</span>}
      </button>
      {(downloadUrl || onDownload) && (
        downloadUrl ? (
          <a
            href={downloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            title="Download"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-all"
          >
            <Download size={11} />
          </a>
        ) : (
          <button
            onClick={handleDownload}
            title="Download"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-all"
          >
            <Download size={11} />
          </button>
        )
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AssetsPanel() {
  const timeline       = useTimelineStore((s) => s.timeline);
  const selectClip     = useTimelineStore((s) => s.selectClip);
  const selectFile     = useTimelineStore((s) => s.selectFile);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);

  const [dlState, setDlState] = useState<DownloadState>("idle");

  if (!timeline) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-xs">
        No assets
      </div>
    );
  }

  const jobId = timeline.job_id;
  const visualTrack   = timeline.tracks.find((t) => t.track_type === "visual");
  const audioTrack    = timeline.tracks.find((t) => t.track_type === "audio");
  const subtitleTrack = timeline.tracks.find((t) => t.track_type === "subtitle");

  const visualClips   = visualTrack?.clips  ?? [];
  const audioClips    = audioTrack?.clips   ?? [];
  const subtitleClips = subtitleTrack?.clips ?? [];

  const fmtDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  const handleDownloadAll = async () => {
    setDlState("loading");
    const a = document.createElement("a");
    a.href = getAssetsZipUrl(jobId);
    a.download = `good-news-assets-${jobId.slice(0, 8)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Give the browser a moment to start the download before resetting state
    await new Promise((r) => setTimeout(r, 800));
    setDlState("done");
    setTimeout(() => setDlState("idle"), 2500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assets</span>

        {/* Download all */}
        <div className="relative group/dl">
          <button
            onClick={handleDownloadAll}
            disabled={dlState === "loading"}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
          >
            {dlState === "idle" && <Download size={13} />}
            {dlState === "loading" && (
              <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            )}
            {dlState === "done" && <Check size={13} className="text-green-500" />}
          </button>
          {dlState === "idle" && (
            <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover/dl:opacity-100 pointer-events-none transition-opacity z-50">
              Download all
            </div>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-gray-200
        [&::-webkit-scrollbar-thumb]:rounded-full
      ">
        {/* Visual */}
        <FolderRow label="Visual" count={visualClips.length} defaultOpen>
          {visualClips.length === 0 && (
            <p className="px-3 py-1 text-xs text-gray-300">No files</p>
          )}
          {visualClips.map((clip, i) => {
            const filename = clip.local_path?.split(/[\\/]/).pop() ?? `scene-${i + 1}`;
            const isVideo  = clip.media_type === "video";
            return (
              <FileRow
                key={clip.id}
                name={filename}
                icon={isVideo ? <Film size={12} /> : <Image size={12} />}
                detail={fmtDur(clip.duration_s)}
                onClick={() => { selectClip(clip.id); setCurrentTime(clip.start_s); }}
                downloadUrl={getMediaUrl(jobId, "media", filename)}
              />
            );
          })}
        </FolderRow>

        {/* Audio */}
        <FolderRow label="Audio" count={audioClips.length} defaultOpen>
          {audioClips.length === 0 && (
            <p className="px-3 py-1 text-xs text-gray-300">No files</p>
          )}
          {audioClips.map((clip, i) => {
            const filename = clip.audio_path?.split(/[\\/]/).pop() ?? `audio-${i + 1}.mp3`;
            return (
              <FileRow
                key={clip.id}
                name={filename}
                icon={<Mic size={12} />}
                detail={fmtDur(clip.duration_s)}
                onClick={() => { selectClip(clip.id); setCurrentTime(clip.start_s); }}
                downloadUrl={getMediaUrl(jobId, "audio", filename)}
              />
            );
          })}
        </FolderRow>

        {/* Other Files */}
        <FolderRow label="Other Files" count={subtitleClips.length > 0 ? 3 : 0} defaultOpen>
          {subtitleClips.length === 0 ? (
            <p className="px-3 py-1 text-xs text-gray-300">No file</p>
          ) : (
            <>
              <FileRow
                name="subtitles.txt"
                icon={<FileText size={12} />}
                detail={`${subtitleClips.length} scenes`}
                onClick={() => selectFile("subtitles")}
                onDownload={() => {
                  const lines = subtitleClips.map((c) => {
                    const start = fmtDur(c.start_s);
                    const end   = fmtDur(c.start_s + c.duration_s);
                    return `[${start} – ${end}]\n${c.subtitle_text ?? ""}`;
                  });
                  const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href = url; a.download = "subtitles.txt";
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              />
              <FileRow
                name="skills.md"
                icon={<FileText size={12} />}
                detail="writing profile"
                onClick={() => selectFile("skills")}
                downloadUrl={getJobFileUrl(jobId, "skills.md")}
              />
              <FileRow
                name="brand.md"
                icon={<FileText size={12} />}
                detail="brand profile"
                onClick={() => selectFile("brand")}
                downloadUrl={getJobFileUrl(jobId, "brand.md")}
              />
            </>
          )}
        </FolderRow>
      </div>
    </div>
  );
}
