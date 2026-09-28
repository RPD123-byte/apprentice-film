s23 rebuild (this pass) — measuring and comparison scripts. They read SOURCE frames only to measure and compare;
nothing here is loaded by the film.

- m.py        paths + source frame loader (frames 2095–2432 extracted to the session scratchpad).
- ug.py       inverse of the film's finish grade (copied from src/shots/s23/trace/ug.py, the earlier pass's).
- crop3.py    labelled source crops (frame-px ticks) for reading positions.
- follow.py   tiles of the source cropped round a moving point (timing, poses).
- fit.py      silhouette check of a rendered owl (scratch gallery page, black ground) against the source owl
              (difference from a clean plate; WHITE=v restricts both to their bright parts): IoU, bboxes.
- score.py    runs fit.py on several gallery pages and stacks the overlays.
- pair.py     renders exact source frames k through the film (HyperFrames snapshot) and pairs render | source;
              prints blurred-luminance MAE (σ 8 px, 0–255).
- cmpc.py     crops of render | source for several frames.  emap.py  signed blurred error maps.
Scratch renders: snapshots/s23r-r1 … r9 (rounds), snapshots/s23r-gal (pose-fit gallery harness), s23r-src (crops).
