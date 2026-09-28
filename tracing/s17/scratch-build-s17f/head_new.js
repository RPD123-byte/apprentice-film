// The designer's head, redrawn from 5x grids of the source at 50.0 s: a lean pale face lit by the laptop, narrow
// heavy-lidded almond eyes with the irises in the left corners (a sidelong glance at the owl), dark bags, thin
// slanted brows, clumped black locks over the forehead and cheeks, a dark knit beanie with a folded cuff, and
// closed-back headphones round his neck. eye = { dx, lid }: the eye-follow beat (irises further left, lids lower).
function head(g, gaze, eye = {}) {
  const down = gaze !== "owl";
  const edx = eye.dx || 0, elid = eye.lid || 0;
  // ---- neck: bright in the laptop light, a soft shadow under the jaw
  soft(g, pth([[1046, 360], [1098, 360], [1102, 404], [1072, 416], [1042, 404]]), lg(g, 0, 362, 0, 412, [[0, 0.3], [0.35, 0.62], [1, 0.9]]));
  soft(g, pth([[1048, 364], [1060, 366], [1058, 400], [1046, 398]]), grey(0.45), 4, 0.6);
  curve(g, [[1050, 372], [1048, 392], [1046, 404]], 1.1, grey(0.25, 0.6), { seed: 1699 });
  curve(g, [[1094, 372], [1096, 392], [1099, 404]], 1.1, grey(0.25, 0.6), { seed: 1698 });
  // ---- hair behind the face: a black mass framing it down to about the jaw, ragged at the ends
  const hairBack = [[996, 258], [993, 290], [996, 318], [1000, 338], [1008, 350], [1018, 346], [1030, 330], [1070, 300], [1112, 330], [1126, 348], [1138, 352], [1147, 336], [1151, 306], [1150, 270], [1070, 244]];
  fillBlob(g, hairBack, grey(0.03));
  // ears, half hidden by the hair
  for (const [pts, seed] of [[[[1020, 302], [1009, 300], [1005, 310], [1008, 324], [1016, 333], [1022, 330]], 1702], [[[1126, 302], [1136, 299], [1141, 308], [1139, 320], [1132, 330], [1126, 328]], 1703]]) {
    soft(g, pth(pts), lg(g, pts[1][0], 0, pts[4][0], 0, [[0, 0.42], [1, 0.62]]));
    curve(g, pts, 1, grey(0.12, 0.8), { closed: true, seed, ends: 0.8 });
  }
  // ---- face
  const F = [[1019, 274], [1018, 300], [1021, 322], [1028, 342], [1040, 359], [1056, 372], [1070, 378], [1084, 376], [1099, 367], [1112, 352], [1121, 334], [1127, 310], [1128, 284], [1124, 262], [1070, 252], [1022, 258]];
  fillBlob(g, F, grey(0.55));
  g.save(); g.beginPath(); smoothPath(g, F, true); g.clip();
  soft(g, pth(F), rg(g, 1068, 326, 8, 72, [[0, 0.97], [0.55, 0.92], [0.85, 0.8], [1, 0.62]]));
  soft(g, Rc(1000, 244, 150, 26), grey(0.38), 6, 0.85);                                                  // forehead in the hair's shadow
  soft(g, pth([[1106, 292], [1129, 288], [1130, 330], [1116, 354], [1106, 334]]), grey(0.6), 7, 0.75);   // his left cheek, turned from the light
  soft(g, pth([[1016, 296], [1027, 298], [1031, 344], [1020, 334]]), grey(0.66), 6, 0.7);               // his right cheek edge
  soft(g, pth([[1098, 312], [1114, 308], [1112, 346], [1100, 340]]), grey(0.74), 6, 0.55);              // under the cheekbone
  // sockets and the dark tired bags under the eyes
  for (const [x, w] of [[1037, 22], [1104, 23]]) {
    soft(g, E(x, 283, w, 11, 0), grey(0.6), 4, 0.7);
    soft(g, E(x + 1, 297.5, w * 0.78, 5, 0), grey(0.36), 3, 0.85);
    soft(g, E(x + 3, 301, w * 0.6, 3, 0), grey(0.55), 2.5, 0.5);
  }
  // nose: shade down its left flank and under the tip; the lit tip
  soft(g, pth([[1054, 292], [1061, 292], [1063, 322], [1055, 318]]), grey(0.66), 2.6, 0.75);
  soft(g, pth([[1081, 300], [1087, 304], [1089, 326], [1081, 324]]), grey(0.7), 2.6, 0.6);
  soft(g, E(1073, 333.5, 15, 3.2, 0), grey(0.5), 2, 0.85);
  soft(g, E(1072, 322, 6, 5, 0), grey(1), 3, 0.7);
  // mouth and chin
  soft(g, E(1072, 356, 15, 3.6, 0), grey(0.62), 2.2, 0.8);
  soft(g, E(1071, 368, 20, 6, 0), grey(0.82), 4, 0.5);
  soft(g, E(1072, 380, 40, 8, 0), grey(0.42), 5, 0.85);
  // pencil shading over it (dark lines where the value study is dark)
  const v = valCtx();
  v.fillStyle = "#fff"; v.fillRect(1000, 244, 140, 140);
  vFill(v, [[1106, 292], [1129, 288], [1130, 330], [1116, 354], [1106, 334]], 0.5, { blur: 5 });
  vFill(v, [[1016, 296], [1027, 296], [1031, 342], [1020, 334]], 0.55, { blur: 5 });
  vFill(v, [[1000, 244], [1140, 244], [1140, 270], [1000, 270]], 0.45, { blur: 5, smooth: false });
  vFill(v, [[1030, 362], [1112, 360], [1112, 384], [1030, 384]], 0.55, { blur: 4, smooth: false });
  hatch(g, F, { ang: 2.05, per: 2.2, seed: 1706, base: false, inv: true, lum: 0.2, alpha: 0.28, gamma: 1.5 });
  g.restore();
  curve(g, [[1018, 296], [1021, 322], [1028, 342], [1040, 359], [1056, 372], [1070, 378], [1084, 376], [1099, 367], [1112, 352], [1121, 334], [1127, 310]], 1.1, grey(0.12, 0.9), { seed: 1710, ends: 0.3 });
  // ---- eyes: narrow almond openings under a heavy upper lid; greyish whites; the irises in the left corners
  const eyes = [
    { x0: 1020, x1: 1053, cx: 1037, ix: (down ? 1038.5 : 1032.5) + edx, seed: 1720, side: -1 },
    { x0: 1087, x1: 1122, cx: 1104, ix: (down ? 1103 : 1096) + edx, seed: 1730, side: 1 },
  ];
  for (const { x0, x1, cx, ix, seed, side } of eyes) {
    const lid = (down ? 1.8 : 0) + elid;
    const top = (x) => { const u = (x - x0) / (x1 - x0); return 287 - 6.2 * Math.sin(Math.PI * Math.pow(u, side < 0 ? 0.85 : 1.15)) + lid * Math.sin(Math.PI * u); };
    const bot = (x) => { const u = (x - x0) / (x1 - x0); return 287.5 + 4.6 * Math.sin(Math.PI * Math.pow(u, side < 0 ? 1.2 : 0.8)); };
    const eyePts = [];
    for (let i = 0; i <= 12; i++) { const x = x0 + (x1 - x0) * i / 12; eyePts.push([x, top(x)]); }
    for (let i = 12; i >= 0; i--) { const x = x0 + (x1 - x0) * i / 12; eyePts.push([x, bot(x)]); }
    polyPath(g, eyePts); g.fillStyle = grey(0.7); g.fill();
    g.save(); polyPath(g, eyePts); g.clip();
    soft(g, E(ix + 10, 289, 9, 3, 0), grey(0.82), 2, 0.7);                      // light on the white beside the iris
    const iy = 287.5 + (down ? 1.6 : 0) + elid * 0.4;
    dot(g, ix, iy, 6.4, grey(0.24)); dot(g, ix, iy, 5, grey(0.1)); dot(g, ix, iy, 2.6, grey(0.01));
    dot(g, ix + 1.8, iy - 2.2, 1.1, grey(0.92));
    soft(g, Rc(x0, 276, x1 - x0, 7.5 + lid), grey(0.06), 1.5, 0.92);          // the heavy lid's shadow across the top
    g.restore();
    // upper lid: a heavy dark stroke, running on past the outer corner; a few lashes there
    const up = []; for (let i = 0; i <= 10; i++) { const x = x0 - 2 + (x1 - x0 + 4) * i / 10; up.push([x, top(Math.max(x0, Math.min(x1, x))) - 0.3]); }
    curve(g, up, 3.2, grey(0.03), { seed, ends: 0.25 });
    const ox = side < 0 ? x0 : x1;
    for (let k = 0; k < 3; k++) ink(g, [[ox + side * (1 - k * 2.2), 287 - k * 1.6], [ox + side * (4.5 - k * 1.5), 283.5 - k * 2]], 0.9, grey(0.05, 0.85), { seed: seed + 10 + k });
    // lower lid, the double-lid crease above, the bag line below
    const lo = []; for (let i = 1; i < 10; i++) { const x = x0 + (x1 - x0) * i / 10; lo.push([x, bot(x) + 0.4]); }
    curve(g, lo, 1.2, grey(0.2, 0.85), { seed: seed + 2 });
    curve(g, [[x0 + 2, 279], [cx - 6, 274.5], [cx + 7, 274.5], [x1 - 2, 279.5]], 1.1, grey(0.22, 0.75), { seed: seed + 1, ends: 0.3 });
    curve(g, [[x0 + 3, 297], [cx, 302.5], [x1 - 4, 297.5]], 1.3, grey(0.2, 0.6), { seed: seed + 3 });
  }
  // brows: thin, dark, slanting up toward the middle (worried)
  curve(g, [[1024, 270.5], [1036, 267], [1052, 264.5]], 2.8, grey(0.05), { seed: 1740, ends: 0.25 });
  curve(g, [[1084, 266], [1098, 265.5], [1114, 268]], 2.8, grey(0.05), { seed: 1741, ends: 0.25 });
  // nose: the bridge's left edge, the rounded tip and wings, nostrils
  curve(g, [[1058, 292], [1059, 306], [1061, 320]], 1, grey(0.32, 0.65), { seed: 1742 });
  curve(g, [[1058, 322], [1060, 329], [1066, 332], [1073, 332.5], [1080, 332], [1086, 329], [1088, 322]], 1.3, grey(0.22, 0.8), { seed: 1743 });
  soft(g, E(1065, 329.5, 2.4, 1.4, 0.2), grey(0.12), 0.6, 0.9); soft(g, E(1081, 329.5, 2.4, 1.4, -0.2), grey(0.12), 0.6, 0.9);
  curve(g, [[1085, 312], [1088, 323]], 1, grey(0.3, 0.6), { seed: 1744 });
  // mouth: a small tired line, down at the corners; a fuller lower lip
  curve(g, [[1050, 350], [1060, 347.8], [1071, 347.4], [1082, 347.6], [1093, 350.5]], 1.9, grey(0.1), { seed: 1745, ends: 0.25 });
  curve(g, [[1060, 343.5], [1071, 342.8], [1084, 343.5]], 0.9, grey(0.45, 0.5), { seed: 1746 });
  curve(g, [[1060, 357], [1072, 358.5], [1086, 357]], 1.1, grey(0.35, 0.65), { seed: 1747 });
  // sweat
  for (const [x, y, l] of [[1032, 316, 6], [1105, 334, 5], [1109, 322, 4], [1046, 258, 3], [1095, 256, 3]]) { ink(g, [[x, y], [x + 0.4, y + l]], 1.6, grey(0.3, 0.75), { seed: x }); dot(g, x + 0.4, y + l, 1.2, grey(0.95, 0.85)); }
  // ---- beanie: dark grey knit, vertical ribs, a deep folded cuff down over the ears
  const B = [[997, 262], [993, 240], [996, 214], [1003, 195], [1014, 180], [1031, 167], [1055, 160], [1081, 160], [1105, 165], [1124, 178], [1136, 195], [1143, 215], [1145, 240], [1144, 263], [1130, 255], [1110, 248], [1090, 244], [1070, 243], [1050, 245], [1030, 250], [1010, 257]];
  fillBlob(g, B, grey(0.19));
  g.save(); g.beginPath(); smoothPath(g, B, true); g.clip();
  soft(g, pth(B), rg(g, 1060, 180, 8, 120, [[0, 0.3], [0.5, 0.22], [1, 0.12]]));
  soft(g, pth([[1112, 170], [1150, 200], [1150, 270], [1122, 252], [1112, 220]]), grey(0.1), 12, 0.6);
  // knit ribs: the crown's converge toward the top, the cuff's run straight down; each rib a light and a dark line
  const rb = rng(1750);
  for (let i = 0; i < 64; i++) {
    const x = 994 + i * 2.35 + rb() * 0.5, d = (x - 1068) / 76;
    curve(g, [[1068 + (x - 1068) * 0.35, 162 + d * d * 30], [1068 + (x - 1068) * 0.8, 185 + d * d * 10], [x, 205]], 0.9, grey(0.42, 0.28 + 0.12 * rb()), { seed: 1751 + i, ends: 0.4 });
    ink(g, [[x + 0.9, 214], [x + 0.9 + d * 2, 262]], 1.0, grey(0.4, 0.3 + 0.15 * rb()), { seed: 1830 + i });
    ink(g, [[x - 0.2, 214], [x - 0.2 + d * 2, 262]], 0.7, grey(0.04, 0.5), { seed: 1900 + i });
  }
  soft(g, pth([[990, 208], [1070, 200], [1152, 208], [1152, 226], [1070, 218], [990, 226]]), grey(0.34), 5, 0.55);   // the cuff's roll catches light
  soft(g, pth([[990, 201], [1070, 196.5], [1152, 203], [1152, 209], [1070, 203], [990, 210]]), grey(0.03), 1.4, 0.95); // the fold
  soft(g, pth([[990, 246], [1070, 236], [1152, 246], [1152, 270], [990, 270]]), grey(0.07), 6, 0.55);                // shade toward the brim
  g.restore();
  curve(g, B, 1.1, grey(0.28, 0.7), { closed: true, seed: 1901, ends: 0.9 });
  // ---- hair in front: black locks falling from under the cuff, clumped and tapering, each with a thin sheen
  const lock = (pts, w, sheen = 0.35) => {
    const q = sampleCurve(pts, 8);
    taper(g, q, (u) => w * Math.pow(1 - u, 0.8) + 0.35, grey(0.02));
    if (sheen > 0) {
      const s2 = q.slice(1, Math.floor(q.length * 0.75)).map(([x, y], i, a) => { const b = a[Math.min(a.length - 1, i + 1)], c = a[Math.max(0, i - 1)], dx = b[0] - c[0], dy = b[1] - c[1], L = Math.hypot(dx, dy) || 1; return [x - dy / L * w * 0.2, y + dx / L * w * 0.2]; });
      if (s2.length > 2) taper(g, s2, (u) => 0.9 * Math.sin(Math.PI * u), grey(0.5, sheen));
    }
  };
  // the fringe under the cuff: a ragged black band
  fillBlob(g, [[997, 256], [1030, 249], [1070, 245], [1110, 249], [1144, 260], [1144, 272], [1130, 270], [1118, 280], [1108, 268], [1096, 276], [1086, 266], [1074, 272], [1066, 262], [1056, 276], [1046, 266], [1036, 276], [1026, 268], [1012, 284], [998, 280]], grey(0.02));
  const locks = [
    [[[1003, 256], [1006, 280], [1011, 306], [1010, 334], [1004, 350]], 11], [[[1014, 258], [1019, 280], [1022, 302], [1020, 322]], 8],
    [[[1026, 256], [1031, 268], [1035, 280]], 6], [[[1038, 254], [1044, 266], [1047, 276]], 6],
    [[[1050, 250], [1055, 268], [1056, 288], [1053, 302]], 8], [[[1060, 252], [1063, 270], [1061, 290]], 5],
    [[[1072, 252], [1078, 264], [1082, 274]], 6], [[[1086, 254], [1094, 266], [1099, 278]], 6],
    [[[1100, 256], [1110, 270], [1116, 286]], 7], [[[1112, 256], [1121, 276], [1126, 300], [1128, 326], [1124, 346]], 10],
    [[[1128, 262], [1136, 290], [1140, 318], [1136, 344]], 9], [[[1044, 256], [1040, 270], [1034, 280]], 4],
  ];
  const rh = rng(1905);
  for (const [pts, w] of locks) { lock(pts, w); lock(pts.map(([x, y], i) => [x + (rh() - 0.5) * 5 * i, y + (rh() - 0.3) * 3 * i]), w * 0.45, 0); }
  // loose ends at the sides, past the jaw
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
    const x = side < 0 ? 1000 + rh() * 14 : 1128 + rh() * 16, y = 290 + rh() * 40, len = 18 + rh() * 26, out = (rh() - 0.2) * 12;
    lock([[x, y], [x + side * out * 0.3, y + len * 0.5], [x + side * out, y + len]], 3 + rh() * 3, 0.2);
  }
  // a few fine strands with a grey sheen
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, x = side < 0 ? 996 + rh() * 22 : 1124 + rh() * 22, y = 262 + rh() * 30;
    const q = sampleCurve([[x, y], [x + side * 3, y + 20 + rh() * 12], [x + side * (5 + rh() * 8), y + 34 + rh() * 20]], 8);
    taper(g, q, (u) => (1 + rh() * 0.6) * Math.sin(Math.PI * u), grey(0.35 + rh() * 0.2, 0.6));
  }
  // ---- headphones round his neck: closed-back cups seen near edge-on, the ribbed cushions toward the neck
  curve(g, [[1004, 386], [1030, 368], [1070, 362], [1110, 366], [1136, 384]], 4, grey(0.05), { seed: 1700 });
  for (const [cx, cy, rx, ry, a, sd] of [[1026, 406, 20, 34, 0.08, -1], [1117, 400, 17, 31, -0.1, 1]]) {
    g.save(); g.translate(cx, cy); g.rotate(a);
    // outer shell: dark, a lit rim on the side away from the neck
    soft(g, E(0, 0, rx, ry, 0), rg(g, sd * rx * 0.4, -ry * 0.3, 2, ry, [[0, 0.32], [1, 0.08]]));
    g.strokeStyle = grey(0.8, 0.85); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx - 1, ry - 1, 0, sd < 0 ? 1.9 : -1.2, sd < 0 ? 4.4 : 1.25); g.stroke();
    g.strokeStyle = grey(0.55, 0.6); g.lineWidth = 1.2; g.beginPath(); g.ellipse(sd * -2, 0, rx * 0.66, ry * 0.72, 0, 0, PI * 2); g.stroke();
    // the cushion: a ribbed band on the neck side
    const cxn = -sd * rx * 0.62;
    g.save(); g.beginPath(); g.ellipse(cxn, 0, rx * 0.42, ry * 0.9, 0, 0, PI * 2); g.clip();
    g.fillStyle = grey(0.14); g.fillRect(-rx * 2, -ry, rx * 4, ry * 2);
    for (let k = -ry; k < ry; k += 3.4) { g.strokeStyle = grey(0.75, 0.75); g.lineWidth = 1.3; g.beginPath(); g.moveTo(cxn - rx * 0.4, k); g.lineTo(cxn + rx * 0.4, k + 1.2); g.stroke(); }
    g.restore();
    g.strokeStyle = grey(0.03); g.lineWidth = 1.3; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.stroke();
    g.restore();
  }
}
