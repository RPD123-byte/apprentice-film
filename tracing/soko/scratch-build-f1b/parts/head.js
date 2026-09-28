// The designer's head: a long lean face bright in the laptop light, heavy tired eyes with dark bags, a small
// down-turned mouth, sweat beads; black shaggy hair falling from under a dark ribbed beanie with a deep cuff over
// the temples and ears. Measured on 4-8x grids and value profiles of the source at 50 s (gaze "owl": irises at
// the outer-left of both eyes) and of the framed page at 72 s (gaze "down": lids lower, irises centred low).
const strand = (g, pts, w0, w1, col, per = 8) => { const q = sampleCurve(pts, per); taper(g, q, (u) => lerp(w0, w1, u), col); };
function head(g, gaze) {
  const down = gaze !== "owl";
  const HK = grey(0.03);
  // neck: a thin shadow under the jaw, then lit by the screen
  const neck = [[1040, 358], [1104, 358], [1105, 380], [1110, 404], [1072, 414], [1034, 404], [1039, 380]];
  soft(g, pth(neck), lg(g, 0, 366, 0, 400, [[0, 0.3], [0.3, 0.5], [0.6, 0.8], [1, 0.95]]));
  soft(g, pth([[1088, 362], [1104, 362], [1108, 400], [1094, 402]]), grey(0.45), 5, 0.6);           // his left neck side, a little shaded
  soft(g, pth([[1040, 362], [1052, 362], [1050, 400], [1036, 402]]), grey(0.55), 5, 0.5);
  // face
  const F = [[1019, 262], [1020, 280], [1021, 298], [1022, 316], [1024, 332], [1030, 344], [1038, 355], [1048, 364], [1060, 372], [1072, 377], [1085, 373], [1096, 365],
    [1104, 355], [1112, 344], [1118, 334], [1122, 318], [1123, 300], [1124, 282], [1124, 262], [1100, 248], [1045, 248]];
  fillBlob(g, F, grey(0.7));
  g.save(); g.beginPath(); smoothPath(g, F, true); g.clip();
  soft(g, pth(F), rg(g, 1070, 322, 10, 66, [[0, 0.96], [0.6, 0.94], [0.85, 0.88], [1, 0.76]]));
  soft(g, pth([[1010, 248], [1140, 248], [1140, 266], [1010, 266]]), grey(0.38), 5, 0.9);             // the brim's shadow on the forehead
  soft(g, pth([[1016, 340], [1032, 344], [1044, 360], [1052, 372], [1030, 372], [1014, 356]]), grey(0.42), 3.5, 0.8);   // his right jaw, turning away
  soft(g, pth([[1128, 336], [1112, 342], [1104, 356], [1096, 370], [1116, 372], [1130, 352]]), grey(0.36), 3.5, 0.85);   // his left jaw
  soft(g, pth([[1060, 373], [1085, 373], [1080, 382], [1064, 382]]), grey(0.5), 2.5, 0.8);            // under the chin
  // sockets: pale grey over the lids, darker bags under the eyes
  for (const [cx, cy] of [[1037, 281], [1101, 281]]) soft(g, E(cx, cy, 20, 11, 0), grey(0.72), 4, 0.8);
  soft(g, pth([[1055, 286], [1060, 282], [1062, 300], [1057, 312], [1055, 300]]), grey(0.68), 2.5, 0.6); // the nose's left flank under the lock
  soft(g, pth([[1078, 294], [1085, 300], [1086, 324], [1079, 322]]), grey(0.7), 2.5, 0.7);              // the nose's shaded side
  soft(g, E(1071, 331.5, 11, 2.5, 0), grey(0.62), 1.8, 0.7);                                             // under the nose
  soft(g, E(1072, 356.5, 11, 2.4, 0), grey(0.62), 2, 0.75);                                              // the lower lip's shadow
  soft(g, E(1071, 339, 3, 5, 0), grey(0.84), 1.5, 0.6);                                                  // philtrum
  g.restore();
  // jaw and chin contour
  curve(g, [[1023, 330], [1030, 344], [1038, 355], [1048, 364], [1060, 372], [1072, 377.5], [1085, 373.5], [1096, 365.5], [1104, 356], [1112, 345]], 1.4, grey(0.2, 0.85), { seed: 1710, ends: 0.3 });
  // eyes
  const EY = [
    { o: [1022.6, 284.4], i: [1052, 286.3], up: [[1030.8, 280.6], [1040.8, 280], [1048.3, 281.9]], lo: [[1024, 288], [1037, 290], [1049.5, 288.5]],
      iris: down ? [1040, 287] : [1032, 285.2], crease: [[1024, 278.5], [1035, 275.5], [1049, 277.5]], bag: [[1023, 290.5], [1037, 295.5], [1051, 291]], side: -1, seed: 1720 },
    { o: [1117.6, 285], i: [1085, 285], up: [[1112, 281], [1102, 279.4], [1092, 280.6]], lo: [[1115.8, 287.7], [1099.5, 289.4], [1087, 287.7]],
      iris: down ? [1104.5, 287] : [1095, 285.6], crease: [[1114, 278], [1100, 275.5], [1086, 280]], bag: [[1116, 290.5], [1100, 295.8], [1086, 290.5]], side: 1, seed: 1730 },
  ];
  for (const e of EY) {
    const lidDrop = down ? 2.4 : 0;
    const up = e.up.map(([x, y], k) => [x, y + lidDrop * (k === 1 ? 1 : 0.8)]);
    soft(g, pth([e.o, ...e.crease, e.i, ...[...up].reverse()]), grey(0.55), 1.2, 0.85);        // the heavy lid
    soft(g, pth([[e.bag[0][0], e.bag[0][1] - 2.5], [e.bag[1][0], e.bag[1][1] - 4.5], [e.bag[2][0], e.bag[2][1] - 2.5], ...[...e.bag].reverse().map(([x, y]) => [x, y + 2])]), grey(0.34), 1.4, 0.9);
    const eye = [e.o, ...up, e.i, ...[...e.lo].reverse()];
    fillBlob(g, eye, grey(0.76));
    g.save(); g.beginPath(); smoothPath(g, eye, true); g.clip();
    soft(g, E((e.o[0] + e.i[0]) / 2 + 3, 288, 10, 2.5, 0), grey(0.86), 2, 0.6);
    const [ix, iy] = e.iris;
    dot(g, ix, iy, 4.5, grey(0.16)); dot(g, ix, iy, 3, grey(0.04));
    dot(g, ix + 1.7, iy - 1.1, 1.05, grey(0.94));
    soft(g, pth([[e.o[0] - 2, 270], [e.i[0] + 2, 270], [e.i[0] + 2, up[1][1] + 2], [e.o[0] - 2, up[0][1] + 2]]), grey(0.1), 1.1, 0.8);  // the lid's shadow on the eyeball
    g.restore();
    curve(g, [e.o, ...up, e.i], 2.9, grey(0.03), { seed: e.seed, ends: 0.35 });
    curve(g, [[e.o[0], e.o[1] + 0.6], [e.o[0] - e.side * 0.2 + (e.i[0] - e.o[0]) * 0.1, e.o[1] - 1.4]], 1.7, grey(0.03), { seed: e.seed + 5 });
    curve(g, e.crease, 1.2, grey(0.18, 0.85), { seed: e.seed + 1, ends: 0.3 });
    curve(g, e.lo, 1, grey(0.22, 0.85), { seed: e.seed + 2, ends: 0.3 });
    curve(g, e.bag, 1.2, grey(0.16, 0.75), { seed: e.seed + 3, ends: 0.2 });
  }
  // brows (the left one mostly under the hair)
  curve(g, [[1033, 267.5], [1043, 266.2], [1053, 268.2]], 3.1, grey(0.05), { seed: 1740, ends: 0.35 });
  curve(g, [[1083, 269], [1094, 265.8], [1104, 265.6], [1113, 267]], 3.3, grey(0.05), { seed: 1741, ends: 0.3 });
  // nose: the rounded tip, wings and nostrils
  curve(g, [[1060, 317], [1061.5, 324], [1065, 328], [1071.5, 329.8], [1078, 328], [1081.5, 324], [1083, 317]], 1.3, grey(0.2, 0.8), { seed: 1743 });
  soft(g, E(1065.5, 327, 2.3, 1.3, 0.3), grey(0.08), 0.6, 0.9); soft(g, E(1078.6, 327, 2.3, 1.3, -0.3), grey(0.08), 0.6, 0.9);
  curve(g, [[1082, 302], [1084, 312], [1083, 319]], 1, grey(0.3, 0.55), { seed: 1744 });
  // mouth: a small, tired, down-turned line
  curve(g, [[1051, 348.5], [1061, 346.6], [1071, 347.3], [1081, 346.5], [1091, 349]], 2.2, grey(0.12), { seed: 1745, ends: 0.2 });
  curve(g, [[1062, 342.6], [1071, 342], [1080, 342.6]], 0.9, grey(0.45, 0.4), { seed: 1746 });
  // ears (mostly under the hair)
  for (const [pts, seed] of [[[[1019, 298], [1009, 294], [1003, 301], [1004, 313], [1010, 321], [1019, 318]], 1690], [[[1124, 296], [1134, 293], [1140, 300], [1139, 312], [1133, 319], [1124, 316]], 1691]]) {
    soft(g, pth(pts), grey(0.42));
    curve(g, pts, 1, grey(0.1, 0.8), { seed, ends: 0.4 });
  }
  // side hair: dark masses over the temples, cheeks' edges and ears, with grey strands for volume
  const sideL = [[994, 262], [1016, 250], [1022, 262], [1021, 282], [1020, 296], [1014, 302], [1020, 318], [1021, 330], [1030, 350], [1026, 360], [1014, 364], [1004, 376], [994, 372], [988, 350], [988, 318], [990, 290]];
  const sideR = [[1126, 252], [1146, 262], [1150, 280], [1156, 300], [1158, 324], [1164, 350], [1172, 372], [1160, 370], [1146, 360], [1136, 352], [1128, 356], [1120, 348], [1124, 330], [1126, 318], [1128, 306], [1124, 296], [1124, 276]];
  fillBlob(g, sideL, HK); fillBlob(g, sideR, HK);
  const rh = rng(1905);
  for (const [side, x0, x1] of [[-1, 990, 1022], [1, 1122, 1160]]) {
    for (let i = 0; i < 26; i++) {
      const x = lerp(x0, x1, rh()), y = 258 + rh() * 50, len = 40 + rh() * 50, out = side * (2 + rh() * 10);
      strand(g, [[x, y], [x + out * 0.3, y + len * 0.5], [x + out, y + len]], 1 + rh() * 1.4, 0.2, grey(0.12 + rh() * 0.22, 0.8));
    }
    for (let i = 0; i < 7; i++) {           // pointed lock ends below the jaw line
      const x = side < 0 ? 992 + i * 5 + rh() * 3 : 1124 + i * 6 + rh() * 3, y = 330 + rh() * 16;
      strand(g, [[x, y], [x + side * 2, y + 18], [x + side * (4 + rh() * 6), y + 30 + rh() * 14]], 5 + rh() * 3, 0.3, HK);
    }
  }
  // beanie: dark grey knit, fine ribs, a deep cuff with a dark fold
  const B = [[991, 284], [989, 262], [989, 240], [992, 218], [999, 197], [1010, 181], [1025, 169], [1045, 162], [1068, 159.5], [1090, 161.5], [1110, 168], [1126, 178], [1137, 193],
    [1143, 210], [1146, 230], [1147, 250], [1147, 270], [1142, 276], [1132, 264], [1112, 252], [1085, 245], [1060, 244], [1035, 247], [1015, 256], [1001, 272]];
  const fold = [[990, 223], [1015, 212], [1035, 206], [1067, 202], [1100, 205], [1125, 211], [1146, 222]];
  fillBlob(g, B, grey(0.2));
  g.save(); g.beginPath(); smoothPath(g, B, true); g.clip();
  soft(g, pth(B), rg(g, 1068, 205, 10, 95, [[0, 0.3], [0.55, 0.25], [0.85, 0.17], [1, 0.1]]));
  soft(g, pth([[985, 204], [1070, 196], [1150, 204], [1150, 222], [1070, 214], [985, 224]]), grey(0.34), 4, 0.7);     // the cuff's rolled top catches light
  soft(g, pth([[985, 250], [1070, 238], [1150, 250], [1150, 290], [985, 290]]), grey(0.12), 6, 0.6);                  // shade toward the brim
  const rb = rng(1750);
  for (let i = 0; i < 68; i++) {
    const x = 991 + i * 2.35 + rb() * 0.6, d = (x - 1068) / 80;
    curve(g, [[1068 + (x - 1068) * 0.5, 160 + d * d * 22], [1068 + (x - 1068) * 0.85, 184 + d * d * 14], [x, 206]], 0.8, grey(rb() < 0.5 ? 0.42 : 0.06, 0.35), { seed: 1751 + i, ends: 0.4 });
    ink(g, [[x, 214], [x + d * 2, 290]], 0.9, grey(rb() < 0.5 ? 0.42 : 0.05, 0.4), { seed: 1830 + i });
  }
  g.restore();
  curve(g, fold, 2.2, grey(0.03, 0.9), { seed: 1900, ends: 0.3 });
  curve(g, B, 1.2, grey(0.3, 0.6), { closed: true, seed: 1902, ends: 0.9 });
  // fringe: locks from under the cuff over the forehead and brows, one thick lock between the eyes
  const L = [
    [[[1012, 250], [1016, 262], [1021, 274], [1024, 284]], 7, 0.4], [[[1022, 250], [1028, 260], [1033, 268]], 5, 0.3], [[[1032, 250], [1038, 258], [1043, 263]], 4, 0.3],
    [[[1040, 249], [1044, 256], [1045, 262]], 4, 0.3],
    [[[1062, 248], [1061, 258], [1058, 272], [1054, 288], [1052, 300], [1050.5, 308]], 7.5, 0.5], [[[1055, 249], [1050, 260], [1047, 272]], 4.5, 0.3],
    [[[1082, 247], [1076, 258], [1071, 270], [1067, 282], [1064, 290]], 5, 0.3], [[[1072, 248], [1068, 258], [1066, 268]], 4, 0.3],
    [[[1098, 250], [1104, 256], [1110, 262], [1116, 266]], 6, 0.4], [[[1110, 250], [1118, 260], [1124, 270], [1128, 282]], 6, 0.4], [[[1090, 250], [1094, 257], [1097, 262]], 4, 0.3],
    [[[1118, 254], [1124, 268], [1126, 284], [1128, 300]], 6, 0.5],
  ];
  for (const [pts, w0, w1] of L) strand(g, pts, w0, w1, HK);
  for (let i = 0; i < 14; i++) { const x = 1014 + rh() * 110; strand(g, [[x, 250], [x + (rh() - 0.5) * 10, 262 + rh() * 12]], 1, 0.2, grey(0.3, 0.6)); }
  // sweat beads
  for (const [x, y, r] of [[1047.5, 252.5, 1.5], [1089, 255, 1.5], [1040.5, 319, 1.4], [1106, 336, 1.6], [1084, 300.5, 1.1]]) {
    soft(g, E(x, y, r, r * 1.35, 0), grey(0.95)); curve(g, [[x - r, y + 0.5], [x - r * 0.6, y + r * 1.3], [x + r * 0.6, y + r * 1.3], [x + r, y + 0.5]], 0.8, grey(0.2, 0.8), { seed: x * 3 });
  }
}
