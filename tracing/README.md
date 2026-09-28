# tracing/ — how the numbers in `src/` were made

The film renders from code alone: `index.html` → `src/main.js` → `src/shots/*.js`. Many shots draw from **data
files**: measured positions and timings, camera tracks, value studies, rotoscoped key drawings, vector traces of
source frames, fitted tone gains. These files are stored as numbers and paths, never as pixels. This folder holds the
**provenance code**: the scripts that measured the source film and wrote those data files, plus the harnesses and
metrics the agents used to check their work against the source. The render never loads anything from `tracing/`.

About 5,500 files were collected from four places: `src/` (trace folders next to the shot data), `tools/trace-scripts/`,
`archive/prev-builds/`, and the agents' scratch folders. Each distinct file is here once, apart from 146 small helpers
kept a second time so imports still resolve (see [Index files](#index-files)). The workflows that ran the agents are in
[`../process/`](../process/README.md).

**Quick answer to “how was sNN's data made?”** Open [`sNN/README.md`](#by-shot). Its first table pairs the shot's data
files in `src/shots/sNN/` with the scripts that wrote them. Most pairs come from the data files' own header comments,
which name their generator; the rest come from output paths found in the scripts.

## Before you try to run anything

These scripts are kept **as they ran**, not as a polished toolkit:

- **They use absolute paths from the author's machine.** Typical ones are the project folder
  (`/Users/computer/rootline/apprentice-film`), the source film
  (`/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4`), and the agents' scratch folders
  (`/private/tmp/claude-501/.../scratchpad/...`). Constants such as `ROOT`, `SRC`, `SP`, `REF`, `FR` and `D` are set near
  the top of each script. Edit them before you run it.
- **They need the source film, which is not in this repository.** Put your copy's path in `APPRENTICE_SOURCE`
  (2206×946, 25 fps, 140.8 s) and point each script's source constant at it. Several scripts refer to the source's own
  finishing grade (`finish2.py`), which is not redistributed either (see [`../process/`](../process/README.md)). The same
  grade is implemented by `src/lib/post.js`, and its Python inverses are here (`grade.py`, `ungrade.py`).
- **They expect intermediate files made by earlier steps.** Examples are source frames decoded to PNG
  (`ffmpeg -i "$APPRENTICE_SOURCE" …` or `tools/refframe.sh`), render/source pairs from `tools/compare.sh`, and
  `*.json` specs and masks. The pixel intermediates were never kept, and neither were most generated outputs. Small input
  specs *are* included. The scripts' comments and usage lines say what each step reads and writes.
- **Dependencies.** Python 3 with `numpy`, `opencv-python`, `scipy` and `scikit-image` (a few also use `matplotlib`,
  `Pillow`, `fontTools`, `soundfile`/`librosa`, `scikit-learn`, `numba`, `playwright`). Node 22.12+ with
  `puppeteer`/`puppeteer-core` for the headless render harnesses.
- A folder keeps the layout it had where it was found, so scripts that import each other still sit side by side. Harness
  folders ran with `src/` and `assets/` **symlinked** next to them. Those links were not copied, so link the repo's own
  folders back in to use them.
- **Old page text.** The Pure Imagination page's date and city line was a real event's until 2026-09-28. The film now
  draws invented text (`PURE_DATE` in `src/lib/pureimg.js`, see [`../docs/pureimg.md`](../docs/pureimg.md)). The
  old strings were also replaced with the invented ones in the 17 archived copies here that contained them (older
  copies of `s05/pure.js`, `s07/page.js` and `s08.js`, s08's `glyphedges.py` and `boxes.py`, and
  `s08/trace-scripts-s08-dev/fonts*.html`) and in the git history. That text swap is the only edit made to archived
  copies; nothing in them is rendered.

## How the pipeline works

Every agent followed the same loop ([`docs/STYLE.md`](../docs/STYLE.md)): **measure the source → build → render and compare → fix**. The
measuring side used a handful of methods.

**0. Measuring in the right units.** The source has a finishing grade on top: halation, an S-curve, vignette, flicker
and grain. `src/lib/post.js` re-applies that grade to every frame. The trace scripts therefore invert it first, so they
measure the values a shot must *draw*. See `s04/src-s04/trace/grade.py` (a Python port of post.js and its inverse) and
`hippie/trace-scripts-f2k-tools/ungrade.py`. The basic viewers are kept runnable in `tools/`: `grid.py` (a labelled
coordinate grid on a source frame), `strip.py` (tiles over time), `refframe.sh` and `camtrack.py`.

**1. Value studies + engraving (the drawn and mixed black-and-white shots).** The source is blurred and sampled into
value tables and light/shade fits: region means, fitted Gaussian light blobs, per-painter tone gains. These are painted
into an engraving `Plate` (`src/lib/engrave.js`), which holds a grey value plus a stroke direction for each surface and
cuts white lines whose width follows the value. The work is tuned by comparing blurred errors. Examples:
`s12/src-s12/trace/tone_fit.py`, `s02/src-s02/hand/trace/tone_fit.py`, `s05/snapshots-s05-fix1d-study/fitfield.py`,
`s13/snapshots-s13-fix1-tools/tonefit.py`, `s20/snapshots-s20-b3-tools/tonecal.py`.

**2. Vector tracing: colour segmentation + ink extraction (the traced shots, the traced layers of the mixed shots, and the
colour site).** The steps are:

- un-grade the source frame;
- split it into colour classes or posterised value levels (k-means palettes);
- clean and smooth the regions, and simplify their contours to sub-pixel polygons with median colours;
- extract the ink separately (black-hat / Hessian ridges → hysteresis → skeleton → centre lines with a width and a
  darkness per point);
- encode everything compactly (delta-coded, zig-zag varints, base64) into JS data modules that the shot paints.

Examples: `hippie/trace-scripts-f2k-tools/trace.py` (see its `README.txt`), `s06/src-s06/trace3/trace3.py`,
`s18/src-s18/trace2/`, `s23/scratch-build-s23g/`, `s25/snapshots-s25-tools/extract3.py`,
`s26/snapshots-end-s26-fix3-tools/pagetrace.py`, `s27/trace-scripts-s27-k-tools/room_vec.py` + `codec.py`,
`s28/snapshots-s28t-tools/retrace_fig.py`.

**3. Rotoscoped keys + optical flow.** A few key frames are traced in full, as a value study plus ink. Measured optical
flow (DIS, smoothed and sampled on a grid) carries each key to its neighbouring frames, and held frames are recorded as
holds. Examples:

- s04: `s04/src-s04/trace/` runs `trace_key.py` → `flow_key.py` → `tojs_d.py`, which writes `src/shots/s04/tk/`; see
  its `README.md`.
- s15: `s15/snapshots-s15-p4/` holds the corridor's box-face quads per source frame (`roto/*.txt`). In `tools/`,
  `prop.py` carries a frame's quads to the next one with a RANSAC affine fit of the optical flow over each face,
  `build.py` fits each face's corner brightness and writes `src/shots/s15/roto<NAME>.js`, and `refine.py` adds
  source-minus-render corrections.
- Others: `s06/src-s06/trace/flowgrid.py`, `s13/snapshots-s13-fix1-tools/gen_flow.py`, and the s27/s28 keys (a trace
  every few frames, carried by flow).

**4. Camera tracking.** Similarity or homography tracks (ORB/SIFT + RANSAC, ECC) are chained frame to frame, with
measured zoom fixed points. 3D moves use plane tracks, structure-from-motion landmarks and depth grids. Examples:
`tools/camtrack.py` (runnable; an early copy is `common/scratch-build/camtrack.py`), `s01/trace-scripts-s01-fix2-meas/fulltrack.py`,
`s04/src-s04/trace/screen_track.py`, `s08/snapshots-s08-p4-tools/`, `s15/trace-scripts-s15-sfm/`, and
`s28/trace-scripts-s28-tools/` (`fitcam.py`, `planetrack.py`, `homchain.py`, `depthgrids.py`, `billboards.py`).

**5. Audio analysis → cue table.** The source audio was analysed only: loudness envelopes, onsets, band floors and
pitches. The findings were written into a cue table, `tools/sound/cues.py`, and `tools/sound/score.py` synthesizes
`audio/score.wav` from it. That code stays runnable in `tools/sound/`; see [`sound/README.md`](sound/README.md).

**6. Verification.** Every change was checked against the source:

- render|source pairs (`tools/compare.sh`) and motion sheets (`tools/sidebyside.sh`);
- blurred mean-abs-diff at σ4/σ12, ΔE76 on blurred Lab, and silhouette IoU;
- determinism checks: the same time must render to the same pixels.

Most folders named `*-harness`, `*-h`, `*-final` or `*-cmp` hold these checks for one shot. Headless renders of a
trimmed composition run on puppeteer or playwright. The whole-film tools are in [`render/`](render/README.md). The gate
for a full render stays in `tools/verify_render.py`.

## Layout

```
tracing/<group>/<origin>/<original relative path>
```

**Groups** are the shot ids s01…s28 and s40, plus five foundations and two general groups:

- `soko`: F1, the sōko page;
- `hippie`: F2, the colour site;
- `pureimg`: F3, the Pure Imagination page and note card;
- `owl`: F4, the owl kit;
- `sound`: F5;
- `render`: whole-film render and verification harnesses;
- `common`: shared helpers.

**Origins** say where a folder was found:

| origin prefix | found in | what it is |
|---|---|---|
| `src-sNN/`, `src-lib/` | `src/shots/sNN/…`, `src/lib/…` | trace and measurement code that sat next to the shot data but is not loaded by the render; includes older unused shot builds (`legacy/`, `v1/`, `handbuilt/`, `retired/`) |
| `trace-scripts-<name>/` | `tools/trace-scripts/<name>/` | tool folders copied out of the scratch area (`snapshots/`) when the project was first committed |
| `prev-builds-<name>/` | `archive/prev-builds/<name>/` | earlier builds of a shot that a later pass replaced; the `.md` beside each says what it was |
| `tools-dev-pages/` | `tools/*.html` | scratch HTML test pages (engraving, owl gallery, sōko page) |
| `snapshots-<name>/` | `snapshots/<name>/` | the per-pass scratch folders the agents wrote (`<shot>-<pass>-tools`, `-meas`, `-lab`, `-harness`/`-h`, `-orig`/`-prev` = the build before a pass, `-final` = after it, `end-*` = the ending run); the code only, the frames and renders were not kept |
| `scratch-build*/` | the build session's agent scratchpad | loose scripts from run 1 (and the interactive set-up before it); sorted into shots by which agent wrote or used each file, read from the agents' transcripts |
| `scratch-ending*/` | the continuation + ending session's scratchpad | loose scripts from runs 2–3, sorted the same way |

`tools/trace-scripts/`, `archive/` and the `tools/*.html` pages no longer exist at the tip of the repository: their code
is here, and the original folders (with their data files) are in the git history.

`render/scratch-build-exact/` and `render/scratch-build-timing/` are full copies of the project from 23–24 Sep. They were
used for frame-exact renders and draw-time measurements, and they preserve an early state of every shot.

## By shot

Method is from [`docs/FIDELITY.md`](../docs/FIDELITY.md): **drawn** = authored drawing code, with the source used for measurements only;
**traced** = the imagery comes largely from geometry traced off source frames; **mixed** = both.

| shot | time (s) | method | start here |
|---|---|---|---|
| [s01](s01/README.md) | 0.00–6.04 | mixed | `trace-scripts-s01-fix2-meas/` (hand poses by ridge maps, `fulltrack.py` arm track), `trace-scripts-s01-fix2x-meas/` (sleeve fold strokes: `trace.py` → `link.py` → `emit.py`) |
| [s02](s02/README.md) | 6.04–19.12 | drawn | `src-s02/hand/` (the drawn build's measurements: `trace/tone_fit.py` value corrections, `trace/wingtips.py` owl track, fits; see its `README.md`), `src-s02/trace/` (the earlier traced build's tracers, README) |
| [s04](s04/README.md) | 19.12–23.12 | traced | `src-s04/trace/` (rotoscope keys: `trace_key.py`, `flow_key.py`, `tojs_d.py`; README), `trace-scripts-s04-k2/tr/` (owl face, eyes, masks) |
| [s05](s05/README.md) | 23.12–26.72 | drawn | `src-s05/trace/` (settle fit, README), `snapshots-s05-fix1d-study/` (`fitfield.py`, `fitfaces.py`), `snapshots-s05-fix2-study/` |
| [s06](s06/README.md) | 26.72–29.04 | traced | `src-s06/trace3/` (`trace3.py`, `layers_r3.py`, `fit.py`; README), `src-s06/trace/` (`flowgrid.py`, mouth) |
| [s07](s07/README.md) | 29.04–30.56 | traced | `src-s07/trace/` (`prep.py`, `hands.py`), `src-s07/tools/` (`handlines.py`, `glyphs.py`), `trace-scripts-s07-p2-dev/` |
| [s08](s08/README.md) | 30.56–32.60 | traced | `trace-scripts-s08-fix1-tools/` (ornaments, card, ribbons), `trace-scripts-s08-f3-tools/` (camera drift, text and caret timing) |
| [s09](s09/README.md) | 32.60–33.60 | mixed | `src-s09/trace/` (hair and cheek traces), `trace-scripts-s09-fix1-meas/`; the owl comes from s12 |
| [s12](s12/README.md) | 33.60–35.36 | traced | `src-s12/trace/` (owl traces: `trace_snap.py`, `trace_region.py`, eyes, beak, headphones, `tone_fit.py`; README) |
| [s13](s13/README.md) | 35.36–36.92 | drawn | `src-s13/trace/` (outlines, cel specs; README), `snapshots-s13-fix1-tools/` (flow, tone, zones) |
| [s14](s14/README.md) | 36.92–40.72 | mixed | `src-s14/trace3/` (tone, face gains, gap light; README), `src-s14/trace/` (`owlpose2.py`) |
| [s15](s15/README.md) | 40.72–45.72 | mixed | `snapshots-s15-p4/tools/` (roto box faces), `trace-scripts-s15-sfm/` (landmark tracks), `trace-scripts-s15-ov/` (face corners and light) |
| [s16](s16/README.md) | 45.72–47.84 | traced | `src-s16/trace/` (owl, steam, room, desk, mug, shirt, hair…; README) |
| [s17](s17/README.md) | 47.84–53.24 | mixed | `src-s17/trace/` (silhouettes, steam, wings), `snapshots-s17-fix1x-lab/` (hair, silhouette fill), `trace-scripts-s17-lab/` (owl rig fitting lab) |
| [s18](s18/README.md) | 53.24–57.32 | traced | `src-s18/trace2/` (plates, owls, tone, `encode_all.py`; README), `src-s18/traced_v2/trace/` |
| [s19](s19/README.md) | 57.32–63.12 | drawn | `snapshots-s19b-tools/` (`shapefit.py` pose fits), `snapshots-s19-fix1-tools/`, `trace-scripts-s19-ref/` |
| [s20](s20/README.md) | 63.12–69.44 | drawn | `src-s20/trace/` (README; `trace_all.py`), `snapshots-s20-b3-tools/` (room tone), `trace-scripts-s20-f2-trace/` |
| [s21](s21/README.md) | 69.44–74.52 | drawn | `trace-scripts-s21-fix1n-tools/` (harness and fits; `p2src/s21.md`), `trace-scripts-s21-p2-tools/` (`wingfit.py`), `snapshots-s21-fix1b-tools/` |
| [s22](s22/README.md) | 74.52–84.04 | traced | `src-s22/trace/` (`trace_lines.py`, `write_lines2.py`, `measure_rim2.py`; README), `snapshots-s22-p4-h/` |
| [s23](s23/README.md) | 84.04–97.08 | drawn | `src-s23/trace/` (README), `scratch-build-s23g/` (vector cel tracer) |
| [s24](s24/README.md) | 97.08–100.48 | mixed | `src-s24/trace/` (README), `snapshots-s24d-h/` (line data), `scratch-build-s24p2/` (speed-line trace) |
| [s25](s25/README.md) | 100.48–110.52 | mixed | `snapshots-s25-tools/` (`extract3.py`, `crackfit.py`, `headtrack.py`, `lightfit.py`, `scisfit.py`, `smokefit.py`), `src-s25/trace/` (README) |
| [s26](s26/README.md) | 110.52–117.52 | traced | `snapshots-end-s26-fix3-tools/` (`pagetrace.py`), `snapshots-end-s26-fix1-tools/` (`ztrace.py`, `export_js.py`), `trace-scripts-s26b-meas/` (owl rig fits) |
| [s27](s27/README.md) | 117.52–129.30 | traced | `trace-scripts-s27-k-tools/` (`room_vec.py`, `codec.py`, `export3.py`), `trace-scripts-s27t-tools/` (see `README.txt`), `snapshots-end-s27-tfix-tools/` (`plate.py`) |
| [s28](s28/README.md) | 129.30–136.00 | traced | `snapshots-s28t-tools/` (`faintink.py`, `retrace_fig.py`, `retrace_room.py`), `trace-scripts-s28-tools/` (`buildkeys.py`, `fitcam.py`, `depthgrids.py`, `traceview.py`), `trace-scripts-s28-k-tools/`, `snapshots-end-s28-fix1-tools/` |
| [s40](s40/README.md) | 136.00–140.80 | mixed | `trace-scripts-s40-fix1c-h/` (traced glyph contours), `trace-scripts-s40-fix2p-h/` (sky correction grid), `scratch-build/` (clouds) |

Foundations and general groups: [soko](soko/README.md) · [hippie](hippie/README.md) ·
[pureimg](pureimg/README.md) (its scripts live under s08) · [owl](owl/README.md) (most of it lives under s12 and s09) ·
[sound](sound/README.md) (the code is `tools/sound/`) · [render](render/README.md) · [common](common/README.md).

## Index files

- **`MANIFEST.tsv`**: every file in this folder with its sha256, size, the place it was collected from, and every other
  place an identical copy was found (`also_at`). Files are deduplicated by content. The one exception is 146 small
  helpers and specs that a script imports or reads **by name from its own folder** while the only other copy lives
  elsewhere or under another name. Those are kept in both places so the folder still works, and `also_at` says so.
- **`NOT_INCLUDED.tsv`**: everything seen during collection but deliberately left out, with the reason:
  - **data outputs**: generated numbers, not code, and re-created by running the scripts. That covers 366 distinct
    `.js`/`.json` files over 50 KB that are nearly all digits or encoded vectors (153 MB), plus about 2,400 distinct
    `.json`/`.txt` files (about 695 MB). Those are metrics, tracks, reports and traces, i.e. files that were large, mostly
    numbers, named or written as outputs, or never read by a script as an input setting. Small input specs and settings
    *are* included;
  - files byte-identical to a file the render loads (they are in `src/` already);
  - esbuild bundles whose sources are kept;
  - old copies of fidelity logs;
  - one third-party library (`gsap.min.js`).

  The biggest data outputs not included are:

  | size | file |
  |---|---|
  | 11.7 MB | `archive/prev-builds/s19b-prev/src-legacy/owldata.js` (the traced legacy s19) |
  | 7.2 MB | `tools/trace-scripts/s16-fix1-trace-archive/src-shots-s16/data/dyn.js` |
  | 3.9 MB | `src/shots/s23/cels.js` (s23 foreground cels, not loaded by the final render) |
  | 3.9 MB | `owlBTrace.new.js` (build-session scratch) |
  | 3.0 MB | `cels_v3.js` (build-session scratch, s23) |
  | 2.6 MB | `src/shots/s18/traced_v2/owlBTrace.js` |
  | 2.5 MB | `snapshots/s16-fix1-orig/s16/data/owl.js` |
  | 2.1 MB | `tools/trace-scripts/s16-fix1-trace-archive/src-shots-s16/data/plate.js` |
  | 2.0 MB | `archive/prev-builds/s02-legacy-traced/roomInk.js` |
  | 1.7 MB | `src/shots/s13/celHP.js` |
  | 1.4 MB | `archive/prev-builds/s02-legacy-traced/panInk.js` |
  | 0.9 MB | `archive/prev-builds/f2r-prev/hippie.traced.js` (the traced colour site; restored into `src/lib/hippie.js`) |

  Because of this, the earlier builds under `prev-builds-*` whose data files were large (`s02-legacy-traced`,
  `s19b-prev`, `f2r-prev`, and `fieldC.js` in the two s26 builds) are kept here as code and notes only. Their data is
  still in the git history.
