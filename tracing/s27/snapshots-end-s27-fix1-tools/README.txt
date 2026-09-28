end-s27-fix1 (2026-09-27): fix round 1 on s27 (117.52-129.30). Measuring / tracing scripts, not part of the film. Everything
they write into src/ is numbers and polygons (no pixels). Source frames are decoded by frame index (extract.py) into
snapshots/end-s27-fix1-work/src (sN.png, N = frame at 25 fps); renders go to work/<dir>/rN.png.

Render / compare (tools/compare.sh times out on this machine, as in the last reviews)
  harness.html, render.mjs OUT F1,F2,..   s26/s27/s28 through the film's own post.js, frame exact (film time F/25), live src/
  render_dbg.mjs OUT F.. raw|graded JSON  same with __s27dbg variants (s27's measuring hooks)
  metrics.py, sheet.py, cmp3.py, gridsrc.py, gridpair.py, edgeov.py, kbstat.py, desdark.py   metrics, sheets, crops, stats

Data written into src/shots/s27 (in the order they were made)
  keyboard       laptop.js paintBaseTop(side): hand-tuned against kbstat.py (key box p10/p50/p90)
  mug            s27.js MUG_D: keys read off 2x gridded source crops (gridsrc.py 1150 470 1850 700 ...)
  lid back       lidcorners.mjs (the shot's own lid corners), lidwarp.py (warp frames into lid-back coords),
                 lidfit2.py fit lidfit_src.json F.. (source: sunlit patch boundary, colours) -> lidgen.py init, then
                 lidgen.py iter MEAS.json twice (lidfit2.py measure on a render) -> s27/lidback.js
  notebook       data2.js NOTEBOOK_K: keys from 122.4 on re-ordered to the 121.8 corner order; 122.0/122.2 re-keyed on gridded
                 crops; the curled "hook" removed from keys/k_122_0.js with
                   tools/trace-scripts/s27t-tools/keysurg.py remove src/shots/s27/keys/k_122_0.js '[[1680,806],[1712,806],[1712,868],[1680,868]]' --clip --src '[[1630,790],[1770,790],[1770,890],[1630,890]]'
  designer tag   designer.js: cut-back polygon + redrawn brim/hair lines (hand-read on fine-gridded 125.0 crops); a stray sleeve
                 stroke removed from roomB.js:
                   keysurg.py remove src/shots/s27/roomB.js '[[1000,560],[1028,560],[1028,604],[1000,604]]' --clip --src '[[1030,540],[1120,540],[1120,640],[1030,640]]'
  page owl       pageowl_median.py (registered un-graded median in page px, 118.20-119.60), GrabCut + hand mask edits
                 (inline in the session: head-top polygon, headband arc, ear cup) -> work/pageowl_mask2.png,
                 pageowl_trace.py -> s27/pageOwl.js
  chair          chair_trace.py -> s27/chairTrace.js (mask by colour, grown into the jacket beside it; un-graded regions)
  129.28 key     tools/trace-scripts/s27t-tools/keymove.py d2r <scratch.js> src/shots/s27/dkeys/d_129_28.js ZONE, twice:
                 speaker disc ZONE = circle (1222,513) r31 clipped to x>=1198 (scratch kept as s27/speaker.js);
                 owl beak ZONE = [[1238,572],[1280,572],[1280,630],[1246,630],[1238,612]] (discarded).
                 d_129_28.before.js / roomB.before.js here are the files before these edits.
