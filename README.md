# The Quiet Place (shhhh.space)

Recreation of the classic “Quiet Place / Thoughts Room” experience: a single-page, static site where visitors can exhale their thoughts into a star-soaked sky and watch each word drift away while gentle ambience plays. Everything runs client-side for an anonymous, ephemeral moment of calm.

## What you’ll find

- **Starfield sanctuary** – A full-viewport Milky Way backdrop randomly chosen from the `/images` collection each visit.
- **Thoughts drift mechanic** – Type into the glassy bottom bar and press `Enter`; every word floats upward, fading per-letter with randomized velocity, blur, colour shift, and opacity.
- **Background score** – Autoplayed looping audio (`/audio/the-quiet-place.mp3`, add your own licensed track to ship).
- **Onboarding prompt** – The textarea starts with a soft invitation that releases itself as the first floating thought.
- **Interactive tuning** – A client-side settings palette that lets you tweak animation duration (in seconds), travel distances, velocity spread, rotation, scale, filters, opacity ranges, and removal timing without touching the code.
- **Zero persistence** – No backend, no analytics, no storage.

## Project structure

```
/
├── index.html          # Page markup, moonless sky scene, settings dialog scaffold
├── style.css           # Gradient night theme, floating thought animation, settings UI styles
├── main.js             # Thought spawning logic, audio fade-in, prompt handling, settings bindings
├── images/             # Starfield assets (background.jpg, hubble-m44.webp, hubble-m48.webp, wild-duck-cluster.webp)
└── audio/              # Expected location for the-quiet-place.mp3 (not included; provide your own)
```

## Local usage

1. Place a licensed MP3 at `audio/the-quiet-place.mp3`.
2. Open `index.html` in any modern browser (or serve statically with `python3 -m http.server`).
3. Start typing; press `Enter` to release a thought. The onboarding prompt disappears the moment you focus or type.
4. Tap **settings** (top-right) to adjust animation behaviour live:
   - Duration base / randomness
   - Word launch delay window
   - Vertical and horizontal travel
   - Velocity & scale ranges
   - Rotation limits
   - Blur / hue shift ranges
   - Opacity start/end windows
   - Removal buffer & fallback time
   - Reset anytime to return to the defaults captured in code.

All configuration is held in memory; reload resets the experience.

## Deployment notes

- Built to deploy as-is on static hosts (Cloudflare Pages, Vercel, Netlify). No build step required.
- Ensure the `/audio` and `/images` assets are published with the site.
- Autoplay policies vary; on first interaction the script attempts playback and gracefully re-tries after a user gesture if blocked.

Take a minute, type what you need, let the stars do the rest. 🪶
>>>>>>> master
