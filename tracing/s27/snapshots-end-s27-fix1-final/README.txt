end-s27-fix1: fix round 1 on s27 (117.52-129.30), against snapshots/end-s27-rev1-final. All pictures are SRC | BEFORE | NOW:
BEFORE = s27 at the start of this round (md5 430ff2e2..., the s27t traced build), NOW = after this round. Renders through the
reviewer's harness (s26/s27/s28 by film time, graded by the film's own src/lib/post.js), frame exact (film time F/25); source
and film.mp4 decoded by frame index. Scripts: snapshots/end-s27-fix1-tools (README.txt there lists every data edit).

  defects/01-*    mug in the end orbit (goes behind the lid now); lid edge-on and back (per-frame fitted sunlit patch, re-timed)
  defects/02-*    notebook 121.7-122.4 (no twist / hook)
  defects/03-*    keyboard (dark keys)
  defects/04-*    the stray "tag" under the beanie (gone)
  defects/05-*    designer drawing (thinner ink, softened fill, single outline between key views)
  defects/06-*    page owl (traced source owl in page coordinates; hand-over at 125.36)
  defects/07-*    chair at the left edge 128.68-129.28, desk "cracks" gone
  defects/08-*    whip 117.68-117.84
  defects/09-*    end 129.04-129.28 (speaker only at 129.28, no ghost beak, sleeve reaches the owl)
  defects/10-*    mug colour
  cuts.jpg        117.48 (s26) / 117.52 / 117.56 and 129.28 / 129.32 (s28)
  sheets/         SRC | BEFORE | NOW at 10 fps over the whole shot
  motion_src_before_now_every_frame.mp4   every frame 117.44-129.36, 25 fps
  metrics_every_frame.json, metrics_summary.txt   dE8 / sigma4 / sigma12 vs source for film.mp4, BEFORE, NOW
  determinism.txt   frames rendered again in another run and order: bit-identical

Summary (every frame, 295): film.mp4 6.51 / 14.4 / 11.5, BEFORE 2.76 / 6.3 / 4.7, NOW 2.63 / 6.1 / 4.4 (dE8 / s4 / s12).
Every stretch improved; no frame got worse (max +0.05 dE8 allowed, none reached). Details and remaining gaps: fidelity/s27.md.
