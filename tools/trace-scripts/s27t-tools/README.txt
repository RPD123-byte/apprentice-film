s27t pass (2026-09-27): the traced s27 restored as the active shot and fixed. Measuring / tracing scripts, not part of
the film. Everything they write into src/ is numbers and polygons (no pixels).

Setup. Source frames are decoded by frame index (25 fps) into a scratch dir, e.g.
  ffmpeg -i <source.mp4> -vf "select='between(n\,2925\,3245)',setpts=N/TB" -fps_mode passthrough -start_number 2925 ref/src/%05d.png
and film.mp4 the same way into ref/film/. The scripts' REF / FR / FC constants point at that session's scratch dir;
edit them before reuse (common.py FR, metric.py/sheet.py/heat.py REF, desfix.py REF + FC).

Render / compare
  rt.sh TIMES NAME [harness]  time-true render (film times on the 0.04 grid) through a harness that loads only s27
                              (snapshots/s27t-final/s27t-harness) or s26+s27+s28 (…/s27t-harness3). The project-level
                              tools/compare.sh timed out this session (it loads every shot). harness/, harness3/ hold copies
                              of the harness index.html (symlink assets/ and src/ next to them to reuse).
  check.mjs                   console errors + CPU timing through the harness (puppeteer)
  metric.py DIR [--film]      per frame ΔE76 on σ8-blurred Lab, mean abs RGB after σ4 / σ12 blur; stretch means
  sheet.py, heat.py           source | render | film.mp4 contact sheets; ΔE heat maps
  blockerr.py                 per-block Lab offsets and texture level

Whip (117.52–117.92)
  whipfit.py / whipfit2.py    fit the radial zoom blur (centre, amount, floor, wash) per source frame by simulating it on
                              an unblurred render (a debug harness with __s27dbg = {zb:[…,0,0,0]}) -> WHIP_FX in s27.js

Laptop
  lidwarp.py, lidprof.py, lidcol.py   warp frames into lid/page coordinates by the SCREEN track; rim/bezel profiles and
                              band colours (source vs render) -> laptop.js paintLidFront, LIDTURN
  lidquad.py                  draw the shot's lid quad over frames (edge-on pass)
  baserect.py, deckcol.py     rectify the base top face in base-cm coords; deck colours over time -> paintBaseTop
  deckgain.py RENDERDIR K…    source/render colour gain on 4x3 deck cells per 0.2 s -> src/shots/s27/deckgain.js

Designer (end orbit)
  fix_spurs.py                removed a thin cabinet-line spur from the 128.2/128.44/128.68 key outlines
  find_spurs.py, dkey_overlay.py, rastkey.py   inspection
  sleeve.py T DKEY HAND       GrabCut the part of his figure the key outline had cut off (the near sleeve) from a hand
                              polygon, trace it (room_vec.py on a registered median) and append it to the key; outline grown.
                              Run for 127.88, 128.2, 128.44, 128.68 (hand polygons in fidelity/s27.md's notes / shell history)
  keymove.py d2r ROOM DKEY ZONE   move traced background chunks out of a designer key into the room key (128.92, 129.12)
  desfix.py                   per-view corrections of the extended designer mesh: each key view's pixels carried from its key
                              frame by chained DIS flow of the source (forward-backward checked), mesh re-solved per frame
                              (Huber, smoothness, prior) -> src/shots/s27/desfix.js

Room keys
  keysurg.py remove KEY ZONE [--clip] [--src POLY] [--line …]   delete traced polygons inside a zone (clipped at its edge),
                              refill the hole with flat bands inpainted from --src pixels, optionally add an ink line.
                              Used on k_121_2 / k_121_6 / k_122_0 (the designer's remnants) and k_128_2 … k_128_92 (sleeve
                              copies; zone from zone_from_dkey.py)
  room_vec.py, reg_median.py, ungrade.py, codec.py   copies of the earlier tracing pipeline (tools/trace-scripts/
                              s27-k-tools, f2k-tools) with paths pointed here; common.py loads frames from the scratch dir
