# Project: Oyez Oral Arguments — mobile-first listening site

A friendly, mobile-first **website** (not a native app — we avoid the App Store entirely)
for listening to US Supreme Court oral arguments on a phone. It is a nicer front-end over
**Oyez** (oyez.org), whose own mobile experience is weak. Personal, non-commercial use.

## STANDING INSTRUCTION TO MYSELF (the build journal) — NEVER SKIP

After every meaningful step, append a dated entry to **BUILD_LOG.md**, written for a smart
**non-technical** reader, covering:
1. **What we were trying to do**, in plain English.
2. **The decision/instruction that drove it** (what the user asked, or what I chose and why).
3. **What actually happened** — including dead ends and how we fixed them.
4. A short **"try-it-yourself" takeaway**.

Explain any jargon in one line the first time it appears. **Never skip an entry.**

## Hard requirements (don't regress these)
- Audio MUST keep playing when the screen locks or the user switches apps (e.g. to text).
- Real HTML5 `<audio>` element **streaming** the Oyez MP3 — do NOT download/host audio files.
- Use the **Media Session API** so the lock screen shows case name + controls.
- Ship as an **installable PWA** (add to home screen) to help iOS background audio.
- Be honest about iOS Safari limits; test the real lock-screen + texting scenario before "done".

## Data & ethics
- Source: Oyez public JSON API (api.oyez.org). Data is **CC-BY-NC** → keep it non-commercial
  and **credit Oyez visibly** in the UI.

## Stack philosophy
- Keep it simple: plain HTML/CSS/JS, mobile-first, no heavy framework unless justified.
- Prefer a build-time static index of terms/cases (audio still streamed live) over a server,
  if CORS allows. Ask before any big architectural choice.
