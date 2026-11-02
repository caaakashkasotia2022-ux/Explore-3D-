# Explore3D

**Explore Everything. Understand Anything. In 3D.**

An interactive 3D learning platform: explore the human body, cars, an engine, a motorcycle and a building through
exploded views, cutaways, guided animations and AI-powered explanations — or upload your own image or 3D file.

## Quick start

```bash
npm install
npm run dev          # web on http://localhost:5173, API on http://localhost:8787
```

To enable AI image analysis and the AI tutor, give the API server Claude credentials before starting it:

```bash
# PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
# bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Without credentials everything else still works; uploads fall back to an offline analysis + estimated relief model,
and the AI tutor explains that it is unavailable.

Production build: `npm run build && npm start` (Express serves `dist/` and the API on one port, `PORT`, default 8787).

## Deploying to Vercel

1. Import the GitHub repo at <https://vercel.com/new> (framework preset: **Vite**, detected from `vercel.json`).
2. In **Settings → Environment Variables** add `ANTHROPIC_API_KEY` (optional `CLAUDE_MODEL`).
3. Deploy. Every push to `main` redeploys automatically; pull requests get preview URLs.

On Vercel the site runs the frontend plus the serverless functions in `api/` (`/api/health`, `/api/analyze`,
`/api/explain`). Vercel has no persistent disk, so **accounts and server-side image storage are switched off**
there: projects are saved in the visitor's browser, and uploaded images are analysed directly without being stored.
For accounts and cloud-saved projects, run the full Node server (`npm start`) on a host with a disk
(Render, Railway, Fly.io, a VPS) or replace SQLite / local files with a hosted database and object storage.

> The AI endpoints spend your Anthropic credits. Set a monthly spend limit in the Anthropic Console and consider
> Vercel's firewall rate-limiting; the built-in limiter is per function instance only.

## Features

| Area | What you get |
|------|--------------|
| 3D viewer | PBR materials, studio lighting, soft shadows, rotate / pan / zoom (mouse, touch, keyboard), 360° auto-rotate, full screen |
| Exploded views | Animated explode / assemble along per-part assembly vectors, slider or one click |
| Inspection | Click / double-click to select & focus, glowing highlight, callout labels, transparency (X-ray), isolate, section / cutaway on X/Y/Z, show/hide parts and systems, layer presets |
| Learning | Per-part: what it is, location, purpose, how it works, connections (clickable), examples, advanced technical detail, key facts; AI tutor for follow-up questions |
| Motion | Working mechanisms (pistons, crank, cams, wheels, chain, heartbeat, breathing, lift), guided step-by-step tours, construction-sequence animation, scroll-driven exploded engine on the homepage |
| Buildings | Floor-by-floor view and stage-by-stage construction animation |
| Upload | JPG/PNG/WEBP → secure upload → Claude vision analysis (objects, components, bounding boxes) → annotated 2D view + clearly-labelled *estimated* 2.5D model + best library match; graceful offline fallback |
| 3D files | Open your own GLB / GLTF / OBJ — every mesh becomes an explorable component |
| Projects | Save camera, explode, visibility, selection and section state; stored in the browser, or in your account when signed in |

### Keyboard
`←↑→↓` rotate · `W A S D` pan · `+`/`−` zoom · `E` explode · `T` transparency · `L` labels · `H` hide selected ·
`Enter` focus selected · `R` reset camera · `F` full screen · `Space` play/pause · `Esc` deselect

## Architecture

```
src/
  models/          Model data (one file per model) + registry. See models/SCHEMA.md
  three/           Geometry builder (shape specs → BufferGeometry), materials, highlight shader
  components/
    viewer/        Viewer3D (canvas/scene), Part (explode, anims, highlight, picking),
                   Workspace, ControlDock, ComponentList, InfoPanel, StepsBar, FloorPanel
    ModelPreview   Lightweight auto-rotating previews (homepage cards & scroll story)
  lib/             API client, camera helpers, projects, image → 2.5D model, GLB/OBJ import
  pages/           Home, Category, Explore, Upload, Projects, About
  store/           zustand stores (viewer state is read per-frame without re-rendering)
server/
  index.js         Express API: uploads, analysis, explanations, projects, static hosting
  ai.js            Claude (claude-opus-5-5) vision analysis with JSON-schema output + tutor
  auth.js          Email/password accounts (scrypt), bearer sessions
  db.js            SQLite via node:sqlite (Node ≥ 22.5)
scripts/
  validate-models.mjs   Checks every model: ids, info fields, links, geometry, triangle budget
```

Built-in models are procedural (generated from primitive shapes in code), so they load instantly with no asset
downloads, and each one is a single data file you can extend. To use an artist-made GLB instead, open it via
**Upload → Open 3D file**, or convert it with `src/lib/fileModel.js` and add explanations.

### Production notes
- Swap `server/storage/uploads` for object storage (S3 / R2 / GCS) and SQLite for Postgres; both are isolated in
  `server/index.js` and `server/db.js`.
- The rate limiter is in-memory; use Redis or your gateway's limiter when running several instances.
- AI model is configurable with `CLAUDE_MODEL`; refusals are handled with server-side fallbacks.

## Accuracy
Models are educational simplifications. Image-based 3D models are estimates from a single photo and are labelled
as such. Not for medical, safety-critical or engineering decisions.
