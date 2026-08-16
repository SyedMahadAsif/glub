# Glub — an interactive blob companion

A tiny jelly-like creature that lives on your screen. Built with Next.js (App Router) + Tailwind CSS.

## What it does

- **Poke it** (quick tap) — squishes happily and boops
- **Rub/tickle it** (press and wiggle in place) — giggles, gets sleepy, eventually falls asleep (zzz)
- **Drag it** — picks it up and follows your cursor, jelly-stretches with momentum
- **Throw it** — release while dragging fast and it flies, bounces off walls/floor with physics
- **Hit it hard** (4 quick taps in under a second, or one fast swipe across it) — gasps, gets scared, and sticks to the nearest edge of the screen for a few seconds before peeling off
- Ambient blinking, breathing, and cursor-tracking eyes when it's calm
- All sounds are synthesized live with the Web Audio API — no audio files needed

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Project structure

- `app/page.jsx` — renders the component
- `components/BlobCompanion.jsx` — all the physics, gestures, sound, and rendering logic
- `app/globals.css` — Tailwind directives
