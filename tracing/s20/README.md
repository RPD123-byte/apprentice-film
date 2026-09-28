# s20 — 63.12–69.44 s: Wide: scissors against the speaker; the owl takes them; the smirk

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s20.md`). The render code is `src/shots/s20.js` and `src/shots/s20/`.

## How the data in `src/shots/s20/` was made

Scripts whose code writes into `src/shots/s20/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s20/snapshots-s20-b3-tools/tonecal.py`](snapshots-s20-b3-tools/tonecal.py) | `src/shots/s20/b3/room.js` |

Method notes written next to the trace code: [`src-s20/trace/README.md`](src-s20/trace/README.md).

## Index of folders (12)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s20/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 61 files
Measurement scripts for s20.

- `trace/owlkeys.py` — The owl's held key drawings in s20 (MEASUREMENT script, not loaded by the film).
- `trace/trace_room.py` — Room tracer for s20 (MEASUREMENT script, not loaded by the film).
- `trace/trace_all.py` — Trace every s20 layer from the measurement composites (composite2.py) and write the data modules the film loads (src/shots/s20/data/*.js).
- `tracedraw.js` — Redraw of traced ink data (s20/trace/*.py measure the source; the data modules hold control points only): levels [{ v, rings: [[x0,y0,x1,y1,...], ...] }] value bands, st…

### `trace-scripts-s20-dev/` — work folder, 9 files

- `shot.built.html`
- `owl.built.html`
- `regs.py`
- `shot.src.html` — include head

### `trace-scripts-s20-f2-dev/` — work folder, 37 files
Owl key drawing per frame (s20/trace/select_frames.py from the ECC fits): time -> [key, a, b, c, d, e, f, cc]; the key canvas (setup-A frame px) is drawn through transfo…

- `owlframes.keys.js` — Owl key drawing per frame (s20/trace/select_frames.py from the ECC fits): time -> [key, a, b, c, d, e, f, cc]; the key canvas (setup-A frame px) is drawn through transfo…
- `trace.built.html`
- `trace.src.html` — include head
- `superseded/dust.js` — Dust puffs per source frame (s20/trace/dust.py): circles [x, y, r, value, lift] (setup-A frame px; pre-grade value inside the circle and its difference from the clean ro…

### `trace-scripts-s20-f2-trace/` — tracing / fitting, 19 files
fit an affine from a key composite (A-frame coords) to other frames, masked by a box: prints warp and cc

- `owlfit.py` — fit an affine from a key composite (A-frame coords) to other frames, masked by a box: prints warp and cc
- `flow.py`
- `holdmask.py` — fill holes
- `iterate2.sh`

### `trace-scripts-s20-fix1-dev/` — work folder, 7 files
owltests.sh OUTDIR "name\|pose\|placejson\|T\|x0 y0 x1 y1\|scale" ...

- `shot.built.html`
- `owl.built.html`
- `owltests.sh` — owltests.sh OUTDIR "name\|pose\|placejson\|T\|x0 y0 x1 y1\|scale" ...
- `sheet.sh` — sheet.sh OUTPREFIX "x0 y0 x1 y1\|full" t1 t2 ...

### `trace-scripts-s20-ref/` — measurement / study, 7 files
card outline with rounded corners approx

- `cardfit.py` — card outline with rounded corners approx
- `cardfit2.py`
- `homog.py` — residual by region
- `gstrip.py` — gstrip.py T0 T1 STEP out.jpg x0 y0 x1 y1 [--cols N] [--w W]: strip with a 50px frame grid drawn in

### `snapshots-s20-b3-backup/` — copy of the shot build before a pass, 1 file
s20 (63.12–69.44): the wide room.

- `s20.before.js` — s20 (63.12–69.44): the wide room.

### `snapshots-s20-b3-tools/` — tools, 23 files
tonecal.py render.png : suggest TONE gains (per painter) from pre-grade region means, source / render

**Writes into:** `src/shots/s20/b3/room.js`

- `tonecal.py` — tonecal.py render.png : suggest TONE gains (per painter) from pre-grade region means, source / render
- `roomfit.py` — roomfit.py render.png outdir [regions...] : per-region blurred MAE vs the owl-free source composite, + overlays
- `cardfit2.py`
- `cardfit.py`

### `snapshots-s20-fix1b3-tools/` — tools, 12 files
s20 (build 3): the wide room, painted as one engraved plate in setup-A frame coordinates (locked-off camera, measured: camtrack s = 1.0000, no drift 63.12–66.84).

- `backup/room.js` — s20 (build 3): the wide room, painted as one engraved plate in setup-A frame coordinates (locked-off camera, measured: camtrack s = 1.0000, no drift 63.12–66.84).
- `backup/owl.js` — s20 (build 3): the owl, drawn with the shared B&W owl kit (owlInk.js) from poses fitted to the source, plus s20's own headphones (the source's big dark over-ear cups) an…
- `backup/s20.js` — s20 (63.12–69.44), build 3: the wide room behind the synth.
- `backup/scissors.js` — s20 (build 3): the big chrome scissors.

### `snapshots-s20-fix2-tools/` — tools, 16 files
s20 (build 3): the wide room, painted as one engraved plate in setup-A frame coordinates (locked-off camera, measured: camtrack s = 1.0000, no drift 63.12–66.84).

- `backup/room.js` — s20 (build 3): the wide room, painted as one engraved plate in setup-A frame coordinates (locked-off camera, measured: camtrack s = 1.0000, no drift 63.12–66.84).
- `backup/owl.js` — s20 (build 3): the owl, drawn with the shared B&W owl kit (owlInk.js) from poses fitted to the source, plus s20's own headphones (the source's big dark over-ear cups) an…
- `backup/owlparts.js` — s20 (fix pass 1): the source owl's own parts, drawn in owl units through the kit's `extra` hook (after the kit has painted body, wings, head and face): glossy dark headp…
- `backup/s20.js` — s20 (63.12–69.44), build 3: the wide room behind the synth.

### `snapshots-s20-rev2-tools/` — tools, 4 files
crop.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [--stack] : render \| source crop side by side (or stacked)

- `crop.py` — crop.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [--stack] : render \| source crop side by side (or stacked)
- `tile.py` — tile.py dir x0 y0 x1 y1 scale out.jpg t1,t2,...
- `regions.py`
- `mae.py` — region means

### `scratch-build/` — loose scripts from an agent scratchpad, 3 files
ingest harness frames: metrics vs source, then keep a q93 jpg and drop the png

- `ingest.py` — ingest harness frames: metrics vs source, then keep a q93 jpg and drop the png
- `rs.py` — rs.py n0 n1 step x0 y0 x1 y1 out [tw] [cols] -> for each frame: render tile above source tile
- `srcstrip.py` — srcstrip.py n0 n1 step x0 y0 x1 y1 out [cols] [tw]
