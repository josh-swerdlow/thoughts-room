# Thoughts Room

This is a room for you to let your thoughts flow out of your head and into the stars. You can type your thoughts into the text area and press enter to release them. You can alter the sounds and the animations to your liking.

It is completely free, open source, and lives entirely in your browser. Read, fork, or contribute on [GitHub](https://github.com/josh-swerdlow/thoughts-room).

This is a remake of the thoughts room from "The Quiet Place" project. Created by [Amitay Tweeto](https://x.com/amitayt).

The original site featured [One Day in August](https://open.spotify.com/track/4qHBvrzFbpUWeFxhdbpar8?si=7534e36c461e4320) by [Marc Teichert](https://open.spotify.com/artist/4kejsujyv9SlWKhFjRO7n4?si=E2_D4GxiT6mI4geFicdSkQ) ([Spotify](https://open.spotify.com/track/4qHBvrzFbpUWeFxhdbpar8?si=7534e36c461e4320), [Apple Music](https://music.apple.com/us/artist/marc-teichert/514192491), [Bandcamp](https://marcteichert.bandcamp.com/)). With his permission, One Day in August once again provides audio for this quiet place to reflect on your thoughts.

---

## Feature Overview

- **Floating thoughts** – Input is tokenized into words/spaces; each fragment receives randomized travel, blur, hue shift, opacity, and floor-to-sky animation values.
- **Liquid glass UI** – Navigation buttons and modal panes use translucent gradients + blur so the background remains the star.
- **Spotify music integration** – Spotify embed with play/pause controls and custom track/playlist support.
- **Live animation tuning** – A settings modal lets you adjust duration, delay, travel distances, velocity, rotation, filters, opacity ranges, and reset to defaults instantly.
- **Responsive & accessible** – Fluid typography, clamp() spacing, `min(100vh, 100dvh)` layout compensation, and keyboard-friendly modals with focus restoration.
- **Zero storage** – Everything lives in memory; reloading starts a fresh session.

---

## Directory Layout

```
thoughts-room/
├── index.html
├── animation-settings.json
├── manifest.json
├── service-worker.js
├── robots.txt
├── _headers
├── LICENSE
├── package.json
├── package-lock.json
├── pnpm-lock.yaml
├── dist/
│   ├── main.css
│   ├── main.js
│   ├── main.js.map
│   ├── Inter_24pt-Light-HQU26GS2.woff2
│   └── Inter_24pt-Regular-FSD54WEU.woff2
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
│   ├── js/
│   │   ├── main.js
│   │   └── modules/
│   │       ├── animation-config.js
│   │       ├── backgrounds.js
│   │       ├── modals.js
│   │       ├── navigation-toggle.js
│   │       ├── prompt-glow.js
│   │       ├── spotify-embed.js
│   │       ├── thought-spawner.js
│   │       ├── utils.js
│   │       └── viewport.js
│   └── fonts/
│       └── Inter-static/
│           ├── Inter_24pt-Light.woff2
│           ├── Inter_24pt-Regular.woff2
│           ├── OFL.txt
│           └── README.txt
├── images/
│   ├── desktop/
│   │   ├── hubble-m44-optimized.webp
│   │   ├── hubble-m48-optimized.webp
│   │   └── wild-duck-cluster-optimized.webp
│   ├── mobile/
│   │   ├── hubble-m44-mobile.webp
│   │   ├── hubble-m48-mobile.webp
│   │   └── wild-duck-cluster-mobile.webp
│   └── og/
│       ├── hubble-m44.webp
│       ├── hubble-m48.webp
│       └── wild-duck-cluster.webp
└── todo/
    └── todo.md
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
- `spotify-embed.js` – Spotify iframe embed integration with play/pause controls and custom track/playlist support.
- `modals.js` – open/close logic, aria attributes, focus restoration.
- `navigation-toggle.js` – handles navigation menu toggle functionality.
- `viewport.js` – viewport unit calculations and keyboard offset handling.
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

### Music setup

- Music is provided via Spotify embed. Users can add custom Spotify tracks or playlists via the music modal.
- The default track is "One Day in August" by Marc Teichert.

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
- Ensure `dist/` and `images/` directories are published with the site.
- Spotify embed requires internet connection for music playback.

---

## Credits

- Inspired by The Quiet Place Project – Thoughts Room by [Amitay Tweeto](https://x.com/amitayt)
- Star-field imagery courtesy of NASA / Hubble
- Music: [One Day in August](https://open.spotify.com/track/4qHBvrzFbpUWeFxhdbpar8?si=7534e36c461e4320) by [Marc Teichert](https://open.spotify.com/artist/4kejsujyv9SlWKhFjRO7n4?si=E2_D4GxiT6mI4geFicdSkQ) ([Spotify](https://open.spotify.com/track/4qHBvrzFbpUWeFxhdbpar8?si=7534e36c461e4320), [Apple Music](https://music.apple.com/us/artist/marc-teichert/514192491), [Bandcamp](https://marcteichert.bandcamp.com/)).
- Recreated & maintained by Josh Swerdlow (@[josh-swerdlow](https://github.com/josh-swerdlow))
