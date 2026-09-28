s23 targeted fix (2026-09-27): final comparison.
  pairs/p<k>.jpg              render (left) | source (right), source frame k (t = k/25), every 4th frame + key frames
  tri_<k>.jpg                 SOURCE | NOW | BEFORE (renders/film.mp4) crops on the owl / aura beats
  overview_src_now_before.jpg full frames, small: source | now | before
  metrics_*.json              per frame k: [mean |blur_s4(render) - blur_s4(source)|, same at s12] (RGB, 0-255)
                              start = this tree before the fix (rendered live), now = after, film_mp4 = renders/film.mp4
  stretch_table.txt           the same per beat
  tools/                      rend.sh (renders exact source frames through the live composition with shoot.mjs, the
                              critic's harness), met.py, stretch.py, crop.py / r.py / g.py / ov.py / bl.py / reg.py (crops,
                              rulers, ink overlays, blends, region error). Source frames were decoded by index into the
                              session scratchpad (ffmpeg select between(n,2098,2430)); re-extract to reuse them.
