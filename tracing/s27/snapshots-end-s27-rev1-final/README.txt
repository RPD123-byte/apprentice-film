end-s27-rev1: adversarial review (round 1) of s27 (117.52-129.30). Review only; no project source was edited.

Code under review: src/shots/s27.js md5 430ff2e2525f1c7e25a17fac731d606e (mtime 12:32), s27/ tree unchanged during the
review (checked at start and end). Rendered from a frozen copy through tools/harness.html: s26/s27/s28 picked by film time
exactly as src/main.js does, painted and graded through the film's own src/lib/post.js, at film time F/25 (frame exact).
tools/compare.sh and tools/sidebyside.sh time out this session ("Runtime.callFunctionOn timed out"; the full composition
takes too long to load), so the same pairs were made with the harness. Source and renders/film.mp4 decoded by frame index
(checked against ffmpeg select=eq(n,...): identical).

Contents
  sheets/sheet10fps_*.jpg                 SRC | NOW | film.mp4 at 10 fps over the whole shot (118 rows in 4 sheets)
  sheets/motion_src_now_film_every_frame.mp4   every frame 117.44-129.36 (neighbour frames of s26/s28 included), 25 fps
  overview/ov1-4.jpg                      SRC | NOW | film.mp4 every 0.5 s (plus 117.48 s26, 117.52/117.56, 129.28, 129.32 s28)
  defects/NN-*.jpg                        one picture per defect, numbered by the ranking below
  heat/heat_F.jpg                         dE (sigma4 Lab) heat and signed lightness (red = render lighter) per frame
  metrics_every_frame.json, metrics_summary.txt   dE8 / sigma4 / sigma12 (NOW and film.mp4 vs source), every frame
  determinism.txt                         two separate runs, opposite orders: bit-identical
  tools/                                  the harness, renderers (render_dbg.mjs drives the s27 __s27dbg measuring hook),
                                          metric and crop scripts. (The frozen code copy was deleted; point render.mjs
                                          at the live tree with LIVE=1.)

Numbers (every frame, 295 frames; dE8 = CIE76 on sigma8-blurred Lab, sigma4/sigma12 = mean abs RGB after blur)
  NOW 2.76 / 6.3 / 4.7   vs film.mp4 6.51 / 14.4 / 11.5.  Every stretch is better than film.mp4.
  Worst windows: 121.5-123.5 (designer entry, dE8 3.0-3.3) and 128.72-129.12 (end orbit, 3.33).
  Cuts: 117.48 (s26) 1.16 -> 117.52 6.23 -> 117.56 6.61; 129.28 2.57 -> 129.32 (s28) 1.40. Both cuts land on the source's
  frames and nothing jumps across them.

Verdict: much better than film.mp4 (character, owl, room and timing now track the source), but a handful of specific,
visible breakages remain. Ranked by how visible they are at normal viewing size:

 1. End orbit 128.0-129.12, the mug (defects/01*). mugState slides the mug in a straight line from MUG_B's last key
    (127.64: cx 1254, yt 528) to MUG_C (129.16: cx 1754). The source mug is visible left of the owl at 128.04 (x~1258-1325,
    y~562-647), sits left of the lid and is hidden by it 128.64-128.96 (128.64: x~1475-1558; 128.76: x~1508-1583), and
    reappears right of the lid at 129.04 (x~1667-1742) without its handle. NOW: hidden under the owl at 128.04, then drawn
    80-100 px too far right with its handle showing on the right of the lid 128.60-129.04 (at 128.92 a mug stands where the
    source shows only shelf). Fix: key the mug at 128.0, 128.4, 128.64, 128.76, 128.9, 129.04 from gridded crops; keep
    flip (handle hidden) until ~129.12; it is already drawn before the lid so keyed positions will be occluded correctly.
 1b.Lid edge-on 128.60-128.92 too light, no dark edge band. LIDBACK_LIT 0.86 (128.76) / 0.58 (128.84) gives a flat beige
    lid face (~186 at 128.76, y 500, x 1624-1690) where the source is 128-170; the source also shows a dark band along the
    near edge (128.76, y 650, x 1576-1612: 107-150) that NOW lacks (171 flat). At 128.84 the far edge is ~35 px too far
    right (y 500: source ~1666, NOW ~1702; LID_END TL/BL). Fix: roughly halve LIDBACK_LIT over 128.68-128.88, paint a
    ~20-30 px dark edge strip (107,83,71 -> 150,125,103) along the near long edge 128.6-128.92, pull the far edge in.
 2. Notebook twists 121.72-122.40 (defects/02*). NOTEBOOK_K changes corner identity between the 121.8 key
    [(1842,740),(2146,757),(2126,855),(1718,825)] and the 122.4 key [(1647,839),(1933,755),(2319,795),(2004,922)]:
    corner 0 moves 195 px left while corner 3 moves 286 px right, the quad crosses itself, the page strip curls into a
    detached "hook" (122.04 at x~1690-1740, y~815-865) and the book is ~95 px short on its spine end. Fix: re-key 122.0,
    122.2, 122.4 on gridded crops with the same physical corners as 121.8 (spine edge = c0-c3, the end by the pencil, x
    ~1685-1730 at 122.04). The pencil track itself matches.
 3. Keyboard washed out 121.5-127.8 (defects/03*). paintBaseTop(side=true) uses a light well (#8f8884) and wide light gaps;
    keyboard p10/p50/p90 at 125.04: source 40/73/128, NOW 47/68/180 (126.04 same); at 121.52 keys p10 16 vs 49. At viewing
    size the keyboard reads as a pale grid instead of black keys (film.mp4 was closer here). Fix: side view with a dark well
    (~#3a3432), gaps no more than ~15 levels above the keys, keys ~(70,62,58); verify p90 ~130 at 125.04.
 4. Stray "tag" on the designer 121.4-127.6 (defects/04*). A pale rectangle with a dark outline and hanging strands under
    the beanie's right brim (125.04 at x~1095-1135, y~455-560; 121.52 x~150-185, y~490-545; 122.04 x~320-345; 127.04
    x~1100-1140, y~460-520). Not in the source. It rides with him, so it is in the 125.0 designer trace. Fix: delete it from
    that trace (and any dkey carrying it) and refill with brim/hair/background.
 5. Designer drawing heavier and posterised than the source (defects/05, 10, 11). Dark coverage (L<60) at 125.04: hair
    54.4% vs 49.3%, beanie 20.6% vs 17.9%, face 33.7% vs 30.6%; a coarse dark cross-hatch "net" on the beanie crown (x~620-760,
    y~60-130), flat pink blush blocks, ragged hair edges. 127.92-128.48 the beanie's right outline is doubled (two contours
    6-12 px apart, x~1060-1100) and torn. Fix: thin ink ~20% (or erode 0.5 px), halve the crown hatch alpha, blur the flat
    fill (not the ink) by sigma ~1.2-1.5 px; in the key cross-fade take the outline from one view only.
 6. Page owl 117.92-125.40, and a pop at 125.40 (defects/06*). pageTexCanvas(true) paints the hand-built drawOwl(PAGE_OWL):
    a white bun with horizontal wings; the source's page owl sits upright with big eyes and dark headphones. At 125.40 it
    switches to the traced owl (bigger, head ~15 px higher): a visible jump right where the viewer looks. Fix: bake
    owlTraceAt(125.40) into the page texture through inverse(SCREEN at 125.40) instead of drawOwl(PAGE_OWL).
 7. Left edge 128.72-129.20: the chair is missing, then pops in at 129.12 (defects/07*). The source shows the dark brown
    chair back at the left edge from ~128.7 on (129.04: x 0-110, y ~580-870). NOW shows light background until 129.08. The
    designer's left back outline there is a straight polygon edge with a light fringe; stray dark crack lines on the desk at
    129.16-129.28 (x~20-150, y~830-930). Fix: carry the chair from the 129.28 room trace back to 128.7 with the wall track,
    re-trace the jacket's left outline in the 128.92-129.12 keys, remove the crack lines.
 8. Whip blur ends two frames early (defects/08*). WHIP_FX amount 0.035 at 117.76 and 0.02 at 117.80; the source still
    streaks the periphery (lid edge, speakers). Fitted with the __s27dbg.zb hook (periphery sigma2 diff): 117.76 amount x1.6-
    2.3 (0.056-0.08, floor 0.6): 7.18 -> 6.52; 117.80 x2.3 (0.046): 6.06 -> 5.30; 117.72, 117.84, 117.88 already best.
 9. Owl behind the lid 129.12-129.28 (defects/09). Beak drawn outside the head (129.20-129.24, x~1245-1260, y~590-610), a
    torn left head edge, a ghost speaker disc over his sleeve at 129.20 (x~1180-1230, y~480-530; the source hides it until
    129.28), a white hole in the sleeve at 129.28 (x~1205-1240, y~455-500). Fix: clip the moved 129.00 trace to the owl
    silhouette, drop the speaker from the room key until 129.28, fill the sleeve hole.
10. Props flat (defects/12). Mug flat white, 20-27 levels too light at 127.04 with no shading (source cream, speckled, darker
    right side); notebook a thin flat orange pad vs a dark-outlined hardcover with a 20-30 px page block and rounded spine.
11. Grain (defects/13): NOW's grain is a fine regular row lattice, the source's coarse and organic. This is the film grade
    (src/lib/post.js), not s27; flag for whoever owns post.js.
12. Lid edge-on sliver 128.56-128.64 thinner than the source (known gap, defects/14).

Timing: every beat lands on the source frames (pull-back, hold, the swing and his entry at ~120.9, the owl's climb out,
flight, landing at ~126.9, blink/wink, the end orbit, the lid edge-on at ~128.6).
