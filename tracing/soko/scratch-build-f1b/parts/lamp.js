function lampAndGear(g) {
  // the arm: a dim vertical pole, two thin rods from the shade's joint down to the elbow nut, then down to the base
  for (const [a, b, w, v] of [[[1425, 335], [1422, 422], 1.6, 0.35], [[1432, 322], [1492, 388], 1.5, 0.45], [[1440, 318], [1498, 384], 1.1, 0.3], [[1488, 400], [1473, 432], 1.8, 0.4], [[1496, 402], [1480, 434], 1.1, 0.3]])
    ink(g, [a, b], w, grey(v), { seed: a[0] * 3 + a[1] });
  dot(g, 1494, 391, 8, grey(0.06)); ring(g, 1494, 391, 7, 1.6, grey(0.45)); dot(g, 1494, 391, 2.2, grey(0.55));
  dot(g, 1435, 318, 5, grey(0.1)); ring(g, 1435, 318, 5, 1.2, grey(0.4));
  // neck: a short cylinder angled up-right, with a lit stripe; the cap
  const neck = [[1385, 300], [1409, 284], [1420, 300], [1397, 314]];
  soft(g, pth(neck, false), lg(g, 1385, 284, 1420, 314, [[0, 0.5], [0.4, 0.85], [0.7, 0.35], [1, 0.12]]));
  curve(g, neck, 1.2, grey(0.03), { closed: true, seed: 2046, ends: 0.9 });
  fillPoly(g, [[1406, 285], [1418, 278], [1424, 287], [1412, 294]], grey(0.4));
  // shade: a dark bell, its mouth turned down-left toward the desk; the lit inside shows above the rim
  const rimC = [1361.5, 355], rimA = 0.588, rx = 45, ry = 9.5;
  const rimPt = (t) => [rimC[0] + Math.cos(t) * rx * Math.cos(rimA) - Math.sin(t) * ry * Math.sin(rimA), rimC[1] + Math.cos(t) * rx * Math.sin(rimA) + Math.sin(t) * ry * Math.cos(rimA)];
  const shade = [rimPt(PI), [1340, 318], [1362, 305], [1386, 300], [1400, 306], [1408, 318], [1410, 340], [1404, 362], rimPt(0)];
  soft(g, pth(shade), lg(g, 1330, 300, 1410, 380, [[0, 0.3], [0.35, 0.16], [1, 0.05]]));
  blurDraw(g, [1340, 300, 1405, 345], 2, (c) => curve(c, [[1352, 322], [1372, 311], [1394, 306]], 5, grey(0.75, 0.8), { seed: 2044, ends: 0.3 }));   // the specular streak
  curve(g, shade, 1.3, grey(0.02), { seed: 2045, ends: 0.8 });
  // the lit inside and the mouth
  g.save(); g.translate(rimC[0], rimC[1]); g.rotate(rimA);
  soft(g, E(3, -9, 34, 16, 0), grey(0.9), 3, 0.9);
  g.fillStyle = grey(0.97); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.fill();
  g.strokeStyle = grey(0.35); g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.stroke();
  g.strokeStyle = grey(0.55, 0.8); g.lineWidth = 1.2; g.beginPath(); g.ellipse(-4, -2, 13, 5, 0, 0.2, PI - 0.2); g.stroke();   // the socket's rim deep inside
  g.restore();
  // pencil cup: a ribbed metal tin, a lit stripe, pencils fanning out of it
  for (const [x0, y0, x1, y1] of [[1297, 452, 1291, 418], [1304, 452, 1300, 412], [1311, 452, 1311, 416], [1318, 452, 1322, 414], [1325, 452, 1333, 422], [1302, 452, 1286, 428]]) {
    ink(g, [[x0, y0], [x1, y1]], 2.8, grey(0.03), { seed: x1 * 7 }); ink(g, [[x0, y0], [x1, y1]], 1.8, grey(0.8), { seed: x1 * 7 + 1 });
  }
  const cup = [[1293, 452], [1332, 452], [1331, 500], [1294, 500]];
  tex(g, cup, (v) => { v.fillStyle = lg(v, 1293, 0, 1332, 0, [[0, 0.25], [0.35, 0.55], [0.5, 0.95], [0.62, 0.5], [1, 0.2]]); v.fillRect(1290, 450, 45, 52); }, 0, { per: 2.6, seed: 2050, wExp: 0.6, bg: 0.35 });
  ink(g, cup, 1.2, grey(0.03), { closed: true, seed: 2051 });
  g.fillStyle = grey(0.7); g.beginPath(); g.ellipse(1312.5, 452, 19.5, 3, 0, 0, PI * 2); g.fill();
  g.fillStyle = grey(0.1); g.beginPath(); g.ellipse(1312.5, 452.5, 16, 2, 0, 0, PI * 2); g.fill();
  // a tray under it
  stripes(g, [[1282, 500], [1340, 500], [1344, 516], [1280, 516]], { dir: "h", per: 3, cov: 0.6, lum: 0.85, seed: 2052 });
  // books under his hand
  book(g, [[1196, 490], [1262, 488], [1264, 505], [1197, 506]], { seed: 2060, k: 0.9 });
  book(g, [[1190, 505], [1270, 504], [1271, 521], [1191, 522]], { seed: 2062, k: 0.85 });
  // on the receiver: an open notebook with a curled page, flat books under it
  book(g, [[1352, 437], [1482, 434], [1484, 456], [1353, 458]], { seed: 2070, k: 0.8 });
  const nb = [[1356, 423], [1418, 420], [1434, 426], [1436, 437], [1356, 438]];
  tex(g, nb, (v) => { v.fillStyle = lg(v, 0, 420, 0, 438, [[0, 0.92], [1, 0.62]]); v.fillRect(1350, 418, 90, 22); }, 0, { per: 2.2, seed: 2071, smooth: false, wExp: 0.6, bg: 0.4 });
  curve(g, nb, 1.2, grey(0.03), { closed: true, seed: 2072, ends: 0.9 });
  curve(g, [[1400, 421], [1420, 418], [1432, 424]], 1.4, grey(0.9), { seed: 2073 });
  // the receiver: a dark wooden case, two rows on the front panel (knobs, a lit meter; jacks)
  const rx0 = 1355, rx1 = 1486, ry0 = 457, ry1 = 520;
  tex(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], (v) => { v.fillStyle = lg(v, rx0, 0, rx1, 0, [[0, 0.22], [0.5, 0.3], [1, 0.18]]); v.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0); }, PI / 2, { per: 3, seed: 2074, wExp: 0.7, bg: 0.3, brk: 0.3 });
  ink(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], 1.4, grey(0.03), { closed: true, seed: 2075 });
  ink(g, [[rx0, ry0 + 1], [rx1, ry0 + 1]], 1.2, grey(0.8), { seed: 2076 });
  ink(g, [[rx0 + 2, 485], [rx1 - 2, 485]], 1.1, grey(0.45), { seed: 2077 });
  for (const [x, y, r, lit] of [[1368, 472, 6.5, 0.6], [1412, 475, 7.5, 0.95], [1436, 473, 6, 0.55]]) {
    dot(g, x, y, r, grey(0.05)); ring(g, x, y, r - 1, 1.4, grey(0.55)); soft(g, E(x - 1, y - 1.5, r * 0.55, r * 0.45, 0), grey(lit)); dot(g, x - 1.5, y - 2.5, 1.3, grey(0.95));
  }
  fillPoly(g, [[1373, 466], [1386, 466], [1386, 470], [1373, 470]], grey(0.6));
  fillPoly(g, [[1450, 467], [1476, 467], [1476, 483], [1450, 483]], grey(0.9)); fillPoly(g, [[1453, 470], [1473, 470], [1473, 480], [1453, 480]], grey(0.35));
  for (const x of [1366, 1388, 1411, 1436, 1466]) { dot(g, x, 503, 6.5, grey(0.04)); ring(g, x, 503, 6, 1.5, grey(0.6)); dot(g, x, 503, 2.5, grey(0.02)); }
}
