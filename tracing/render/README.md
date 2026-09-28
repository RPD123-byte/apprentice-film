# render

Render and verification harnesses: whole-project copies used for exact-frame/timing renders, GPU diagnostics, the ending critic’s tools

Portable, cleaned-up versions of `snapshots-gpu-diag/probe.mjs`, `deps.mjs` and `snapshots-end-critic/tools/shoot.mjs` are in `tools/harness/` (no author paths; they find puppeteer-core and Chrome themselves). Also relevant, kept runnable in `tools/`: `verify_render.py` (gates a full render: black frames, error bars, per-shot distance to the source), `compare.sh` / `sidebyside.sh` / `refframe.sh` / `ending_compare.sh` / `film_sidebyside.sh`. Per-shot harnesses (a trimmed composition that renders one shot) are filed with their shot, e.g. `../s28/snapshots-end-s28-fix1-harness/`.

## Index of folders (4)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `snapshots-end-critic/` — comparison / review evidence scripts, 10 files
The ending critic (97–140.8 s): `tools/shoot.mjs` renders the real composition at chosen frames, `extract*.py` decode source and renders/film.mp4 frames by index, `tone.py` and friends measure tone/ΔE per window.

- `tools/tone.py` — Signed tone per 1-s window (every 5th frame): mean L* (NOW - SRC, BASE - SRC) on sigma-12 blurred Lab, plus contrast (std of L).
- `tools/extract.py` — Decode source and renders/film.mp4 sequentially and save the frames listed in frames.json (by index) as PNG.
- `tools/extract_all.py`
- `tools/shoot.mjs` — end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyp…

### `snapshots-gpu-diag/` — measurement / study, 2 files
GPU / WebGL-context diagnostics: `probe.mjs` loads the live composition in headless Chrome (no protocol timeout) and renders chosen times; `deps.mjs` resolves puppeteer/Chrome. Used to find why multi-worker renders went black (lost WebGL contexts) — the reason `npm run render` uses one worker.

- `deps.mjs` — end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyp…
- `probe.mjs` — end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyp…

### `scratch-build-exact/` — full project copy used for exact-frame / timing renders, 159 files
A full copy of the project as of 23 Sep (composition, src/, tools/ incl. an early tools/sound/) that `scratch-build/exact.sh` rendered to get frame-exact stills at given times; an early snapshot of every shot build.

- `src/shots/s04/keyCD2.js` — Keys C (22.04, profile to screen-left, one eye, biting the pencil) and D (22.48, profile, mouth open, the pencil pointing down-left, the arm reaching to the laptop).
- `src/shots/s04/keyCDE.js` — Keys C (22.04, profile), D (22.48, profile, arm reaching for the laptop), E (23.04, over the shoulder, typing).
- `src/shots/s04/ink2.js` — s02-style ink helpers for the arc key drawings B–D (dark ink on white, drawn on a Canvas2D, like s02's designer): variants of the strokes in s02/designer.js (copied ther…
- `src/shots/s04/keyA.js` — Key A — the front close-up (source frame 20.40, held 20.1–20.84; 19.12–20.1 is the same drawing under the pan).

### `scratch-build-timing/` — full project copy used for exact-frame / timing renders, 47 files
A second full project copy (24 Sep) used by `scratch-build/timing.sh` to time each shot’s draw() per frame (performance budget ≤ 300 ms/frame).

- `src/shots/s15/build.js` — s15 scene building: boxes, props and floor tiles -> engraved faces for the GL renderer.
- `src/shots/s05/trace.js` — s05 traced geometry, in frame pixels of the settled camera (23.48–26.72 s; the source frame is static there).
- `src/shots/s15/track.js` — s15 measured owl track (source frames): [t, bbox centre x, centre y, w, h] of the white bird (wings included, headphones and feet excluded) — snapshots/s15-study/meas/ow…
- `src/shots/s13.js` — Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…
