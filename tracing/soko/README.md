# soko

F1 — the sōko page (“MIXING DOWN, LATE AT NIGHT.”): src/lib/sites.js, src/lib/sokoIll.js

The black-and-white sōko page. The hero illustration is 32 measured object layers placed from 3–8× ruler crops and value tables of an owl-free median plate of the source (48.6–50.4 s); the UI (headline, rail, counter, key) is fitted to about 1 px; the framed-screen presentation used from 69.44 s (`FRAMED`, `drawFramedPage`) matches the source’s finish-pass glow. Start with `snapshots-f1-harness/` (the headless page harness the F1 agent tested with, and its earlier passes in `old/`) and `scratch-build-f1b/` / `scratch-build-f1t/` (plate, tone and region measurement). The full-frame page shot s17 has its own tools in [`../s17/`](../s17/README.md).

## Index of folders (5)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `snapshots-f1-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 30 files
measr.py NAME x0 y0 x1 y1 [nx ny]: our raw render vs the source plate, cell means (pre-grade 0..1): "ours/src"

- `measr.py` — measr.py NAME x0 y0 x1 y1 [nx ny]: our raw render vs the source plate, cell means (pre-grade 0..1): "ours/src"
- `measrm.py` — measrm.py NAME "x0 y0 x1 y1 nx ny" ...
- `meas.py` — meas.py x0 y0 x1 y1 [nx ny] : ungraded source mean values in a grid of cells over the box (pre-grade, 0..1)
- `plate.py` — ungrade: use each frame's t for flicker ~ average; flicker at 49.5 vs 53.2 differs slightly; use 50.0

### `scratch-build/` — loose scripts from an agent scratchpad, 7 files
drive.py "<query>" out.png [evalJS] -- render tools/soko-test.html?<query> headless, save the #out canvas (full res)

- `fit2.js`
- `fit.js`
- `drive.py` — drive.py "<query>" out.png [evalJS] -- render tools/soko-test.html?<query> headless, save the #out canvas (full res)
- `g2.py` — g2.py img out x0 y0 x1 y1 [scale] [gamma] : crop, lift shadows (gamma), upscale, 10px grid, labels every 50

### `scratch-build-f1b/` — scripts, 32 files
sil.py map.npy x0 y0 x1 y1 lo hi [eps] [--min A] [--show out.jpg] : contours of lo<=v<hi inside the box (page coords), simplified (approxPolyDP eps px); prints each poly…

- `sil.py` — sil.py map.npy x0 y0 x1 y1 lo hi [eps] [--min A] [--show out.jpg] : contours of lo<=v<hi inside the box (page coords), simplified (approxPolyDP eps px); prints each poly…
- `tone.py` — tone.py render.png ref.png out.jpg [sigma] : blurred luminance render \| ref \| diff (red = render too bright, blue = too dark)
- `sokoIll.pre-apply.js` — The sōko page's hero illustration: the designer at his desk inside a wall of gear, white ink on black.
- `sokoIll.v0.js` — The sōko page's hero illustration: the designer at his desk inside a wall of gear, white ink on black.

### `scratch-build-f1t/` — scripts, 2 files

- `regions.py`

### `tools-dev-pages/` — tools, 1 file
Scratch HTML pages from tools/ used during development (engraving test bed, owl pose gallery, sōko page test).

- `soko-test.html` — soko test
