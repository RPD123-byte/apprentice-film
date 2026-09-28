// ---------------------------------------------------------------- hatching helpers (dark pen strokes on the white shirt)
// a fan of strokes from a base point
function fan(o, r, x, y, a, spread, n, L, w = 1.2, alpha = 0.7) {
  for (let k = 0; k < n; k++) {
    const aa = a + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spread) + (r() - 0.5) * 0.05, l = L * (0.55 + 0.45 * r());
    const bend = (r() - 0.5) * 0.12;
    o.globalAlpha = alpha * (0.6 + 0.4 * r());
    strand(o, [[x, y], [x + Math.cos(aa + bend) * l * 0.5, y + Math.sin(aa + bend) * l * 0.5], [x + Math.cos(aa) * l, y + Math.sin(aa) * l]], w * (0.7 + 0.6 * r()), "#0c0c0c", 4, 0.05);
  }
  o.globalAlpha = 1;
}
// short parallel strokes along an edge, pointing inward (angle a from the edge's normal side)
function edgeHatch(o, r, pts, a, L, step, w = 1.1, alpha = 0.65) {
  const q = sampleCurve(pts, 10);
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc < step) continue;
    acc = 0;
    const l = L * (0.5 + 0.6 * r()), aa = a + (r() - 0.5) * 0.15;
    o.globalAlpha = alpha * (0.6 + 0.4 * r());
    strand(o, [q[i], [q[i][0] + Math.cos(aa) * l * 0.5, q[i][1] + Math.sin(aa) * l * 0.5], [q[i][0] + Math.cos(aa) * l, q[i][1] + Math.sin(aa) * l]], w, "#0c0c0c", 3, 0.05);
  }
  o.globalAlpha = 1;
}
// parallel hatch lines inside a clip, at angle a
function hatchIn(o, r, clip, a, gap, w, alpha, [x0, y0, x1, y1]) {
  o.save(); o.beginPath(); clip(o); o.clip();
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let s = -R; s <= R; s += gap * (0.8 + 0.4 * r())) {
    const px = cx - sa * s, py = cy + ca * s;
    o.globalAlpha = alpha * (0.6 + 0.4 * r());
    line(o, [[px - ca * R, py - sa * R], [px + ca * R, py + sa * R]], w, "#0c0c0c", 2, 0.3);
  }
  o.globalAlpha = 1; o.restore();
}

// ---------------------------------------------------------------- shirt, t-shirt, neck
function paintShirt(P, r) {
  const o = P.o;
  // the shirt is white paper; the shading is pen hatching on top
  P.fill(poly(SHIRT), linear(1000, 0, 1880, 0, [[0, 0.93], [0.15, 0.97], [0.8, 0.96], [1, 0.9]]), 1.45, { style: 2 });
  // t-shirt: dark print mesh in the opening under the neck and in the strip right of the laptop
  P.fill(poly(TSHIRT), linear(0, 590, 0, 850, [[0, 0.1], [0.3, 0.2], [1, 0.34]]), 0.8, { style: 2 });
  o.save(); o.beginPath(); poly(TSHIRT)(o); o.clip();
  for (let y = 590; y < 852; y += 5.2) for (let x = 1330 + ((Math.round(y / 5.2)) % 2) * 2.6; x < 1600; x += 5.2) { o.fillStyle = `rgba(242,240,234,${0.2 + 0.35 * (y - 590) / 260})`; o.beginPath(); o.arc(x, y, 1.25, 0, 7); o.fill(); }
  o.restore();
  // neck, and the fine cross-hatched shadow under the chin
  P.fill(poly(NECK), linear(0, 440, 0, 610, [[0, 0.7], [0.2, 0.93], [0.5, 0.97], [1, 0.95]]), 0.2, { style: 2 });
  const chin = blob([[1360, 452], [1410, 462], [1462, 450], [1464, 490], [1410, 500], [1358, 490]]);
  hatchIn(o, r, chin, 0.6, 3.2, 1, 0.6, [1350, 445, 1470, 505]);
  hatchIn(o, r, chin, -0.6, 3.4, 1, 0.5, [1350, 445, 1470, 505]);
  for (const x of [1372, 1380, 1446, 1452]) line(o, [[x, 505], [x + (x < 1410 ? 3 : -3), 560]], 1, "rgba(15,15,15,0.4)", 3);
  // contours: the outer edge of the shoulders
  line(o, [[996, 650], [1016, 600], [1040, 546], [1070, 506], [1112, 474], [1160, 446], [1214, 422]], 2, "#101010", 6);
  line(o, [[1562, 414], [1620, 432], [1690, 468], [1742, 502], [1774, 544], [1792, 604], [1810, 662], [1852, 702], [1874, 718], [1876, 756]], 2.2, "#101010", 6);
  // left shoulder: seam and hatch along the top edge
  line(o, [[1046, 556], [1080, 520], [1120, 490], [1160, 468]], 1.3, "rgba(15,15,15,0.7)", 6);
  edgeHatch(o, r, [[1000, 646], [1016, 600], [1040, 546], [1070, 506], [1112, 474], [1160, 446], [1210, 424]], 1.05, 34, 5, 1.1, 0.7);
  fan(o, r, 1100, 560, 1.75, 0.35, 8, 70, 1.1, 0.5);
  fan(o, r, 1170, 520, 1.6, 0.3, 7, 60, 1.1, 0.45);
  // collars
  P.fill(poly([[1204, 590], [1236, 556], [1256, 612], [1244, 632], [1212, 626]]), 0.96, 1.2, { style: 2 });
  line(o, [[1204, 590], [1236, 556], [1256, 612], [1244, 632], [1212, 626], [1204, 590]], 1.8, "#111", 4, 0.2);
  hatchIn(o, r, poly([[1204, 590], [1236, 556], [1256, 612], [1244, 632], [1212, 626]]), 1.2, 4, 1, 0.5, [1200, 550, 1260, 636]);
  P.fill(poly([[1548, 596], [1604, 610], [1616, 648], [1560, 640]]), 0.96, 1.2, { style: 2 });
  line(o, [[1548, 596], [1604, 610], [1616, 648], [1560, 640], [1548, 596]], 1.8, "#111", 4, 0.2);
  // placket edges beside the t-shirt strip, and the neckline
  line(o, [[1548, 628], [1532, 700], [1560, 800], [1578, 848]], 2.4, "#111", 6);
  line(o, [[1352, 598], [1380, 608], [1410, 612], [1440, 607], [1468, 598]], 2.6, "#0a0a0a", 6);
  // right side: hatching down the shoulder and the sleeve, fans of fold lines toward the forearm
  edgeHatch(o, r, [[1562, 416], [1620, 434], [1690, 470], [1742, 504], [1774, 546], [1792, 606], [1810, 664], [1852, 704]], 2.55, 40, 4, 1.1, 0.75);
  hatchIn(o, r, poly([[1742, 504], [1774, 546], [1792, 606], [1810, 664], [1852, 704], [1872, 718], [1874, 756], [1820, 700], [1770, 620], [1730, 540]]), 2.2, 4, 1.1, 0.7, [1720, 500, 1880, 760]);
  hatchIn(o, r, poly([[1742, 504], [1774, 546], [1792, 606], [1810, 664], [1790, 660], [1760, 590], [1730, 530]]), 0.9, 4.5, 1, 0.55, [1720, 500, 1820, 680]);
  fan(o, r, 1668, 808, -1.95, 0.7, 14, 150, 1.3, 0.65);
  fan(o, r, 1720, 700, -0.6, 0.4, 8, 90, 1.2, 0.6);
  fan(o, r, 1640, 560, 1.9, 0.5, 9, 90, 1.1, 0.5);
  fan(o, r, 1600, 640, 1.4, 0.4, 7, 60, 1.1, 0.5);
  line(o, [[1640, 470], [1670, 540], [1690, 620], [1700, 700]], 1.3, "rgba(15,15,15,0.6)", 6);
  // the hand on the book: pale fingers along the book's top edge
  P.fill(blob([[1586, 812], [1640, 798], [1700, 794], [1744, 804], [1726, 826], [1660, 832], [1596, 832]]), 0.93, 0.05, { style: 2 });
  line(o, [[1586, 812], [1640, 798], [1700, 794], [1744, 804]], 1.8, "#121212", 5);
  line(o, [[1596, 832], [1660, 834], [1726, 828]], 1.4, "#121212", 5);
  for (const x of [1622, 1652, 1682, 1712]) line(o, [[x, 802], [x - 5, 830]], 1.2, "rgba(15,15,15,0.65)", 3);
}

// ---------------------------------------------------------------- hair
// a lock: a black leaf along a spine, full at the root, pointed at the tip, with a couple of fine glints
function lock(o, r, spine, w0, glint = 0.6) {
  const q = sampleCurve(spine, 10);
  const n = q.length, Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1), w = w0 * 0.5 * Math.pow(1 - u, 0.9) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, u * 2)));
    Lp.push([q[i][0] - dy * w, q[i][1] + dx * w]); Rp.push([q[i][0] + dy * w, q[i][1] - dx * w]);
  }
  o.fillStyle = "#050505"; o.beginPath(); o.moveTo(Lp[0][0], Lp[0][1]);
  for (const p of Lp) o.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) o.lineTo(Rp[i][0], Rp[i][1]);
  o.closePath(); o.fill();
  if (glint > 0 && w0 > 6) {
    const m = 1 + Math.floor(r() * 2.5);
    for (let k = 0; k < m; k++) {
      const off = (r() - 0.5) * 0.6, i0 = Math.floor(n * (0.05 + 0.2 * r())), i1 = Math.floor(n * (0.45 + 0.35 * r()));
      const pts = [];
      for (let i = i0; i < i1; i++) { const u = i / (n - 1), w = w0 * 0.5 * Math.pow(1 - u, 0.9) * off; const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; pts.push([q[i][0] - dy / d * w, q[i][1] + dx / d * w]); }
      if (pts.length > 2) { o.globalAlpha = glint * (0.5 + 0.5 * r()); taper(o, pts, (u) => (0.8 + r() * 0.7) * Math.sin(Math.PI * u), INK); o.globalAlpha = 1; }
    }
  }
}
// measured locks (frame px): spine points, root width
const LOCKS_BACK = [
  // left side mass down to the jaw
  [[[1222, 196], [1204, 260], [1196, 330], [1206, 390], [1222, 436]], 52], [[[1250, 196], [1240, 270], [1244, 340], [1262, 400], [1280, 440]], 44],
  [[[1210, 200], [1190, 280], [1180, 350], [1178, 410]], 30], [[[1268, 200], [1266, 270], [1274, 330], [1290, 380]], 26],
  // right side mass
  [[[1592, 196], [1606, 260], [1612, 330], [1602, 390], [1590, 430]], 50], [[[1566, 190], [1576, 260], [1574, 330], [1562, 380], [1550, 410]], 40],
  [[[1616, 200], [1632, 270], [1640, 340], [1636, 400]], 28], [[[1552, 190], [1556, 250], [1552, 310], [1540, 360]], 24],
];
const LOCKS_FRONT = [
  // fringe: the big central bundle, strands left of it over the inner corner of the left eye, thin strands right
  [[[1386, 104], [1380, 170], [1370, 224], [1364, 258]], 40], [[[1408, 106], [1402, 164], [1398, 204], [1398, 226]], 22],
  [[[1356, 108], [1344, 170], [1340, 222], [1346, 256]], 24], [[[1340, 112], [1326, 160], [1318, 200], [1318, 232]], 16],
  [[[1424, 108], [1434, 150], [1440, 190], [1442, 208]], 9], [[[1440, 110], [1448, 140], [1452, 168]], 6],
  // left temple
  [[[1316, 124], [1298, 170], [1284, 212], [1282, 262]], 26], [[[1292, 136], [1276, 200], [1272, 256], [1280, 300]], 26],
  [[[1276, 150], [1268, 230], [1276, 300], [1286, 348]], 18],
  // right temple
  [[[1488, 124], [1508, 168], [1520, 214], [1522, 244]], 18], [[[1510, 134], [1530, 184], [1544, 236], [1548, 270]], 22],
  [[[1532, 146], [1548, 210], [1556, 270], [1552, 318]], 22], [[[1470, 116], [1482, 146], [1488, 170]], 8],
];

// ---------------------------------------------------------------- head: face, hair, beanie
function paintHead(P, r) {
  const o = P.o, v = P.v;
  // hair mass behind the face
  P.fill(blob(HAIR_L), 0.0, 1.4, { style: 2 });
  P.fill(blob(HAIR_R), 0.0, 1.7, { style: 2 });
  for (const [s, w] of LOCKS_BACK) lock(o, r, s, w, 0.55);
  // face: pale flat tone, shading painted soft
  P.fill(blob(FACE), 0.95, 1.57, { style: 2 });
  soft(v, blob(FACE), (g) => {
    // eye sockets: dark circles below, grey lids above, darker at the inner corners
    g.fillStyle = grey(0.62);
    for (const [cx, cy] of [[1320, 238], [1498, 236]]) { g.beginPath(); g.ellipse(cx, cy, 40, 13, 0, 0, 7); g.fill(); }
    g.fillStyle = grey(0.7);
    for (const [cx, cy] of [[1322, 196], [1496, 194]]) { g.beginPath(); g.ellipse(cx, cy, 42, 10, 0, 0, 7); g.fill(); }
    g.fillStyle = grey(0.6);
    for (const [cx, cy] of [[1366, 226], [1450, 222]]) { g.beginPath(); g.ellipse(cx, cy, 10, 14, 0, 0, 7); g.fill(); }
    // nose: bridge shadow on the left, the shadow under the ball of the nose
    g.fillStyle = grey(0.78); g.beginPath(); g.ellipse(1379, 282, 6, 40, 0, 0, 7); g.fill();
    g.fillStyle = grey(0.76); g.beginPath(); g.ellipse(1416, 346, 26, 6, 0, 0, 7); g.fill();
    // the face darkens toward the hair on both sides; jaw and stubble tone
    g.fillStyle = grey(0.7); g.beginPath(); g.ellipse(1282, 320, 16, 90, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(1550, 310, 16, 90, 0, 0, 7); g.fill();
    g.fillStyle = grey(0.86); g.beginPath(); g.ellipse(1412, 420, 110, 34, 0, 0, 7); g.fill();
    g.fillStyle = grey(0.82); g.beginPath(); g.ellipse(1412, 404, 26, 6, 0, 0, 7); g.fill();
    // under the hair and cuff
    g.fillStyle = grey(0.75); g.beginPath(); g.ellipse(1412, 112, 150, 20, 0, 0, 7); g.fill();
  }, 8);
  // ears
  P.fill(blob([[1244, 272], [1266, 268], [1278, 290], [1270, 310], [1250, 306]]), 0.85, 1.57, { style: 2 });
  P.fill(blob([[1552, 276], [1576, 272], [1584, 292], [1572, 306], [1554, 304]]), 0.8, 1.57, { style: 2 });
  // stubble: short dark hairs over the jaw, chin and upper lip, denser toward the jaw line
  o.save(); o.beginPath(); smoothPath(o, FACE, true); o.clip();
  for (let i = 0; i < 1700; i++) {
    const x = 1280 + r() * 275, y = 336 + r() * 124;
    const lip = y > 370 && y < 414 && x > 1366 && x < 1462, cheek = y < 360 + (Math.abs(x - 1414) < 60 ? 30 : 0);
    if (lip && r() < 0.8) continue;
    if (cheek && r() < 0.85) continue;
    const a = 1.57 + (x - 1414) * 0.004 + (r() - 0.5) * 0.6, l = 1.5 + r() * 2.5;
    o.strokeStyle = `rgba(25,25,25,${0.25 + 0.45 * r()})`; o.lineWidth = 0.9;
    o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); o.stroke();
  }
  o.restore();
  // face contour: cheek, jaw and chin (fine)
  line(o, [[1280, 332], [1300, 378], [1328, 410], [1368, 436], [1408, 452], [1456, 440], [1504, 408], [1536, 370]], 1.8, "rgba(20,20,20,0.85)", 6);
  // ---- beanie: knit crown and cuff
  P.fill(blob(BEANIE), linear(1188, 0, 1628, 0, [[0, 0.24], [0.18, 0.4], [0.45, 0.5], [0.7, 0.46], [0.88, 0.32], [1, 0.2]]), 1.57, { spacing: 0.05, style: 0 });
  o.save(); o.beginPath(); smoothPath(o, BEANIE, true); o.clip();
  for (let i = 0; i <= 70; i++) {
    const f = i / 70, x = 1188 + 440 * f;
    const lean = (x - 1408) * 0.07;
    const pts = []; for (let k = 0; k <= 6; k++) { const y = -20 + k * 40; pts.push([x + lean * (k / 6 - 0.5) * 1.6 + Math.sin(k * 1.9 + i * 0.7) * 1.2, y]); }
    o.globalAlpha = 0.45 + 0.35 * r();
    line(o, pts, 1.1 + 1.1 * Math.abs(f - 0.5) * 2, "#0b0b0b", 4, 0.3);
  }
  o.globalAlpha = 0.5;
  for (const [xa, xb, dir] of [[1188, 1290, 1], [1530, 1630, -1]]) for (let k = 0; k < 60; k++) {
    const x = xa + r() * (xb - xa), y = 10 + r() * 190, L = 16 + r() * 24;
    line(o, [[x, y], [x + dir * L * 0.8, y + L * 0.5]], 1.1, "#0a0a0a", 2);
  }
  o.globalAlpha = 1;
  o.restore();
  line(o, FOLD, 2.6, "#0a0a0a", 6);
  line(o, [[1190, 205], [1215, 200], [1250, 160], [1300, 126], [1360, 108], [1410, 104], [1450, 108], [1500, 128], [1552, 170], [1590, 200], [1620, 212]], 2.6, "#0a0a0a", 6);
  // ---- fringe over the forehead
  for (const [s, w] of LOCKS_FRONT) lock(o, r, s, w, 0.5);
  // ---- features: brows, nose, mouth, sweat
  for (const [pts, w] of [[[[1298, 172], [1318, 166], [1344, 166], [1368, 172]], 7], [[[1450, 172], [1470, 163], [1496, 160], [1524, 166]], 7]]) {
    line(o, pts, w, "#0c0c0c", 6, 0.35);
    const q = sampleCurve(pts, 6);
    for (let k = 0; k < q.length; k += 1) { const [x, y] = q[k]; o.globalAlpha = 0.6; line(o, [[x - 2, y - 4], [x + 3, y + 3]], 1.1, "#0c0c0c", 2); }
    o.globalAlpha = 1;
  }
  // nose: bridge line, the ball of the nose and the nostril wings
  line(o, [[1377, 240], [1374, 280], [1377, 314]], 1.4, "rgba(40,40,40,0.5)", 6);
  line(o, [[1378, 314], [1380, 328], [1392, 336], [1404, 334]], 2.2, "#1a1a1a", 6);
  line(o, [[1430, 334], [1442, 336], [1452, 328], [1452, 314]], 2.2, "#1a1a1a", 6);
  line(o, [[1398, 340], [1416, 344], [1434, 340]], 1.6, "rgba(20,20,20,0.75)", 4);
  line(o, [[1444, 294], [1452, 312]], 1.2, "rgba(40,40,40,0.45)", 3);
  // mouth: flat, a little down at the corners; the lower lip a pale line
  line(o, [[1362, 394], [1388, 389], [1414, 392], [1440, 389], [1466, 395]], 2.8, "#161616", 6, 0.4);
  line(o, [[1394, 378], [1414, 375], [1432, 378]], 1.2, "rgba(30,30,30,0.4)", 4);
  line(o, [[1390, 408], [1414, 411], [1442, 407]], 1.6, "rgba(30,30,30,0.5)", 4);
  // sweat drops: small outlined teardrops
  for (const [x, y, s] of [[1348, 132, 1], [1456, 136, 1.1], [1468, 116, 0.8], [1444, 258, 1.2], [1310, 310, 1.1], [1516, 306, 1], [1504, 354, 1]]) {
    o.strokeStyle = "rgba(40,40,40,0.8)"; o.lineWidth = 1.3;
    o.beginPath(); o.moveTo(x, y - 7 * s); o.quadraticCurveTo(x + 4.5 * s, y + 1 * s, x, y + 4 * s); o.quadraticCurveTo(x - 4.5 * s, y + 1 * s, x, y - 7 * s); o.stroke();
  }
}

// ---------------------------------------------------------------- headphones round his neck
function paintHeadphones(P, r) {
  const o = P.o;
  // band: from the left cup up behind the hair, and from the right cup
  line(o, [[1238, 470], [1236, 440], [1250, 410]], 9, "#070707", 6, 0.2);
  line(o, [[1500, 408], [1520, 400], [1560, 410]], 9, "#070707", 6, 0.2);
  // left cup, seen obliquely: the ribbed cushion on the right, a silver lip, the dark driver face with a fine ring
  o.save(); o.translate(1302, 536); o.rotate(-0.12);
  o.fillStyle = "#070707"; o.beginPath(); o.ellipse(0, 0, 74, 106, 0, 0, 7); o.fill();
  // cushion ribs: short white strokes across the ring, radial
  for (let k = 0; k < 56; k++) {
    const a = -1.7 + (k / 55) * 3.4, c = Math.cos(a), s = Math.sin(a);
    const x0 = -8 + c * 44, y0 = s * 86, x1 = c * 70, y1 = s * 102;
    o.globalAlpha = 0.55 + 0.4 * r();
    strand(o, [[x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2 + 2], [x0, y0]], 2.4 + r() * 1.2, INK, 3, 0.2);
  }
  o.globalAlpha = 1;
  // silver lip
  o.fillStyle = "#d9d7d1"; o.beginPath(); o.ellipse(-20, 6, 46, 90, 0, 0, 7); o.fill();
  o.fillStyle = "#0a0a0a"; o.beginPath(); o.ellipse(-30, 8, 34, 78, 0, 0, 7); o.fill();
  o.strokeStyle = "rgba(242,240,234,0.9)"; o.lineWidth = 2.2; o.beginPath(); o.ellipse(-34, 14, 24, 52, 0, 1.6, 4.9); o.stroke();
  o.strokeStyle = "rgba(20,20,20,0.9)"; o.lineWidth = 3; o.beginPath(); o.ellipse(-20, 6, 46, 90, 0, -1.3, 1.3); o.stroke();
  o.restore();
  // yoke ring under the left cup
  o.strokeStyle = "rgba(242,240,234,0.85)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(1312, 628, 9, 7, 0.4, 0, 7); o.stroke();
  line(o, [[1300, 620], [1318, 636], [1326, 646]], 2.2, "rgba(242,240,234,0.8)", 3);
  // right cup: nearly edge on, a column of white ribs in a dark shell, a highlight down the shell
  o.save(); o.translate(1520, 512); o.rotate(0.04);
  o.fillStyle = "#070707"; o.beginPath(); o.ellipse(0, 0, 66, 112, 0, 0, 7); o.fill();
  for (let k = 0; k < 32; k++) {
    const y = -100 + k * 6.6, w = Math.sqrt(Math.max(0, 1 - (y / 106) ** 2)) * 24;
    o.globalAlpha = 0.55 + 0.4 * r();
    line(o, [[-w - 14, y], [-14, y + 1.5], [w - 14, y]], 3, INK, 3, 0.4);
  }
  o.globalAlpha = 1;
  o.strokeStyle = "rgba(242,240,234,0.75)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(10, 0, 42, 104, 0, -1.2, 1.2); o.stroke();
  o.strokeStyle = "rgba(242,240,234,0.5)"; o.lineWidth = 1.6; o.beginPath(); o.ellipse(24, 0, 36, 96, 0, -1.1, 1.1); o.stroke();
  o.restore();
}

// ---------------------------------------------------------------- eyes (per frame)
// look: -1 (toward the viewer's left, at the owl) .. +1 (viewer's right)
const EYES = [
  { c: [1318, 218], w: 42, top: 13, bot: 11 },
  { c: [1495, 216], w: 40, top: 13, bot: 11 },
];
export function drawEyes(g, look) {
  for (const E of EYES) {
    const [cx, cy] = E.c;
    const open = (c) => { c.moveTo(cx - E.w, cy + 2); c.quadraticCurveTo(cx - 6, cy - E.top * 2.1, cx + E.w, cy - 1); c.quadraticCurveTo(cx + 4, cy + E.bot * 2, cx - E.w, cy + 2); c.closePath(); };
    g.save();
    g.fillStyle = "#e4e2dc"; g.beginPath(); open(g); g.fill();
    g.beginPath(); open(g); g.clip();
    const ix = cx + look * 20 - 2, iy = cy + 1;
    g.fillStyle = "#0a0a0a"; g.beginPath(); g.arc(ix, iy, 13, 0, 7); g.fill();
    g.fillStyle = "#f4f2ec"; g.fillRect(ix + (look < 0 ? 0 : -8), iy - 7, 7, 4); g.fillRect(ix + (look < 0 ? 2 : -6), iy - 2, 5, 3);
    // shadow of the lid over the white
    g.fillStyle = "rgba(70,70,70,0.4)"; g.fillRect(cx - E.w, cy - E.top - 6, E.w * 2, 9);
    g.restore();
    // upper lid heavy, lower lid fine, the crease above
    line(g, [[cx - E.w - 3, cy + 4], [cx - E.w * 0.4, cy - E.top + 1], [cx + E.w * 0.4, cy - E.top + 1], [cx + E.w + 3, cy - 1]], 4.6, "#0a0a0a", 6, 0.3);
    line(g, [[cx - E.w + 2, cy + 3], [cx, cy + E.bot + 1], [cx + E.w - 2, cy + 1]], 1.6, "rgba(20,20,20,0.8)", 6, 0.5);
    line(g, [[cx - E.w + 4, cy - E.top - 7], [cx, cy - E.top - 11], [cx + E.w - 2, cy - E.top - 6]], 1.5, "rgba(30,30,30,0.6)", 6, 0.5);
  }
}
