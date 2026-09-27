Measurement scripts for s18 (not loaded by the film). They read source frames and write outlines + values only:
closed polygons (quarter-pixel, delta-coded) with holes, each with one measured grey or a linear ramp. No pixels are
stored. The film redraws them with Canvas2D fills (`../traced.js`), then the global grade runs as for every shot.

- `grade.py` — Python port of `src/lib/post.js` (halation, S-curve, vignette, flicker) and its inverse. Every trace is
  made on the inverted ("pre-grade") values, so the film's own grade brings them back to the source's look.
- `trace_plate.py in.npy out.js NAME levels eps t [--mask m.npy] [--nograde]` — the stacked outline trace. For each
  threshold level: cubic 4x upsample, `findContours(RETR_CCOMP)`, RDP (eps px). Each shape (outline + its holes) gets
  the mean of what stays visible above the next level (level 0 also takes the anti-aliased skirt next to it), or a
  plane fit for shapes over 400 px². Level `-1` means "the whole mask" (a silhouette filled with its dark value).
  - Room A: `bgA.npy` (median of 1331–1381, owl removed) → `traceA.js`, levels 0.2, 0.55, eps 0.45.
  - Shot B background → `traceBbg.js`: median of the tip frames 1424–1432 where neither the tipped keyboard nor the
    wing covers a pixel, else the pre-tip median (1382–1416); levels 0.2, 0.55.
  - Shot B keyboard → `traceBkb.js` (canvas coords, plate x + 260): the pre-tip median inside the keyboard outline;
    where the belly always hid the knob row (x 555–1280, y < 434) and right of the frame, the tipped frames 1419–1432
    warped back by the measured tip transforms; levels 0.2, 0.55.
- `trace_owlA.py owlstack.npz out.js` — shot A owl, from every frame 1331–1381 registered on PATH_A: one trace per
  wing phase (the per-phase median inside the per-phase silhouette; levels -1, 0.2, 0.45, 0.65, 0.8, 0.88, 0.94),
  the legs and feet per frame (what that frame's own silhouette adds under the body), and the smeared fly-in frames
  1331–1337 whole.
- `trace_owlB.py scratchdir out.js` — shot B owl. The belly is registered on TRACK_B; the far wing flaps on a 3-frame
  cycle (down / mid / up), so the body is a per-state median; the tail is its own rigid part with an affine per frame
  (ECC fit, started from the earlier tail-tip track). Per frame, everything that still differs from plates + body +
  tail (legs, feet, pressed keys, the near wing's outline when it sweeps down, edge slivers) is traced from that
  frame; from 1417 on (leap, take-off, wing at the left edge) the whole owl is traced per frame.

Scratch inputs (owl-free medians, registered stacks, masks) lived in the session scratchpad (`p2/`); the scripts that
built them are summarised in `fidelity/s18.md`.
