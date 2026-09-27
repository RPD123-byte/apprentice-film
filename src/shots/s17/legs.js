// s17's trousers (fix pass 2): the designer's legs under the desk, engraved as the source draws them — long straight
// scratchboard strands along each leg's axis (the screen-left leg runs from the knee at its top left down to the
// ankle at its lower right, the screen-right leg mirrors it), crisp lit fold planes, dark crevices, the hems bunched in
// two folds over the boots. Pass 1 cut F1's value study with LIC swirls and blotchy highlights (the reviewer: "swirly,
// brushed-metal streaks with glossy bright blobs", σ2 30.6 in the box). Here the value study is a set of crisp
// facets read off the owl-free plate's σ3 value map (median of 48.8–50.4 s, 6 levels at 2.5x), carved by carve()
// with one stroke direction per facet (measured along the plate's strands), then crevices, ridges and the outline.
// Page coordinates; everything drawn in code.
import { PI, clamp, grey, S, carve, ink, fill, fillSoft, softLine, rng } from "./kit.js";

// the outlines (pass 1's, which follow the plate's leg edges within ~3 px; the right leg's inner edge re-read)
const LEGL = [[937, 556], [981, 553], [1012, 583], [1026, 617], [1036, 636], [1041, 681], [1061, 727], [1057, 750], [1066, 777], [1058, 797], [1030, 800], [990, 793], [955, 792], [944, 781], [947, 758], [931, 752], [925, 730], [927, 691], [931, 647], [933, 591], [935, 562]];
const LEGR = [[1180, 566], [1206, 560], [1230, 560], [1257, 564], [1274, 588], [1279, 612], [1290, 637], [1289, 690], [1270, 706], [1256, 713], [1252, 747], [1246, 768], [1231, 786], [1200, 794], [1150, 796], [1127, 790], [1124, 759], [1129, 729], [1141, 703], [1153, 668], [1166, 630]];
const LAP = [[1000, 550], [1178, 550], [1176, 572], [1166, 630], [1153, 648], [1100, 646], [1039, 650], [1030, 620], [1014, 583]];

// value painter: facets as crisp polygons (lightly softened by vblur), soft strips for the strands
function study(base, facets, strips) {
  return (v) => {
    v.fillStyle = grey(base); v.fillRect(880, 530, 460, 300);
    for (const [pts, val, b] of facets) fillSoft(v, S(pts, false), grey(val), b ?? 1.2);
    for (const [pts, w, val, b] of strips) softLine(v, pts, w, grey(val), b ?? 1.5);
  };
}
// a leg: the black ground; the study carved facet by facet (each facet's clip polygon and stroke direction, measured
// along the plate's strands); crevices, ridges, the outline
function leg(g, outline, vp, facets, crev, ridges, seed) {
  fill(g, S(outline, false), grey(0.02));
  g.save(); g.beginPath(); for (const [i, p] of outline.entries()) (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
  const opts = { per: 3.5, lum: 0.98, wExp: 0.8, jit: 0.42, wj: 0.45, bj: 0.35, wav: 0.2, wavL: 40, sw: 0.35, swL: 16, brk: 0.5, brkL: 12, streak: 0.45, stL: 18, bg: 0.14, soft: 1.6, vblur: 1.0 };
  facets.forEach(([poly, ang, o], k) => carve(g, S(poly, false), { ...opts, ...(o || {}), ang, vp, seed: seed + k }));
  // dark crevices: tapered black strokes (the source's fold shadows are crisp, 2–5 px)
  for (const [pts, w] of crev) ink(g, pts, w, "#030303", { smooth: true, ends: 0.15, jit: 0.25, seed: seed + Math.round(pts[0][0] + pts[0][1]) });
  // lit ridges: thin bright strokes on the fold tops
  for (const [pts, w, v] of ridges) ink(g, pts, w, grey(v, 0.9), { smooth: true, ends: 0.2, jit: 0.2, seed: seed + 7 + Math.round(pts[0][0]) });
  g.restore();
  ink(g, outline, 1.5, "#040404", { closed: true, seed: seed + 99, jit: 0.2 });
}

export function paintTrousers(g) {
  // the lap between the legs, under the desk: dark, a few faint strands (the plate reads ~0.1–0.2 there)
  // (plate at 4x: the thighs' dim strands converge from both knees to a dark V at (1100, 640) — the screen-left thigh's
  // run down-right at ~32°, the screen-right thigh's down-left at ~148°; the knees' tops lit a little at the corners)
  fill(g, S(LAP, false), grey(0.03));
  const lapV = (v) => {
    v.fillStyle = grey(0.1); v.fillRect(990, 540, 200, 120);
    for (const [pts, w, val] of [[[[1010, 578], [1050, 598], [1090, 626]], 16, 0.26], [[[1030, 572], [1070, 592], [1096, 612]], 8, 0.3], [[[1180, 584], [1140, 604], [1106, 628]], 16, 0.26], [[[1166, 578], [1130, 596], [1108, 612]], 8, 0.3]]) softLine(v, pts, w, grey(val), 3);
    fillSoft(v, S([[1004, 558], [1036, 558], [1030, 578], [1008, 574]], false), grey(0.42), 1.5);
    fillSoft(v, S([[1160, 560], [1194, 560], [1190, 580], [1168, 582]], false), grey(0.42), 1.5);
    fillSoft(v, S([[1080, 626], [1120, 626], [1100, 652]], false), grey(0.03), 3);
  };
  const lapO = { vp: lapV, vblur: 1.5, per: 3.6, soft: 1.8, bg: 0.1, brk: 0.55, brkL: 16, lum: 0.8, wj: 0.4, bj: 0.4, streak: 0.5, stL: 20, wav: 0.1 };
  g.save(); g.beginPath(); g.rect(980, 540, 120, 130); g.clip(); carve(g, S(LAP, false), { ...lapO, ang: 0.56, seed: 1200 }); g.restore();
  g.save(); g.beginPath(); g.rect(1100, 540, 100, 130); g.clip(); carve(g, S(LAP, false), { ...lapO, ang: PI - 0.56, seed: 1201 }); g.restore();
  // ---- screen-left leg (plate σ3 value map at 2.5x): strands down-right at ~47° in the upper leg ((960, 585) ->
  //      (1030, 660)); the lit band (0.7, core 0.9 at (995–1045, 725–750)) runs at ~30° from (962, 690) to (1050, 740);
  //      a dark hollow left of it (943–985, 705–745); under it the hem's V fold, its right arm lit from (975, 757) to
  //      (1045, 792); a lit rim down the outer edge
  leg(g, LEGL,
    study(0.27, [
      [[[944, 648], [966, 648], [1006, 686], [1052, 730], [1052, 746], [990, 752], [968, 748], [958, 712], [944, 690]], 0.72],
      [[[982, 745], [1000, 736], [1036, 725], [1051, 732], [1044, 746], [1000, 753]], 1.0],
      [[[945, 710], [960, 707], [980, 738], [968, 748], [948, 736]], 0.05, 0.8],
      [[[1026, 762], [1046, 762], [1058, 778], [1054, 796], [1036, 790]], 0.74],
      [[[936, 572], [990, 566], [1000, 590], [950, 598]], 0.3, 2],
    ], [
      [[[948, 640], [968, 670], [990, 700]], 12, 0.62], [[[966, 670], [985, 690], [1000, 703]], 8, 0.7],
      [[[962, 588], [996, 624], [1030, 660]], 12, 0.52], [[[992, 600], [1018, 626], [1044, 650]], 9, 0.46], [[[944, 604], [962, 630]], 6, 0.35],
      [[[936, 632], [940, 670], [944, 700]], 6, 0.42, 1.4],
      [[[976, 758], [1010, 772], [1046, 790]], 10, 0.58], [[[986, 753], [1040, 758]], 4, 0.08, 1],
      [[[936, 752], [950, 770], [952, 790]], 7, 0.3],
    ]),
    [
      [[[920, 540], [1070, 540], [1070, 700], [1000, 682], [960, 672], [920, 660]], 0.83],
      [[[920, 660], [960, 672], [1000, 682], [1070, 700], [1070, 752], [990, 756], [920, 752]], 0.52],
      [[[920, 752], [990, 756], [1070, 752], [1070, 810], [920, 810]], 0.43, { per: 3.0 }],
    ],
    [[[[946, 708], [962, 726], [972, 744]], 3.2], [[[984, 753], [1020, 755], [1046, 758]], 2.6], [[[952, 792], [1000, 792], [1054, 798]], 2.2],
      [[[1004, 604], [1016, 626], [1030, 648]], 1.8], [[[944, 612], [950, 632], [954, 650]], 1.6]],
    [[[[966, 690], [1000, 706], [1030, 722], [1052, 734]], 1.5, 0.92], [[[937, 632], [941, 676], [943, 702]], 1.2, 0.62], [[[978, 758], [1012, 772], [1044, 788]], 1.3, 0.85]],
    1210);
  // ---- screen-right leg: strands down-left at ~125° ((1236, 590) -> (1166, 694)); the lit wedge (0.7, core 0.9 from
  //      (1185, 745) up to (1205, 695)) with its apex at (1212, 672); a lit strand left of it ((1150, 725) -> (1186,
  //      682)); a lit strip at (1230–1248, 725–768); the pocket flap at the knee lit low ((1225–1250, 650–710), core at
  //      (1240, 700)); the hem's band (1140–1230, 752–764) over a dark crease at y ~770
  leg(g, LEGR,
    study(0.27, [
      [[[1152, 752], [1182, 712], [1212, 672], [1222, 684], [1230, 748], [1196, 756]], 0.78],
      [[[1174, 748], [1188, 722], [1204, 690], [1213, 700], [1210, 748]], 1.0],
      [[[1230, 722], [1246, 724], [1252, 768], [1234, 770]], 0.8],
      [[[1232, 746], [1247, 748], [1252, 770], [1234, 770]], 1.0],
      [[[1226, 650], [1240, 644], [1252, 700], [1246, 714], [1230, 702]], 0.72],
      [[[1236, 692], [1248, 692], [1250, 708], [1240, 708]], 0.9],
      [[[1250, 612], [1266, 616], [1272, 640], [1256, 642]], 0.5],
      [[[1168, 606], [1204, 606], [1200, 642], [1172, 640]], 0.5, 2],
      [[[1216, 576], [1250, 576], [1248, 600], [1220, 600]], 0.35, 2],
    ], [
      [[[1150, 724], [1168, 702], [1188, 680]], 9, 0.62],
      [[[1204, 650], [1178, 684], [1152, 710]], 10, 0.48], [[[1238, 596], [1214, 626], [1196, 654]], 10, 0.46],
      [[[1140, 756], [1190, 756], [1232, 760]], 8, 0.62], [[[1146, 771], [1196, 772], [1240, 774]], 4, 0.06, 1],
      [[[1130, 790], [1160, 794], [1180, 796]], 8, 0.45],
    ]),
    [
      [[[1110, 540], [1300, 540], [1300, 752], [1110, 752]], 2.18],
      [[[1222, 640], [1270, 640], [1270, 720], [1222, 720]], 1.75],
      [[[1110, 752], [1300, 752], [1300, 810], [1110, 810]], 0.05, { per: 3.0 }],
    ],
    [[[[1256, 600], [1258, 650], [1254, 704]], 2.2], [[[1148, 770], [1196, 772], [1242, 776]], 2.6], [[[1160, 732], [1148, 748]], 2.0],
      [[[1222, 690], [1226, 718], [1230, 744]], 1.8], [[[1222, 650], [1226, 676]], 1.6], [[[1136, 700], [1130, 730]], 1.6]],
    [[[[1212, 674], [1196, 700], [1178, 726], [1160, 748]], 1.5, 0.92], [[[1228, 652], [1240, 676], [1250, 704]], 1.3, 0.8], [[[1142, 756], [1190, 754], [1232, 760]], 1.3, 0.85]],
    1230);
  void clamp; void PI; void rng;
}
