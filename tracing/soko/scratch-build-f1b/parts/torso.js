function torso(g) {
  // an open white shirt over a dark tee, glowing in the laptop light: brightest low on the chest, greyer at the
  // shoulders, crisp dark outline; collar flaps, shoulder seams, sleeve folds. Measured at 3x (50 s).
  const T = [[920, 525], [920, 480], [921, 452], [924, 432], [929, 412], [937, 395], [950, 381], [966, 371], [984, 365], [1002, 360], [1070, 356], [1134, 356],
    [1150, 362], [1167, 372], [1184, 384], [1198, 400], [1206, 418], [1212, 438], [1220, 455], [1231, 468], [1242, 481], [1248, 495], [1250, 510], [1250, 525]];
  fillBlob(g, T, grey(0.62));
  g.save(); g.beginPath(); smoothPath(g, T, true); g.clip();
  soft(g, pth(T), rg(g, 1070, 490, 20, 230, [[0, 0.98], [0.3, 0.95], [0.55, 0.88], [0.8, 0.78], [1, 0.68]]));
  soft(g, pth([[912, 440], [930, 400], [950, 384], [946, 430], [936, 480], [930, 530], [912, 530]]), grey(0.55), 8, 0.7);        // his right flank
  soft(g, pth([[1186, 396], [1212, 430], [1244, 482], [1254, 530], [1222, 530], [1200, 470], [1180, 420]]), grey(0.6), 8, 0.75); // his left side and sleeve
  // the dark tee in the collar's V, fading into the glow low on the chest
  const tee = [[1040, 372], [1100, 370], [1112, 400], [1104, 428], [1090, 446], [1072, 452], [1054, 444], [1040, 424], [1034, 398]];
  soft(g, pth(tee), lg(g, 0, 372, 0, 452, [[0, 0.3], [0.55, 0.42], [1, 0.85]]), 3);
  // collar flaps and the shirt's front edges
  soft(g, pth([[1004, 360], [1000, 392], [998, 420], [1014, 438], [1034, 420], [1040, 380]]), grey(0.9), 2, 0.8);
  soft(g, pth([[1134, 356], [1138, 392], [1136, 420], [1122, 440], [1106, 424], [1102, 380]]), grey(0.86), 2, 0.8);
  // soft fold shadows: shoulder seams, sleeve creases, the chest
  const sf = [[[944, 398], [970, 386], [1000, 378]], [[1150, 372], [1172, 382], [1194, 398]], [[1160, 400], [1180, 424], [1200, 450]], [[1150, 420], [1168, 448], [1188, 474]],
    [[1196, 452], [1214, 470], [1232, 484]], [[1142, 452], [1160, 478], [1172, 500]], [[958, 410], [948, 436], [944, 466]], [[978, 400], [968, 426], [962, 450]],
    [[936, 450], [932, 488], [930, 520]], [[1118, 446], [1116, 480], [1114, 516]], [[1170, 468], [1196, 480], [1226, 490]]];
  for (const f of sf) blurDraw(g, bboxOf(f, 6), 2.4, (c) => curve(c, f, 5, grey(0.42, 0.55), { seed: 7, ends: 0.2, jit: 0 }));
  g.restore();
  // crisp lines: collar edges, placket, seams, folds
  for (const [f, s, a, w] of [[[[1004, 362], [1000, 392], [998, 420], [1014, 438]], 1620, 0.8, 1.4], [[[1014, 438], [1030, 424], [1038, 404]], 1621, 0.55, 1.1],
    [[[1134, 358], [1138, 392], [1136, 420], [1122, 440]], 1622, 0.8, 1.4], [[[1122, 440], [1110, 426], [1104, 404]], 1623, 0.5, 1.1], [[[1122, 442], [1120, 480], [1118, 520]], 1624, 0.6, 1.2],
    [[[944, 398], [970, 386], [1000, 378]], 1625, 0.55, 1.1], [[[1152, 372], [1174, 383], [1194, 398]], 1626, 0.5, 1.1], [[[1162, 402], [1182, 426], [1200, 450]], 1627, 0.55, 1.1],
    [[[1152, 424], [1170, 450], [1188, 474]], 1628, 0.5, 1.1], [[[1200, 456], [1216, 472], [1234, 484]], 1629, 0.6, 1.1], [[[960, 412], [950, 438], [946, 466]], 1630, 0.45, 1],
    [[[1172, 470], [1198, 482], [1228, 492]], 1631, 0.45, 1]]) curve(g, f, w, grey(0.25, a), { seed: s, ends: 0.25 });
  curve(g, T.slice(0, 10), 1.9, grey(0.1, 0.9), { seed: 1611, ends: 0.8 });
  curve(g, T.slice(12), 1.9, grey(0.1, 0.9), { seed: 1612, ends: 0.8 });
  // his left hand resting on the desk by the laptop, fingers toward the screen; his right hand at the laptop's corner
  const hand = [[1134, 504], [1148, 497], [1166, 496], [1180, 500], [1186, 510], [1180, 520], [1150, 521], [1136, 518]];
  soft(g, pth(hand), lg(g, 0, 496, 0, 521, [[0, 0.97], [1, 0.8]]));
  for (const [f, s] of [[[[1136, 506], [1150, 500], [1168, 499]], 1640], [[[1140, 513], [1156, 509], [1172, 510]], 1641], [[[1150, 519], [1166, 516], [1180, 517]], 1642]]) curve(g, f, 0.9, grey(0.35, 0.6), { seed: s });
  curve(g, hand, 1.1, grey(0.2, 0.75), { closed: true, seed: 1643, ends: 0.8 });
  soft(g, pth([[906, 522], [908, 500], [914, 489], [924, 487], [930, 496], [931, 522]]), grey(0.84));
  curve(g, [[908, 500], [914, 490], [924, 488]], 1.1, grey(0.2, 0.8), { seed: 1632 });
  // the halo of laptop light round him
  g.save(); g.globalCompositeOperation = "lighter";
  g.translate(1075, 440); g.scale(1, 110 / 190);
  const hr = g.createRadialGradient(0, 0, 0, 0, 0, 230); hr.addColorStop(0, grey(0.05)); hr.addColorStop(0.6, grey(0.03)); hr.addColorStop(1, grey(0));
  g.fillStyle = hr; g.beginPath(); g.arc(0, 0, 230, 0, PI * 2); g.fill();
  g.restore();
}

// headphones round his neck: two big cups hanging either side of the neck (x 1004-1050 and 1090-1140), grey
// shells with dark rims, ridged cushions turned toward the neck
function headphones(g) {
  // left cup: seen three-quarter, the flat grey shell toward us, cushion on the inner side
  g.save(); g.translate(1027, 402); g.rotate(-0.08);
  soft(g, E(0, 0, 23, 34.5, 0), grey(0.06));
  soft(g, E(-4, 0, 17, 31, 0), lg(g, -20, -30, 14, 30, [[0, 0.7], [0.45, 0.58], [1, 0.36]]));
  g.strokeStyle = grey(0.05); g.lineWidth = 2; g.beginPath(); g.ellipse(-4, 0, 17, 31, 0, 0, PI * 2); g.stroke();
  g.strokeStyle = grey(0.82, 0.8); g.lineWidth = 1.4; g.beginPath(); g.ellipse(-5, -1, 13.5, 26, 0, 2.1, 4.4); g.stroke();
  g.strokeStyle = grey(0.2, 0.8); g.lineWidth = 1.2; g.beginPath(); g.ellipse(-4, 0, 9, 18, 0, 0, PI * 2); g.stroke();
  g.beginPath(); g.ellipse(13, 1, 9, 32, 0, 0, PI * 2); g.fillStyle = grey(0.16); g.fill();
  for (let k = -12; k <= 12; k++) { const y = k * 2.5; ink(g, [[7.5, y], [18.5, y + 1]], 1.1, grey(0.52, 0.7), { seed: 1705 + k }); }
  g.restore();
  // right cup: more edge-on, cushion to the left, the shell's rings to the right
  g.save(); g.translate(1115, 392); g.rotate(0.05);
  soft(g, E(2, 0, 25, 37, 0), grey(0.07));
  g.beginPath(); g.ellipse(-8, 1, 10, 32, 0, 0, PI * 2); g.fillStyle = grey(0.2); g.fill();
  for (let k = -12; k <= 12; k++) { const y = k * 2.5; ink(g, [[-16, y + 0.5], [-0.5, y]], 1.2, grey(0.62, 0.75), { seed: 1725 + k }); }
  for (const [rx, ry, v] of [[16, 34, 0.55], [12, 29, 0.32], [8, 23, 0.5]]) { g.strokeStyle = grey(v, 0.85); g.lineWidth = 1.5; g.beginPath(); g.ellipse(8, 0, rx, ry, 0, -1.4, 1.4); g.stroke(); }
  g.strokeStyle = grey(0.86, 0.8); g.lineWidth = 2; g.beginPath(); g.ellipse(2, 0, 25, 37, 0, -1.25, 1.25); g.stroke();
  g.restore();
}
