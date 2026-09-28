# tools/

Runnable tools. Run them from the repository root, with the Python environment from `npm run setup` active
(`source .venv/bin/activate`). The ones marked **source** read your copy of the original film from
`APPRENTICE_SOURCE` (or `REF`); nothing else here needs it.

| tool | what it does |
|---|---|
| `sound/score.py` | Synthesizes the soundtrack: `audio/score.wav` + `audio/CUES.md` from the cue table `sound/cues.py` (`npm run score`). See [`../docs/audio.md`](../docs/audio.md) for the other files in `sound/`. |
| `sound/verify.py`, `sound/calibrate.py` | **source** Compare the score with the original's audio (analysis only); calibrate the mix trims (`*_cal.json`). |
| `verify_render.py NEW.mp4 [OLD.mp4]` | Gates a full render: 3,520 frames, no black frames, no error bars. With **source** it adds the per-shot distance to the original and, given OLD, fails if a shot got worse (`npm run verify`). |
| `fidelity_log.py` | Rebuilds `docs/FIDELITY.md` from `docs/fidelity/*.md` (`npm run fidelity`). |
| `harness/` | Frame-exact stills, WebGL context probe and dependency list from the live composition (see [`harness/README.md`](harness/README.md)). |
| `compare.sh TIMES [outdir]` | **source** Render|original pairs at the given times (`hyperframes snapshot --against`). |
| `sidebyside.sh START END FPS outdir` | **source** Motion check: pairs at FPS packed into `sheet.jpg` and an mp4. |
| `film_sidebyside.sh film.mp4 [out.mp4]` | **source** Whole-film render-over-original video (quick version of `comparison/`). |
| `ending_compare.sh NOW.mp4 BEFORE.mp4 START DUR out.mp4` | **source** Three rows: now / previous render / original. |
| `refframe.sh T out.png` | **source** One full-resolution frame of the original. |
| `grid.py T out.jpg [x0 y0 x1 y1]` | **source** A frame of the original with a labelled pixel grid, for measuring layouts. |
| `strip.py T0 T1 STEP out.jpg [x0 y0 x1 y1]` | **source** Tiles of the original over time, for timing and motion. |
| `camtrack.py T0 T1 STEP [x0 y0 x1 y1]` | **source** The original's camera move (scale, rotation, translation vs T0) from ORB features + RANSAC. |
| `lib.sh` | Shared by the shell tools: finds the source film and a label font for ffmpeg (`FONT=…` overrides it). |
| `requirements.txt` | Pinned Python packages (Python 3.11). |

The scripts that made the shots' data files (tracing, fitting, measuring) are not here but in
[`../tracing/`](../tracing/README.md): they are kept as they ran, with the author's paths.
