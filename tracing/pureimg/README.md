# pureimg

F3 — the retro "Pure Imagination" page on the laptop (24–32 s) and the feedback note card
(`src/lib/pureimg.js`, `src/lib/notecard.js`). The page is an original design (no third-party marks) built to match the
composition, palette and timing of the source's screen.

The same agent (`F:pureimg`) also built shot **s08** (the screen close-up), and every measurement script it wrote — card
corner fits, caret / per-letter typing timing, the red selection rectangle, the screen camera drift — was made while
matching s08. They are therefore filed under **[`../s08/`](../s08/README.md)**, mainly:

- `s08/trace-scripts-s08-f3-tools/` — the foundation pass's tools: camera-drift fits (`camfit*.py`), text / caret
  fits (`textfit.py`, `sweep_txt.py`), selection-rectangle and ribbon/star/ornament fits (`sweep_sel.py`, `snap_rib.py`,
  `sweep_star.py`);
- `s08/trace-scripts-s08-fix1-tools/`, `s08/snapshots-s08-fix1r-tools/`, `s08/snapshots-s08-fix2-tools/`,
  `s08/snapshots-s08-p4-tools/` — later fix passes on the same shot.

The over-the-shoulder shots s05 and s07 draw their own copies of the page (`src/shots/s05/pure.js`, `src/shots/s07/page.js`);
their tools are under `../s05/` and `../s07/`.
