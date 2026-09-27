Measurement scripts for s24 (not loaded by the film). They read source frames and write vector data only: tone-level
contours with grey values, straight line bars with width and grey values, and shifts. No pixels are stored in the
project. The source-derived working arrays (plates, masks, ungraded frames) and the intermediate JSON traces live
outside the project, in `WORK` (env `S24WORK`, default: this session's scratchpad `s24p2/work`). `common.py` changes
into `WORK`, so relative paths resolve there. The emit scripts write `../dataF.js`, `../dataHJ.js` and
`../dataPage.js`.

Source frames: `S24SRC` (default: `s24p2/src/kNN.png`) holds frame k = round((t − 96.8) / 0.04), for k 5..93.

Pipeline, in order:
- `cacheU.py 6 93`: caches the ungraded luminance of each frame. `ungrade.py` is F2's exact inverse of the
  finish pass.
- **F owl (k24–53), which only translates.**
  - `ftrack.py` gives the sub-pixel template track, walking back from k53.
  - `plate.py` takes a 30-frame median plate in k53 coordinates.
  - `runF.py` makes the silhouette (`mask.py`: reconstruction from a hard seed, with a low-threshold region for the dark headphones).
  - `traceF.py` traces the tone levels (`tone.py`: 9 iso-value levels over an opaque base silhouette, marching squares, RDP simplification).
- **H and J (held drawings).**
  - `drawing.py H|J` builds motion-compensated median plates, masks and tone traces.
  - The loose blades and glints are folded into the masks from one frame's object trace (`mask*_extra.npy`).
  - `glints.py` traces the H glints (k54, 57, 58, 59) per frame.
  - `whirl.py 63 64 65 66 67` traces each in-between drawing on its own.
- **Lines and objects for every speed-line frame.**
  - `run_beatF.py` covers k23 and k24–53 (k23 on the de-washed field). `run_beatHJ.py` covers H, the whirl and J.
  - Both call `beat.py`, which does the following:
    - It finds the line angle per frame as the median principal axis of long thin components.
    - It removes the haze with a 31 px grey opening.
    - `lines.objects` separates non-line bright things (scissors, glints).
    - `lines3.detect3` splits the rotated frame's rows into runs. It links overlapping runs, breaks them at valley rows, and fits each bar from column centroids.
    - `track_lines.track` re-centres and cuts each bar on robust perpendicular profiles, giving its width (ink mass / peak) and 1–6 grey values along its length.
    - `merge_collinear` joins bars that are lit across a gap. They are then tracked again.
    - Objects are traced with `tone.trace`.
- **Page beats.**
  - `page.py A` traces k7's smears as the difference from the clean page at 95.92 s, inside hand-bounded regions.
  - `holdmotion.py` measures the per-frame shifts of the three hold owls and the confetti drift D_i·f(k).
  - `page.py B` traces each hold owl from its own motion-compensated median.
  - `smoke.py` measures the extra smoke of k8–9 and traces it as additive levels.
  - `confetti.py` feeds `holdmotion.py`.
- `wipe.py` traces the region above k91's wipe band.
- `emit_F.py`, `emit_HJ.py`, `emit_page.py` write the JS data. `emit.py` holds the encoders: zigzag base-32 varints at 1/2 px.
  `emit_F.py` also reuses a frame's scissors drawing (as [k, dx, dy]) when the source repeats it (template match ≥ 0.93).

Fits done inline and recorded in s24.js comments:
- k19: directional blur of k18 (45.5°, 100 px), then logistic white wipes, fitted separately for the screen and the margins.
- k20: logistic dark corner.
- k21–22 and k55–56: screen and margin flash values.
- k23: 0.498·content + 123.6.
- k91: band half-max edges.
- Margin lifts.
