from __future__ import annotations
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Callable

from ..models.pipeline import Timeline, Clip

# Resolve ffmpeg/ffprobe — check PATH first, then known WinGet install location
_WINGET_BIN = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"

def _find_bin(name: str) -> str:
    # 1. Try PATH
    found = shutil.which(name)
    if found:
        return found
    # 2. Try WinGet install (Gyan build)
    for pkg in _WINGET_BIN.glob("Gyan.FFmpeg_*/ffmpeg-*-full_build/bin"):
        candidate = pkg / f"{name}.exe"
        if candidate.exists():
            return str(candidate)
    # 3. Fallback (will raise FileNotFoundError at runtime if missing)
    return name

FFMPEG = _find_bin("ffmpeg")
FFPROBE = _find_bin("ffprobe")

log = logging.getLogger(__name__)


def _run(cmd: list[str], log_path: Path | None = None, **kwargs) -> subprocess.CompletedProcess:
    """Run a subprocess and optionally write stderr to a log file."""
    result = subprocess.run(cmd, capture_output=True, **kwargs)
    if result.returncode != 0:
        stderr = result.stderr.decode(errors="replace")
        print(f"[ffmpeg ERROR rc={result.returncode}] cmd: {' '.join(cmd[:8])}")
        print(f"[ffmpeg stderr]\n{stderr[-2000:]}")  # last 2000 chars
        log.error("ffmpeg failed (rc=%d): %s\nstderr:\n%s", result.returncode, cmd[:8], stderr)
        if log_path:
            log_path.write_text(f"CMD: {' '.join(cmd)}\n\nSTDERR:\n{stderr}", encoding="utf-8")
    return result


def render_timeline(
    timeline: Timeline,
    output_path: Path,
    on_progress: Callable[[int], None] | None = None,
) -> tuple[bool, str]:
    """Render the timeline to an MP4 using ffmpeg CLI."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    visual_clips = _get_clips(timeline, "visual")
    voice_clips = _get_clips(timeline, "voice")
    # Fall back to legacy separate tracks if no voice track exists
    audio_clips = voice_clips if voice_clips else _get_clips(timeline, "audio")
    subtitle_clips = voice_clips if voice_clips else _get_clips(timeline, "subtitle")

    if not visual_clips:
        return False, "No visual clips found in timeline"

    # Build SRT file
    srt_path = output_path.parent / "subtitles.srt"
    _write_srt(subtitle_clips, srt_path)

    # Build video using ffmpeg concat
    log_path = output_path.parent / "ffmpeg_error.log"
    success, error = _render_ffmpeg(
        visual_clips, audio_clips, srt_path, output_path, timeline, log_path, on_progress
    )
    return success, error


def _abs(p: str) -> str:
    """Resolve a potentially-relative path to an absolute POSIX path."""
    path = Path(p)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path.as_posix()


def _get_clips(timeline: Timeline, clip_type: str) -> list[Clip]:
    for track in timeline.tracks:
        if track.track_type == clip_type:
            return sorted(track.clips, key=lambda c: c.start_s)
    return []


def _write_srt(subtitle_clips: list[Clip], srt_path: Path) -> None:
    lines = []
    idx = 1
    for clip in subtitle_clips:
        if not clip.cues:
            continue
        for cue in clip.cues:
            lines.append(str(idx))
            lines.append(f"{_ts(cue.start_s)} --> {_ts(cue.end_s)}")
            lines.append(cue.text)
            lines.append("")
            idx += 1
    srt_path.write_text("\n".join(lines), encoding="utf-8")


def _ts(s: float) -> str:
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    ms = int((s - int(s)) * 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def _render_ffmpeg(
    visual_clips: list[Clip],
    audio_clips: list[Clip],
    srt_path: Path,
    output_path: Path,
    timeline: Timeline,
    log_path: Path,
    on_progress: Callable[[int], None] | None = None,
) -> tuple[bool, str]:
    """Build ffmpeg command with concat demuxer."""
    def report(pct: int):
        if on_progress:
            on_progress(pct)

    print(f"[export] FFMPEG={FFMPEG}")
    print(f"[export] visual={len(visual_clips)} audio={len(audio_clips)} srt={srt_path}")
    n_clips = max(1, len(visual_clips))
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # 1) Encode each visual clip — accounts for 0–72% of progress
        segment_paths: list[Path] = []
        for i, clip in enumerate(visual_clips):
            seg_path = tmp / f"seg_{i:04d}.mp4"
            ok, err = _encode_visual_clip(clip, seg_path, timeline, log_path)
            if ok:
                segment_paths.append(seg_path)
            else:
                log.warning("Skipping clip %s: %s", clip.id, err)
            report(int((i + 1) / n_clips * 72))

        if not segment_paths:
            return False, "All visual clip encodes failed — check ffmpeg_error.log"

        # 2) Concat video segments — 75%
        concat_list = tmp / "concat.txt"
        lines = [f"file '{p.as_posix()}'\n" for p in segment_paths]
        concat_list.write_text("".join(lines))

        video_only = tmp / "video_only.mp4"
        cmd_concat = [
            FFMPEG, "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            str(video_only),
        ]
        if _run(cmd_concat, log_path).returncode != 0:
            return False, "Video concat step failed — check ffmpeg_error.log"
        report(75)

        # 3) Build audio concat — 82%
        audio_paths = [_abs(c.audio_path) for c in audio_clips if c.audio_path]
        audio_only: Path | None = None
        if audio_paths:
            audio_concat_list = tmp / "audio_concat.txt"
            audio_lines = [f"file '{p}'\n" for p in audio_paths]
            audio_concat_list.write_text("".join(audio_lines))
            audio_only = tmp / "audio_only.aac"
            cmd_audio = [
                FFMPEG, "-y",
                "-f", "concat", "-safe", "0",
                "-i", str(audio_concat_list),
                "-c:a", "aac", "-b:a", "192k",
                str(audio_only),
            ]
            if _run(cmd_audio, log_path).returncode != 0:
                audio_only = None  # proceed without audio rather than failing
        report(82)

        # 4) Mux video + audio + subtitles
        final_inputs = ["-i", str(video_only)]
        if audio_only and audio_only.exists():
            final_inputs += ["-i", str(audio_only)]

        subtitle_filter = ""
        if srt_path.exists() and srt_path.stat().st_size > 10:
            # Copy SRT into temp dir — avoids spaces/special chars in the original path
            # which break ffmpeg's subtitles filter parser on Windows.
            srt_tmp = tmp / "subtitles.srt"
            shutil.copy2(srt_path, srt_tmp)
            # Escape only the colon after the drive letter (e.g. C: → C\:)
            srt_escaped = srt_tmp.as_posix().replace(":", "\\:")
            subtitle_filter = f"subtitles='{srt_escaped}':force_style='FontSize=18,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'"
            print(f"[ffmpeg] SRT filter path: {srt_escaped}")

        video_filter = (
            f"scale={timeline.canvas_width}:{timeline.canvas_height}"
            f":force_original_aspect_ratio=decrease,"
            f"pad={timeline.canvas_width}:{timeline.canvas_height}:(ow-iw)/2:(oh-ih)/2"
        )
        if subtitle_filter:
            video_filter += f",{subtitle_filter}"

        cmd_final = (
            [FFMPEG, "-y"]
            + final_inputs
            + [
                "-vf", video_filter,
                "-c:v", "libx264", "-preset", "fast",
                "-b:v", "4000k", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                "-r", str(timeline.fps),
            ]
        )
        if audio_only and audio_only.exists():
            cmd_final += ["-c:a", "aac", "-b:a", "192k", "-map", "0:v", "-map", "1:a"]
        cmd_final += [str(output_path)]

        report(85)  # final mux starting
        result = _run(cmd_final, log_path)
        if result.returncode != 0:
            return False, "Final mux step failed — check ffmpeg_error.log"
        report(100)
        return True, ""


def _encode_visual_clip(clip: Clip, output: Path, timeline: Timeline, log_path: Path) -> tuple[bool, str]:
    abs_path = _abs(clip.local_path) if clip.local_path else None
    print(f"[export] encoding clip {clip.id} type={clip.media_type} path={abs_path}")
    if not abs_path or not Path(abs_path).exists():
        msg = f"File not found: {abs_path}"
        print(f"[export ERROR] {msg}")
        return False, msg

    w, h = timeline.canvas_width, timeline.canvas_height
    duration = clip.duration_s

    if clip.media_type == "video":
        cmd = [
            FFMPEG, "-y",
            "-i", abs_path,
            "-t", str(duration),
            "-vf", f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}",
            "-c:v", "libx264", "-preset", "fast", "-an",
            "-r", str(timeline.fps),
            str(output),
        ]
    else:
        # Image: Ken Burns zoom
        frames = int(duration * timeline.fps)
        cmd = [
            FFMPEG, "-y",
            "-loop", "1",
            "-i", abs_path,
            "-t", str(duration),
            "-vf", (
                f"scale={w*2}:{h*2},"
                f"zoompan=z='min(zoom+0.0015,1.5)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={timeline.fps}"
            ),
            "-c:v", "libx264", "-preset", "fast", "-an",
            "-r", str(timeline.fps),
            str(output),
        ]

    result = _run(cmd, log_path, timeout=120)
    if result.returncode != 0:
        return False, result.stderr.decode(errors="replace")[:200]
    return True, ""
