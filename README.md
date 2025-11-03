# Thoughts Room (Modern Remake)

Recreation of the classic “Thoughts Room” experience: a single-page, client-side sanctuary where visitors type their thoughts, release them into a cosmic sky, and watch each fragment drift away with gentle ambience. No persistence, no accounts—just a moment of quiet.

---

## Feature Overview

- **Floating thoughts** – Input is tokenized into words/spaces; each fragment receives randomized travel, blur, hue shift, opacity, and floor-to-sky animation values.
- **Liquid glass UI** – Navigation buttons and modal panes use translucent gradients + blur so the background remains the star.
- **Ambient audio** – Autoplaying background track with mute, play/pause, volume, and track-switch controls.
- **Live animation tuning** – A settings modal lets you adjust duration, delay, travel distances, velocity, rotation, filters, opacity ranges, and reset to defaults instantly.
- **Responsive & accessible** – Fluid typography, clamp() spacing, `min(100vh, 100dvh)` layout compensation, and keyboard-friendly modals with focus restoration.
- **Zero storage** – Everything lives in memory; reloading starts a fresh session.

---

## Directory Layout

```
thoughts-room/
├── index.html
├── animation-settings.json
├── dist/
│   ├── main.css
│   └── main.js
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── base/
│   │   │   ├── tokens.css
│   │   │   ├── reset.css
│   │   │   └── typography.css
│   │   ├── layout/
│   │   │   └── scene.css
│   │   ├── components/
│   │   │   ├── navigation.css
│   │   │   ├── modal.css
│   │   │   ├── music.css
│   │   │   ├── textarea.css
│   │   │   └── thoughts.css
│   │   └── utilities/
│   │       └── responsive.css
│   └── js/
│       ├── main.js
│       └── modules/
│           ├── animation-config.js
│           ├── audio.js
│           ├── backgrounds.js
│           ├── modals.js
│           ├── prompt-glow.js
│           ├── thought-spawner.js
│           └── utils.js
├── images/
├── audio/
└── package.json
```

### CSS organization

- `base/` – global design tokens (colors, spacing, motion), resets, and typography defaults.
- `layout/scene.css` – core layout (sky container, thought-input shell).
- `components/` – focused styles for UI elements (nav, thought input, modals, music controls, thoughts).
- `utilities/responsive.css` – breakpoint-specific tweaks and `prefers-reduced-motion` overrides.

### JavaScript organization

- `main.js` – entry; imports each module and boots them after DOM load.
- `prompt-glow.js` – manages the idle thought-input pulse.
- `backgrounds.js` – randomizes star-field imagery (preload + fallback).
- `animation-config.js` – loads schema, normalizes config, syncs UI sliders.
- `thought-spawner.js` – splits input strings, attaches CSS variables, schedules cleanup.
- `audio.js` – playback controls, fade-in, track selection, autoplay fallback.
- `modals.js` – open/close logic, aria attributes, focus restoration.
- `utils.js` – shared helpers (`randomBetween`, `clamp`, `ensureOrder`, etc.).

---

## Running Locally

```bash
npm install
npm run build
# or for watch mode:
npm run dev
python3 -m http.server 8000
# then visit http://localhost:8000
```

Use `npm run dev` during development to keep `dist/` updated as you edit `assets/`. Otherwise, run `npm run build` again whenever you change source files. Opening `index.html` directly also works, but some browsers block `fetch` for local JSON—serving avoids that.

### Audio setup

- Place licensed audio files in `audio/`.
- Update `<select id="music-track">` inside `index.html`; the runtime reads options to populate the menu.

### Animation settings

- Defaults live in `animation-settings.json` (mirrored inline in `index.html` for offline use).
- Adjust schema values (min/max/default/public) to expose additional sliders or change ranges.

---

## Reused Components

- **Glass buttons & modals** – share gradient + blur recipes defined in `tokens.css`, reused in `navigation.css` and `modal.css` for consistency.
- **Thought fragments** – `thought-spawner.js` and `thoughts.css` work together: JS assigns CSS variables, CSS handles animation details.
- **Settings controls** – `animation-config.js` auto-generates form controls from the schema so UI stays in sync with config.

---

## Deployment Notes

- Static-friendly (works on major static hosting platforms). Run `npm run build` before deploying so the `dist/` bundle stays current.
- Ensure `dist/`, `audio/`, and `images/` directories are published with the site.
- Autoplay policies vary; the script retries playback on first user gesture if blocked.

---

## Credits

- Inspired by [The Quiet Place Project – Thoughts Room](https://thequietplaceproject.com/thethoughtsroom)
- Star-field imagery courtesy of NASA / Hubble
- Ambient audio: “Deference for Darkness (cut)” (replace with your own licensed track as needed)
- Recreated & maintained by Josh Swerdlow
