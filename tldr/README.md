# TLDR (MVP)

Paste an X (Twitter) post URL → fetch the thread (via X API v2 if configured) → listen to it like a podcast.

## What you get
- Dark-mode web UI (Next.js + Tailwind)
- Web playback using the browser's Speech Synthesis (play/pause/next/prev/speed/voice)
- Backend route that fetches from X API when you provide a Bearer token
- Demo Mode (paste any text) so you can test the “podcast” experience without X API access
- iPhone SwiftUI starter code (see `/ios`)

---

## Run locally

### 1) Install
```bash
npm install
```

### 2) (Optional) Add X API token
Create `.env.local`:
```bash
X_BEARER_TOKEN=YOUR_TOKEN_HERE
```

### 3) Start
```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel (quick)
1. Push this folder to GitHub
2. Import in Vercel
3. Add Environment Variable:
   - `X_BEARER_TOKEN`
4. Deploy

---

## Notes about “thread fetching”
X API access levels vary. If your plan doesn’t allow recent search or conversation_id, the app will fall back to reading only the root post and show a warning.

---

## iPhone (SwiftUI) starter
See `/ios/TLDRiOS/` for a minimal SwiftUI view that:
- accepts an X URL
- calls the web backend (`/api/thread`)
- uses `AVSpeechSynthesizer` to read segments in sequence

You can point it at:
- your local dev server on the same Wi‑Fi (use your Mac’s LAN IP)
- your deployed Vercel URL
