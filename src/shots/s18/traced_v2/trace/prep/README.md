Preparation scripts that built the scratch inputs for the tracers one level up (run from a scratch directory that
holds the owl-free medians bgA.npy / bgB.npy; paths inside point at the session scratchpad). Measurement only —
nothing here is loaded by the film.

- `src.py` — reads source frames (cv2) and holds PATH_A.
- `owlstack.py` — shot A: every frame 1331–1381 with the grade undone, registered on PATH_A (+ owl difference masks).
- `phase.py` — shot A: per-wing-phase registered medians (used to check the rigid-figure assumption).
- `tipcommon.py` — the shot-B tip transforms, the keyboard canvas (plate x + 260) and its outline mask.
- `tipfit.py` — refits the tip transform of every frame 1418–1432 (ECC, affine) against the traced keyboard plate.
- `plateB.py` — assembles the shot-B background and keyboard plates (see ../README.md).
- `owlB_prep.py` — shot B: every frame with the grade undone + the owl-free expectation (plates under the tip).
- `owlB_body.py` — registered consensus + median of the belly (TRACK_B).
- `owlB_model.py` — the far-wing flap state per frame and the per-state medians.
- `owlB_tail.py` — the tail's affine per frame (ECC, two passes) and its registered median.
