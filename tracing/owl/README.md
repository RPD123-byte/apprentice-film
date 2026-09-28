# owl

F4 — the owl kit: src/lib/owlInk.js (+ owlColor.js)

The owl kit was built by the `F:owl` agent together with shots s09 and s12, so most owl measurement (silhouette, eye, beak, headphone and cushion traces) lives in [`../s12/`](../s12/README.md) (`src-s12/trace/`) and [`../s09/`](../s09/README.md). Here: loose owl pose / measurement scripts, the colour-owl module the render no longer loads, and the owl gallery page.

## Index of folders (4)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-lib/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 1 file
Library modules from src/lib/ that the final render no longer loads.

- `owlColor.js` — The owl in colour, as it sits on the end card: cream, red headphones, a bandage, big brown eyes.

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files
trace2.py src.png geo.json out.json dbg.png [high low minlen]

- `trace2.py` — trace2.py src.png geo.json out.json dbg.png [high low minlen]
- `crops.py` — crops.py dir out.jpg x0 y0 x1 y1 scale [tmin tmax] [cols]
- `metric.py` — per-pair blurred MAE (grey, 0-255) for a compare.sh output dir; optional region
- `contour.py` — contour.py src.png x0 y0 x1 y1 thr eps [blur] -> JSON of lit-region contours inside the box (frame px)

### `scratch-build-p2/` — work folder, 3 files
s18 shot A owl: the chubby side-on owl that lands on the synth and scurries left along the keys.

- `backup_s18_fix1/owlA.js` — s18 shot A owl: the chubby side-on owl that lands on the synth and scurries left along the keys.
- `backup_s18_fix1/owlB.js` — s18 shot B owl (55.28–57.28): the extreme close-up — only the belly, the tail, the tips of the far wing and the legs are in frame.
- `owltest.py` — ramps: approximate by flat mid value for this test

### `tools-dev-pages/` — tools, 1 file
Scratch HTML pages from tools/ used during development (engraving test bed, owl pose gallery, sōko page test).

- `owl-gallery.html` — Owl kit gallery
