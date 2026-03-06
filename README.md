# Good News

> *Paste any newsletter URL. Get a ready-to-post TikTok video.*

**Good News** turns written newsletters into short-form vertical videos — complete with an AI voiceover, stock footage or AI-generated visuals, and burned-in subtitles. The animated logo says it all: a smiley face spins and morphs into a newspaper, then back again — good news, delivered.

---

## How It Works

```
Paste URL → Analyze → Generate Media → Record Voice → Assemble → Edit → Export
```

1. **Scrape** — The newsletter URL is fetched and split into content sections (supports Substack, Beehiiv, and general HTML).
2. **Analyze** — Claude reads each section and writes a concise ≤30-second voiceover script, a scene description for visuals, and produces two artifact files:
   - `skills.md` — the author's writing style and personality profile
   - `brand.md` — brand identity, color palette, and visual style (colors extracted directly from the newsletter's HTML)
3. **Generate Media** — Each section gets a portrait (9:16) image from Google Imagen, falling back to Pexels stock video if generation fails.
4. **Record Voice** — ElevenLabs converts each section's script to natural speech audio.
5. **Assemble Timeline** — Clips, audio, and word-level subtitle cues are arranged on a timeline and persisted to disk.
6. **Edit** — A browser-based editor lets you preview the video, drag clips to reorder, trim with resize handles, inspect and edit voiceover scripts, and browse all generated assets.
7. **Export** — ffmpeg renders the timeline into a 1080×1920 MP4 with subtitles burned in.

---

## Editor

The editor opens automatically when the pipeline finishes and has three panels:

| Panel | Description |
|-------|-------------|
| **Left — Assets** | Folder tree: Visual files, Audio files, Other Files (`subtitles.txt`, `skills.md`, `brand.md`). Click any file to inspect it; hover for a per-file download. |
| **Centre — Preview + Timeline** | 9:16 video preview with live subtitle overlay. Timeline below shows Visual and Voice tracks; drag clips to shift timing, resize handles to trim. Amber playhead scrubs through the video. |
| **Right — Inspector** | Click a clip to view its details and edit the voiceover script. Click a file (subtitles, skills, brand) to read its contents and download it. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand + Immer |
| Backend | FastAPI, Python 3.11, uvicorn |
| AI — Script | Claude (`claude-opus-4-6`) |
| AI — Voice | ElevenLabs TTS |
| AI — Visuals | Google Imagen 3 (via AI Studio) → Pexels fallback |
| Render | ffmpeg (local binary) |
| Fonts | Playfair Display + Libre Baskerville (wordmark), Geist Sans (UI) |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- **ffmpeg** in PATH — `winget install ffmpeg` / `brew install ffmpeg` / `apt install ffmpeg`

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # fill in API keys (see below)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set BACKEND_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Keys

| Variable | Service | Where to get |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Claude | [console.anthropic.com](https://console.anthropic.com) |
| `ELEVENLABS_API_KEY` | ElevenLabs | [elevenlabs.io](https://elevenlabs.io) |
| `PEXELS_API_KEY` | Pexels (fallback) | [pexels.com/api](https://www.pexels.com/api/) |
| `STABILITY_API_KEY` | Google Imagen / AI Studio | [aistudio.google.com](https://aistudio.google.com) |

---

## Directory Structure

```
backend/
  app/
    main.py              # FastAPI app + CORS
    config.py            # pydantic-settings (.env loader)
    models/              # Pydantic data models (pipeline, api)
    routers/             # pipeline, timeline, media, export
    services/
      scraper.py         # HTML fetch, section extraction, brand color extraction
      claude_service.py  # voiceover scripts, writing profile, brand profile
      stability_service.py  # Google Imagen image generation
      pexels_service.py  # stock video fallback
      elevenlabs_service.py # TTS audio generation
      ffmpeg_service.py  # timeline → MP4 render
      job_store.py       # in-memory + disk job persistence, SSE pub/sub
    workers/
      pipeline_worker.py # async pipeline orchestrator
  storage/jobs/          # runtime artifacts — gitignored

frontend/
  src/
    app/                 # Next.js App Router pages + /api proxy routes
    components/
      landing/           # GoodNewsLogo, UrlInputForm, PoweredByTicker
      editor/            # EditorShell, PreviewPanel, AssetsPanel, ExportButton
        timeline/        # TimelineEditor, TrackRow, Clip, PlayheadMarker, ...
        inspector/       # ClipInspector, SectionScript, MarkdownFileView
    hooks/               # useJobStatus (SSE), usePlayback (Howler.js), useExport
    store/               # Zustand + Immer timeline state
    lib/                 # api.ts, timelineUtils.ts
    types/               # timeline.ts (mirrors Python models)
  public/logos/          # Claude, ElevenLabs, Google AI Studio SVGs
```
