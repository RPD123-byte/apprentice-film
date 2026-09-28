end-critic: ending review (97.0-140.8, plus s23-s25 from 84.0). Review only; no project source edited.
Code reviewed (md5 in tools/md5_at_start.txt, unchanged start to end): s23-s28, s40_endcard, lib/hippie.js as of 2026-09-27 15:58.
Method: tools/compare.sh times out ("Runtime.callFunctionOn timed out"), so every frame 84.00-140.60 (n=2100..3515) was
rendered through tools/shoot.mjs (the live index.html -> src/main.js, window.__film.renderAt(n/25), graded canvas).
Source and renders/film.mp4 (BASE) decoded by frame index. For the metrics NOW frames were passed through the same
yuv420p/x264 round trip as film.mp4 (this removes a +1.4-level offset; round-trip vs film.mp4 on unchanged s40: 0.5 at s4).
  metrics_every_frame.json  per frame: mad4/mad12 (mean abs RGB after Gaussian blur s4/s12), dE4/dE12 (CIE76 on blurred Lab), NOW and BASE vs SRC
  metrics_summary.txt       per shot, per 1-s window, cuts, spikes
  tone_per_second.txt       signed L*, contrast, a*/b* drift per second (s12)
  tri/                      SRC | NOW | BASE stacks: half_<n>.jpg every 0.5 s from 110.52, cut_*.jpg (cut-1, cut, cut+1), s23_/s24_/s25_ sheets
  defects/                  crops for each finding;  heat/  dE heat + signed lightness
