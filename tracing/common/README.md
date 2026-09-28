# common

Shared helpers: generic crop/compare/grid/measure scripts and early whole-film measurements not tied to one shot

## Index of folders (3)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-lib/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 1 file
Library modules from src/lib/ that the final render no longer loads.

- `cam3d.js` — A tiny perspective camera for stroke-rendered 3D: project points, then draw faces as ink.

### `scratch-build/` — loose scripts from an agent scratchpad, 10 files
template: head incl. headphones; find its exact bright blob first

- `facetrack2.py` — template: head incl. headphones; find its exact bright blob first
- `facetrack3.py` — template: head incl. headphones; find its exact bright blob first
- `camtrack.py` — Estimate a similarity transform (scale + translation) of each frame relative to a reference frame, using ORB features on a masked region.
- `root.js`

### `tools-dev-pages/` — tools, 1 file
Scratch HTML pages from tools/ used during development (engraving test bed, owl pose gallery, sōko page test).

- `engrave-test.html` — engrave test
