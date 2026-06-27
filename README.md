# AEGIS — Autonomous Vehicle Guardian

An in-car AI guardian for the person who **can't call for help themselves** — driving
alone, elderly, disabled, or knocked unconscious. AEGIS continuously watches position,
motion and vehicle health; after a crash it **speaks to the driver and listens**, decides
whether they're hurt, and — if they can't respond — autonomously dispatches help with an
**AI-written medical briefing** already in the responders' hands.

Single self-contained `index.html` (Leaflet map, no build step) + a tiny zero-dependency
backend. Everything (vehicles, sensors, dispatch) is simulated for the demo.

## Features
- **3 vehicles, one owner** — pick a car from the owner's garage; the full medical profile drives the emergency response.
- **AI voice check-in** — AEGIS asks "can you hear me? are you hurt?", listens, and the AI classifies the reply as OK / distress / unresponsive.
- **AI responder briefing** — an LLM reads the crash + medical data and writes a detailed first-responder field brief (triage, injuries, medical alerts, meds, vitals, units, radio call).
- **360° surround-view evidence** captured and attached to the case on a crash.
- **Road-following GPS**, smooth turns, live telemetry, hazard alerts.

## The AI runs in three tiers (automatic)
1. **On-device Ollama** (`llama3.2`) — free & private, used in local dev.
2. **Cloud API (Anthropic)** — used when Ollama isn't reachable (e.g. on Vercel). Set `ANTHROPIC_API_KEY`.
3. **Offline templates** — built into the browser, so the app still works with no AI at all.

The API key is read on the server only and never reaches the browser.

## Run locally
```bash
# 1) (recommended) real on-device AI, free & private:
ollama serve            # then once: ollama pull llama3.2

# 2) start the app
npm start               # = node server.js  ->  http://localhost:4178
```
No Ollama? It still runs — set a cloud key in `.env` (copy `.env.example`) for real AI,
or just use the built-in offline templates.

## Deploy to Vercel
The repo is Vercel-ready: `index.html` is served statically and `api/ai-status.js` /
`api/ai-generate.js` run as serverless functions (sharing `lib/ai.js`).

1. Push to GitHub and "Import Project" in Vercel (Framework preset: **Other**, no build step).
2. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` = your key.
3. Deploy. Ollama is skipped automatically in the cloud, so the AI uses the key
   (and falls back to offline templates if it's missing).

## Project layout
```
index.html          the entire app (UI + client logic)
server.js           local dev server (static + /api/ai-* ) — not used on Vercel
lib/ai.js           shared AI logic: Ollama -> cloud -> null
api/ai-status.js    Vercel function: GET  /api/ai-status
api/ai-generate.js  Vercel function: POST /api/ai-generate
```

*Demo only — all telemetry, locations, dispatch and contacts are simulated; no real calls are placed.*
