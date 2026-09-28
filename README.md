# The Apprentice, rebuilt in code

A 140.8-second short film (2206×946, 25 fps) rebuilt frame for frame in code by Claude Opus 5.5 agents.

Nothing from the original film is embedded here: no frames, crops, pixels or audio. Every frame is drawn at render
time by JavaScript on a 2D canvas and finished by a WebGL grade, and the soundtrack is synthesized by a Python program.
The original was used only to measure against (positions, timing, camera moves, tone, sound levels). For some shots
those measurements go further: vector traces of source frames, rotoscoped key drawings and camera tracks are stored as
numbers in the shot's data files and painted by code. The shot table below says which method each shot uses.

The repository also builds a stacked comparison video, the recreation above the original, if you have a copy of the
original. The original is the author's own film and is not part of this repository.

- [Requirements](#requirements) · [Quickstart](#quickstart) · [How it works](#how-it-works) · [Repository map](#repository-map)
- [Shots](#shots) · [How the data was made](#how-the-data-was-made) · [How it was built](#how-it-was-built)
- [Rendering notes](#rendering-notes) · [Known gaps](#known-gaps) · [Licences](#licences) · [History](#history)

## Requirements

- **Node.js 18+** and npm. The renderer is [HyperFrames](https://github.com/heygen-com/hyperframes), run with
  `npx` at a pinned version (`hyperframes@0.8.69`). It downloads its own headless Chrome.
- **ffmpeg** and ffprobe.
- **Python 3.11**, for the soundtrack generator and the tools. `tools/requirements.txt` pins the packages.
- curl and unzip, to download the one font that cannot be redistributed (Satoshi, see [Licences](#licences)).
- Internet access: npm packages, Chrome and Satoshi (from Fontshare) on the first run. GSAP is fetched from jsDelivr
  whenever the composition loads.
- About 1 GB free for a render (the MP4 is about 600 MB).
- Optional: a copy of the original film (2206×946, 25 fps, 140.8 s), passed as `APPRENTICE_SOURCE=/path/to/original.mp4`.
  You need it only for the per-shot distance in `npm run verify`, the comparison video and the measuring tools.
  Rendering the recreation does not use it.

The film has been rendered on macOS on Apple silicon (an M4 Max) with the GPU. Other platforms should work through
HyperFrames' own GPU detection, but they have not been tried.

## Quickstart

```sh
git clone <this repository> apprentice-film && cd apprentice-film
npm run setup      # checks tools; .venv with Python packages; npm install; Chrome; downloads Satoshi
npm run render     # -> renders/film.mp4   (15–18 min on an M4 Max; one worker, see Rendering notes)
npm run verify     # gate: 3,520 frames, no black frames, no error bars
```

More:

```sh
npm run score      # regenerate audio/score.wav (~25 s; bit-identical to the committed file with the pinned packages)
npm run dev        # HyperFrames Studio preview in the browser
npm run lint       # HyperFrames lint (clean)
npm run check      # lint + runtime checks; the runtime step times out on this page (see Rendering notes)
npm run fidelity   # rebuild docs/FIDELITY.md from docs/fidelity/*.md

export APPRENTICE_SOURCE=/path/to/original.mp4
npm run verify                         # ... plus the per-shot distance to the original
npm run verify -- renders/old.mp4      # ... and flags shots that got worse than an older render
npm run compare                        # -> comparison/renders/opus-5.5-vs-original-seedance.mp4
```

`npm run setup` makes `.venv/` with Python 3.11, and the npm scripts use it through `scripts/py`. To run a tool in
`tools/` directly, activate it first (`source .venv/bin/activate`). To use your own interpreter instead, set
`PYTHON=/path/to/python` for both setup and the npm scripts.

## How it works

```
index.html ──> src/main.js ──> clock t ──> renderAt(t) ──> shot = PLAN entry covering t (src/shots/index.js)
                                                      ├──> shot.draw(ctx, t - shot.start, t) on a black 2206×946 canvas
                                                      └──> src/lib/post.js: WebGL grade ──> the visible canvas
```

- **`index.html`** is the HyperFrames composition: one `<canvas id="film">`, the score (`audio/score.wav`) as an
  `<audio>` element, the `@font-face` rules, and GSAP 3.14.2. HyperFrames renders a video by seeking the paused
  timeline registered on `window.__timelines` and capturing each frame in headless Chrome.
- **`src/main.js`**: the timeline only tweens a clock from 0 to 140.8 s. Setting the clock calls `renderAt(t)`, which:
  1. finds the shot whose span holds `t`;
  2. clears a 2D canvas to black and calls that shot's `draw`;
  3. for a shot with `xfade`, paints the previous shot underneath and fades the new one up;
  4. calls `release()` on shots the timeline has left behind (keeping the one just before, for dissolves);
  5. runs the grade.

  A shot that throws paints a red error bar instead of stopping the film; `tools/verify_render.py` looks for it.
  `main.js` also loads every font before the first frame (canvas text does not trigger `@font-face` loading) and
  exposes `window.__film.renderAt(t)` for the harnesses in `tools/harness/`.
- **`src/shots/index.js`**: `PLAN` is the shot table: id, start, end, title. The cut times were measured on the
  original. Each shot is its own module, `src/shots/<id>.js` (`s01_birdseye.js` and `s40_endcard.js` keep older
  names). A module that fails to load becomes a labelled placeholder.
- **`src/lib/post.js`**: the finishing grade, ported from the original film's own finishing pass. It adds halation,
  a filmic S-curve, a vignette, slight exposure flicker, moving grain and the final fade. It runs once per frame, after
  the shot; shots never grade themselves. A shot may tune it through `grade()`.
- **`src/config.js`** holds `W, H, FPS, DUR`. Shots import constants from here, never from `main.js` (that would
  deadlock module loading).

### The shot module contract

```js
export const shot = {
  draw(ctx, local, t) { /* local = seconds since the shot's start, t = film time */ },
  xfade: 0,                          // optional: dissolve up over the previous shot for this many seconds
  grade(local, t) { return {}; },    // optional: per-frame grade settings, e.g. { halo, grain }
  release() {},                      // optional: free cached canvases once the timeline has moved on
};
```

**`draw` is a pure function of time.** The same `t` always gives the same pixels, whatever was drawn before, because
renders may seek in any order. So there is no `Math.random`, `Date`, `performance.now`, network access or state
carried from one frame to the next. Randomness comes from seeded generators (`src/lib/rng.js`), and expensive
drawings are cached on the first call, never at module load.

### Shared libraries (`src/lib/`)

| file | what it is |
|---|---|
| `rng.js` | Seeded random numbers, hash and value noise, easing helpers (`smooth`, `span`, …). |
| `engrave.js` | The black-and-white "scratchboard" look. A `Plate` holds a grey value and a stroke direction per pixel and cuts white engraved lines whose width follows the value. |
| `ink.js`, `paths.js` | Tapered ink strokes, hatching, wobble; smooth paths, curve sampling, shape fills, caching and blitting helpers. |
| `owlInk.js` | The black-and-white owl kit (parts, poses, eye states) used by several shots. |
| `sites.js`, `sokoIll.js` | The designer's own site ("MIXING DOWN, LATE AT NIGHT.") and its hero illustration. See [`docs/soko.md`](docs/soko.md). |
| `pureimg.js`, `notecard.js` | The retro "Pure Imagination" page on the laptop and the feedback note card. See [`docs/pureimg.md`](docs/pureimg.md). |
| `hippie.js` | The finished colour site of the ending, drawn from traced geometry. See [`docs/hippie.md`](docs/hippie.md). |
| `post.js` | The WebGL grade (above). |

Most shots also have a helper folder `src/shots/<id>/` with their own drawing code and data modules. The data modules
are plain JavaScript holding numbers or compactly encoded paths (traced vectors, key drawings, tracks, fitted tone
gains). Most of them name the script that wrote them in a header comment; those scripts are in
[`tracing/`](tracing/README.md).

### The soundtrack

`tools/sound/score.py` reads a cue table, `tools/sound/cues.py`: room-tone keyframes, drones, about 570 timed events
and the chords of the colour section. It synthesizes `audio/score.wav` (48 kHz, 24-bit, exactly 140.8 s) and writes the
cue list `audio/CUES.md`. The timings and levels were measured on the original's audio; no audio from it is used.
`audio/score.wav` is committed so that a render works without Python. See [`docs/audio.md`](docs/audio.md).

## Repository map

```
index.html, hyperframes.json, meta.json   the HyperFrames composition (the film)
package.json, package-lock.json           npm scripts; puppeteer-core for tools/harness
src/                                      everything the render loads: 615 files, 113 MB
  main.js, config.js                      clock, renderAt, dissolves, fonts; frame constants
  shots/index.js                          PLAN, the shot table
  shots/<id>.js, shots/<id>/              one module per shot + its helpers and data
  lib/                                    shared drawing libraries and the grade
assets/fonts/                             fonts + LICENSES.md (Satoshi is downloaded, not committed)
audio/score.wav, audio/CUES.md            the synthesized soundtrack and its cue list (generated)
scripts/                                  setup.sh, fetch-fonts.sh, compare.sh, link-media.sh, py
tools/                                    runnable tools: sound/ (score generator), verify_render.py,
                                          harness/ (frame-exact renders), measuring and comparison tools
comparison/                               the stacked comparison video (a separate HyperFrames project)
docs/                                     STYLE.md (the agents' brief), FIDELITY.md + fidelity/ (per-shot logs),
                                          audio.md, soko.md, hippie.md, owl.md, pureimg.md
tracing/                                  the scripts that measured the original and made the data files
process/                                  the agent workflows that built the film
```

`renders/`, `snapshots/` (scratch), `comparison/media/`, `node_modules/` and `.venv/` are git-ignored.

## Shots

Status and method come from [`docs/FIDELITY.md`](docs/FIDELITY.md), which collects the first line of each shot's log in
[`docs/fidelity/`](docs/fidelity/). **close** means framing, timing, motion and look match closely. **approx** means
the same shot and staging with visibly simpler drawing. The methods:

- **drawn**: authored drawing code, with the original used only for measurements;
- **traced**: imagery built largely from geometry traced off source frames, redrawn by code;
- **mixed**: both.

The ids come from the project's shot list, so the numbering has gaps.

"Diff" is the mean absolute difference from the original, in 8-bit levels, after a σ≈4 px blur on quarter-size
frames. It was measured by `tools/verify_render.py` on a render of this code (lower is closer).

| id | time (s) | what happens | method | status | diff | code |
|---|---|---|---|---|---|---|
| s01 | 0.00–6.04 | Bird's-eye push-in over the desk | mixed | approx | 11.85 | [`s01_birdseye.js`](src/shots/s01_birdseye.js) + [`s01/`](src/shots/s01/) |
| s02 | 6.04–19.12 | The stare; pan off his face into the dark boxes; the owl on the boxes takes off and flies to him | drawn | approx | 10.90 | [`s02.js`](src/shots/s02.js) + [`s02/`](src/shots/s02/) |
| s04 | 19.12–23.12 | Owl on his shoulder; camera arcs round behind him | traced | approx | 3.73 | [`s04.js`](src/shots/s04.js) + [`s04/`](src/shots/s04/) |
| s05 | 23.12–26.72 | Over the shoulder: typing; the laptop goes from his site to Pure Imagination | drawn | approx | 12.90 | [`s05.js`](src/shots/s05.js) + [`s05/`](src/shots/s05/) |
| s06 | 26.72–29.04 | Tired, head on hand, a small smile; owl on his shoulder | traced | close | 2.34 | [`s06.js`](src/shots/s06.js) + [`s06/`](src/shots/s06/) |
| s07 | 29.04–30.56 | Over the shoulder again on Pure Imagination | traced | close | 3.47 | [`s07.js`](src/shots/s07.js) + [`s07/`](src/shots/s07/) |
| s08 | 30.56–32.60 | Screen close-up: red selection, the note card types 'This is really good' | traced | close | 4.38 | [`s08.js`](src/shots/s08.js) + [`s08/`](src/shots/s08/) |
| s09 | 32.60–33.60 | Owl close-up, the room still behind it | mixed | approx | 6.66 | [`s09.js`](src/shots/s09.js) + [`s09/`](src/shots/s09/) |
| s12 | 33.60–35.36 | The room drops away: the owl stares on black | traced | approx | 2.23 | [`s12.js`](src/shots/s12.js) + [`s12/`](src/shots/s12/) |
| s13 | 35.36–36.92 | Owl startled | drawn | approx | 4.18 | [`s13.js`](src/shots/s13.js) + [`s13/`](src/shots/s13/) |
| s14 | 36.92–40.72 | Small owl in the dark heads for a lit gap | mixed | approx | 6.04 | [`s14.js`](src/shots/s14.js) + [`s14/`](src/shots/s14/) |
| s15 | 40.72–45.72 | Corridor run through boxes and gear | mixed | approx | 21.40 | [`s15.js`](src/shots/s15.js) + [`s15/`](src/shots/s15/) |
| s16 | 45.72–47.84 | It flies into his face; tumbles by the mug; white flash | traced | close | 2.59 | [`s16.js`](src/shots/s16.js) + [`s16/`](src/shots/s16/) |
| s17 | 47.84–53.24 | Full-frame: his site, MIXING DOWN, the owl flying inside the illustration | mixed | approx | 11.36 | [`s17.js`](src/shots/s17.js) + [`s17/`](src/shots/s17/) |
| s18 | 53.24–57.32 | Close on the synth; the owl's feet on the keys | traced | close | 3.46 | [`s18.js`](src/shots/s18.js) + [`s18/`](src/shots/s18/) |
| s19 | 57.32–63.12 | Low angle: the note card propped up, the owl tumbles, dusts off, lifts it | drawn | approx | 14.23 | [`s19.js`](src/shots/s19.js) + [`s19/`](src/shots/s19/) |
| s20 | 63.12–69.44 | Wide: scissors against the speaker; the owl takes them; the smirk | drawn | approx | 21.78 | [`s20.js`](src/shots/s20.js) + [`s20/`](src/shots/s20/) |
| s21 | 69.44–74.52 | The page, framed on the screen: the owl walks in and flies up | drawn | approx | 9.41 | [`s21.js`](src/shots/s21.js) + [`s21/`](src/shots/s21/) |
| s22 | 74.52–84.04 | It cuts round the header: dashed line, outline, the strip comes loose | traced | approx | 9.27 | [`s22.js`](src/shots/s22.js) + [`s22/`](src/shots/s22/) |
| s23 | 84.04–97.08 | Carries the strip away, brings the colour banner, slaps it on, glows | drawn | approx | 10.66 | [`s23.js`](src/shots/s23.js) + [`s23/`](src/shots/s23/) |
| s24 | 97.08–100.48 | Flurry of cuts, white flash, speed lines: the owl with scissors | mixed | approx | 11.59 | [`s24.js`](src/shots/s24.js) + [`s24/`](src/shots/s24/) |
| s25 | 100.48–110.52 | The page cut into shards; the owl stands in the middle, hands on hips | drawn | approx | 12.87 | [`s25.js`](src/shots/s25.js) + [`s25/`](src/shots/s25/) |
| s26 | 110.52–117.52 | The shards blow out into colour: the finished site | traced | close | 4.83 | [`s26.js`](src/shots/s26.js) + [`s26/`](src/shots/s26/) |
| s27 | 117.52–129.30 | Pull back into the morning room; pan to him asleep; the owl on the laptop | traced | close | 6.54 | [`s27.js`](src/shots/s27.js) + [`s27/`](src/shots/s27/) |
| s28 | 129.30–136.00 | From behind the laptop: asleep, smiling, in the sun | traced | close | 4.35 | [`s28.js`](src/shots/s28.js) + [`s28/`](src/shots/s28/) |
| s40 | 136.00–140.80 | End card | mixed | close | 6.09 | [`s40_endcard.js`](src/shots/s40_endcard.js) + [`s40/`](src/shots/s40/) |

Totals: 9 shots (42.4 s) close and 17 shots (98.4 s) approx. The first 110 s are black and white, in the style of
hand-inked manga (white line on deep black); the last 30 s are in colour.

## How the data was made

[`tracing/`](tracing/README.md) holds about 5,500 scripts and small input files that measured the original and wrote
the shots' data files. They cover value studies and engraving fits, colour segmentation and ink vector tracing,
rotoscoped keys carried by optical flow, camera tracking, audio analysis, and the checks against the original.
`tracing/<shot>/README.md` pairs each data file in `src/shots/<shot>/` with the script that produced it.

These scripts are kept as they ran. They use the author's absolute paths, expect the original film and intermediate
files, and are not needed to render the film. Large generated outputs (the numbers they wrote) are not included; the
ones the film uses are in `src/`. [`tracing/MANIFEST.tsv`](tracing/MANIFEST.tsv) and
[`tracing/NOT_INCLUDED.tsv`](tracing/NOT_INCLUDED.tsv) account for every file.

## How it was built

Claude Opus 5.5 agents wrote the film, coordinated by the workflow scripts in [`process/`](process/README.md). An
interactive session first set up the composition, the tools and the first shots. Then came four workflow runs:

1. `1-build.js`: the foundations (the three websites, the owl kit, the sound design), then one
   build → review → fix → review → fix pipeline per shot. A usage limit stopped it part-way.
2. `2-continue.js`: the steps run 1 had not finished.
3. `3-ending.js`: the colour ending (s26–s28) went back to traced geometry, with the author's approval. An "ending
   critic" then reviewed 97–140.8 s, followed by targeted fixes.
4. `4-repo-cleanup.js`: this clean-up.

Every agent worked from the same brief, [`docs/STYLE.md`](docs/STYLE.md): measure the original, build, render
side-by-side pairs, fix, and log the result honestly in `docs/fidelity/<id>.md`. The prompts in the workflow scripts
are exactly what each agent was asked to do.

## Rendering notes

- **Render with one worker.** `npm run render` passes `--workers 1`. With several Chrome workers sharing the GPU, the
  heavier shots of the ending made workers lose their WebGL contexts part-way through, and the rest of each worker's
  chunk rendered black: two renders had about 2,000 black frames. One page renders the whole film cleanly.
  `node tools/harness/probe.mjs 0 140.76` checks for context loss frame by frame.
- **Time.** 15–18 minutes on an M4 Max, most of it frame capture. The generous timeouts in the render script are
  there because loading every shot module (over 100 MB of JavaScript, mostly the ending's traced data) takes a while.
- **Gate every render** with `npm run verify` (`tools/verify_render.py`). It checks for 3,520 frames, no black frames
  and no red error bars from a failing shot. With `APPRENTICE_SOURCE` it also prints the per-shot distance to the
  original, and given an older render it fails if any shot got worse by more than 0.5.
- **Deterministic.** On the same machine, a render from a clean copy of this commit was byte-identical (same SHA-256)
  to the earlier render of the same code, which the "diff" numbers above come from. Other GPUs and drivers may differ
  slightly.
- **Stills.** `node tools/harness/shoot.mjs OUTDIR 12.5,60,120` renders exact frames without HyperFrames' per-seek
  timeout. `tools/compare.sh` (render|original pairs) uses `hyperframes snapshot`, which can time out while all the
  shots load.
- **Fonts.** The end card is set in Satoshi, which `scripts/fetch-fonts.sh` downloads (part of `npm run setup`).
  Without it the film does not load: `src/main.js` loads every font before the first frame, and that load fails.
- **`npm run check`.** Lint passes with no errors or warnings. The runtime step fails with a CDP timeout
  (`Runtime.callFunctionOn` / `DOM.resolveNode timed out`) because `hyperframes check` gives the page a fixed time to
  load, and this one needs longer (raising `--timeout` and `PRODUCER_PUPPETEER_PROTOCOL_TIMEOUT_MS` did not help). The
  render itself is unaffected. `npm run lint` runs the static part alone, and `comparison/`'s check passes in full.

## Known gaps

- **Weakest shots** by measured distance from the original: s20 (21.8), s15 (21.4), s19 (14.2), s05 (12.9) and
  s25 (12.9). s15's corridor is shader drawing over measured tone, not the original's charcoal texture. The owls in
  s19, s20 and s25 are simpler drawings than the original's painterly bird.
- The colour ending (s26–s28) is close, at 4.4–6.5, because it is traced.
- 17 of 26 shots are **approx**: same staging, timing and camera, with visibly simpler drawing. Each log in
  `docs/fidelity/` lists that shot's gaps. For example, the s01→s02 cut lands one frame late, and the owl visibly
  changes drawing at the s25→s26 cut.
- s06 and s07 are dense vector traces of source frames. Their logs flag that this method needs the author's sign-off.
  The author approved traced geometry for the colour ending (s26–s28) only; see `docs/STYLE.md`.
- The soundtrack follows the original's timing and levels closely, but every sound is a physical model, so the timbres
  are approximate. See [`docs/audio.md`](docs/audio.md) (What does not match).

## Licences

- **Fonts**: see [`assets/fonts/LICENSES.md`](assets/fonts/LICENSES.md). Nine files are under the SIL Open Font
  License 1.1 and are committed. Satoshi (Indian Type Foundry, ITF Free Font License) may not be redistributed, so it is
  git-ignored, and `scripts/fetch-fonts.sh` downloads it from Fontshare, checking its SHA-256.
- **GSAP** 3.14.2 is loaded from jsDelivr when the page loads (HyperFrames inlines it at render time). It is not
  redistributed here, and its own licence applies.
- The characters (the young designer and the owl) and the websites in the film are the author's own designs.

## History

This commit is a cleaned-up tip. The full working history is in the git history before it:

- every intermediate build of every shot;
- the archived builds (`archive/`);
- the trace-script folders in their original places (`tools/trace-scripts/`), with the data files they wrote;
- the agents' development pages.

The agents' scratch folder (`snapshots/`, tens of GB of frames and renders) was never committed.
