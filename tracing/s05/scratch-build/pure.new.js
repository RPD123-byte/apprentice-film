// s05's copy of the laptop-view "Pure Imagination" page. Copied verbatim from src/shots/s07/page.js (s07's own
// re-measured copy of F3's src/lib/pureimg.js page for this same laptop view: title tone, fan, sun, props - a toy
// camera and a rocket robot where F3 has a walkie-talkie and a square camera -, ticker, left rainbow), so s05 and s07
// show the same page. (Ownership rule: a variant of another shot's helper is copied, never imported or edited.)
// Still an original design: the top-left mark is the original "Wonder Camp" mark, no third-party logo.
import { sampleCurve } from "../../lib/paths.js";
import { drawNoteCard, drawSelection } from "../../lib/notecard.js";

const PAGE_W = 1600, PAGE_H = 1000;
// The red selection (drawn round "Pure Imagination") and the note card, in page units (measured).
// (fix pass 1d: re-measured on the rectified source at 25.40-25.60: the line's centre runs x 347 / 1243, y 311 / 675, and it
// is ~13 units wide, a dark crimson)
const PURE_SEL = { x0: 347, y0: 311, x1: 1243, y1: 675, width: 13 };
const PURE_CARD = { x: 1278.2, y: 185.3, w: 193.9, h: 270.2 };

// Palette (pre-grade values: the film's finishing grade darkens and warms these a little).
const PC = {
  bg: "#1c241b", line: "#2b1113", cream: "#cfd0c5", title: "#f5f4ed", creamDim: "#c9cbc0", yellow: "#e6c65e", yellowDeep: "#e0b84e",
  pink: "#d6679a", purple: "#5b4f9e", orange: "#df7a58", gold: "#e8ca78",
  pPink: "#b38d9a", pLav: "#7c7c96", pPeach: "#b08b66", pCream: "#b2b3a6",
  red: "#c63d1a",
  // the U ribbon darkens toward its top (measured: top-left arm vs the bottom of the U)
  uTop: ["#b84a74", "#36397a", "#d26346", "#d5b255"], uBot: ["#cd819d", "#6065a0", "#df865c", "#ebd4a0"],
};

// ---------------------------------------------------------------- geometry helpers
const P = (pts, per = 10, closed = false) => sampleCurve(pts, per, closed);
function poly(ctx, pts) { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
function strokePoly(ctx, pts, w, col) { ctx.beginPath(); poly(ctx, pts); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); }
// Closed outline through points; a point [x, y, 1] is a sharp corner, the rest are joined by smooth Catmull-Rom runs.
function outline(pts, per = 8) {
  const n = pts.length, corners = pts.map((p, i) => (p[2] ? i : -1)).filter((i) => i >= 0);
  if (!corners.length) return P(pts.map((p) => [p[0], p[1]]), per, true);
  const out = [];
  for (let k = 0; k < corners.length; k++) {
    const a = corners[k], b = corners[(k + 1) % corners.length];
    const run = [];
    for (let i = a; ; i = (i + 1) % n) { run.push([pts[i][0], pts[i][1]]); if (i === b && run.length > 1) break; if (run.length > n + 1) break; }
    const s = run.length > 2 ? P(run, per) : run;
    for (let i = 0; i < s.length - 1; i++) out.push(s[i]);
  }
  return out;
}
function fillOutline(ctx, pts, fill, lw = 0, line = PC.line) {
  ctx.beginPath(); poly(ctx, pts); ctx.closePath();
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = "round"; ctx.stroke(); }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
// Bands between consecutive boundary polylines (already sampled). colors[i] fills between bounds[i] and bounds[i+1].
function bands(ctx, bounds, colors, lw = 3.2, line = PC.line) {
  for (let i = 0; i < colors.length; i++) {
    const a = bounds[i], b = bounds[i + 1];
    ctx.beginPath(); poly(ctx, a);
    for (let j = b.length - 1; j >= 0; j--) ctx.lineTo(b[j][0], b[j][1]);
    ctx.closePath(); ctx.fillStyle = colors[i]; ctx.fill();
  }
  if (lw) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (const s of bounds) strokePoly(ctx, s, lw, line);
  }
}
// Offset a sampled spine by distances d(u) along its left normal (-dy, dx).
function offset(spine, d) {
  const n = spine.length;
  return spine.map((p, i) => {
    const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const o = typeof d === "function" ? d(i / (n - 1)) : d;
    return [p[0] - dy * o, p[1] + dx * o];
  });
}
function star4(ctx, x, y, r, col, rx = r) {
  const k = 0.2;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + rx * k, y - r * k, x + rx, y);
  ctx.quadraticCurveTo(x + rx * k, y + r * k, x, y + r);
  ctx.quadraticCurveTo(x - rx * k, y + r * k, x - rx, y);
  ctx.quadraticCurveTo(x - rx * k, y - r * k, x, y - r);
  ctx.fillStyle = col; ctx.fill();
}
function gradX(ctx, x0, x1, c0, c1) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }

// ---------------------------------------------------------------- the upper ribbon: U, arch, pastel tail
// Five boundary lines, outer pink edge (B0) … inner yellow edge (B4). Measured on the close-up in page units
// (left arm y 116–300, bottom x 1150–1260, right arm y 140–180, pastel tail x 1440–1590); the arch over the top
// (hidden behind the pills / marquee in the close-up) follows the laptop view.
const UB = [
  [[930, 20], [945, 46], [975, 80], [1006, 116], [1017, 130], [1037, 160], [1061, 200], [1085, 240], [1112, 280], [1125, 300], [1150, 333], [1180, 365], [1200, 381], [1220, 391], [1240, 395], [1262, 394], [1284, 383], [1298, 358], [1305, 320], [1305, 270], [1302, 220], [1299, 180], [1294, 160], [1291, 140], [1289, 112], [1292, 90], [1305, 74], [1325, 72], [1343, 85], [1358, 112], [1373, 140], [1380, 150], [1389, 160], [1396.5, 170], [1404, 180], [1430, 210], [1455, 233], [1480, 245.5], [1500, 251.5], [1520, 253], [1540, 249], [1560, 242.5], [1580, 239.5], [1600, 241], [1625, 244]],
  [[975, 20], [989, 46], [1016, 80], [1043.5, 116], [1054, 130], [1070, 160], [1089.5, 200], [1110.5, 240], [1136, 280], [1150, 299], [1180, 331.5], [1200, 349], [1220, 360], [1240, 365.5], [1262, 363.5], [1280, 352], [1290, 325], [1294, 290], [1293, 240], [1290, 200], [1287.5, 180], [1284, 160], [1280.5, 140], [1279, 110], [1283, 80], [1300, 58], [1325, 55], [1348, 68], [1368, 100], [1387, 140], [1395, 150], [1402.5, 160], [1410.5, 170], [1418, 180], [1450, 212], [1480, 231.5], [1500, 238.5], [1520, 240.5], [1540, 237], [1560, 233.5], [1580, 234], [1600, 237], [1625, 240]],
  [[1022, 20], [1036, 46], [1056, 80], [1075.5, 116], [1081, 130], [1097, 160], [1116, 200], [1138.5, 240], [1150, 258], [1162, 280], [1180, 302.5], [1200, 323.5], [1220, 337], [1240, 341], [1258, 322], [1270, 300], [1276, 270], [1277, 240], [1275, 200], [1274, 180], [1271, 160], [1268, 140], [1266, 105], [1272, 70], [1292, 45], [1325, 40], [1355, 52], [1380, 85], [1402, 140], [1409, 150], [1417, 160], [1425.5, 170], [1435, 180], [1460, 202], [1480, 214.5], [1500, 223], [1520, 226], [1540, 226], [1560, 224.5], [1580, 224.5], [1600, 227], [1625, 230]],
  [[1058, 20], [1068, 46], [1088, 80], [1102, 116], [1106, 130], [1122, 160], [1141, 200], [1160.5, 240], [1183.5, 280], [1199, 300], [1220, 312], [1240, 313], [1255, 300], [1260, 292], [1263, 270], [1263, 240], [1260, 200], [1258.5, 180], [1255.5, 160], [1253.5, 140], [1252, 100], [1258, 60], [1282, 32], [1325, 25], [1362, 38], [1392, 72], [1416, 140], [1424.5, 150], [1433, 160], [1443.5, 170], [1453.5, 180], [1480, 197.5], [1500, 207], [1520, 212], [1540, 215], [1560, 213], [1580, 214.5], [1600, 217], [1625, 220]],
  [[1092, 20], [1100, 46], [1116, 80], [1128, 116], [1131, 130], [1143, 160], [1160, 200], [1180, 240], [1204, 280], [1215, 291], [1228, 294], [1240, 288], [1246, 275], [1248, 240], [1244, 200], [1241, 180], [1239, 160], [1238, 140], [1237, 100], [1243, 50], [1270, 18], [1325, 10], [1370, 22], [1405, 60], [1431, 140], [1439, 150], [1450, 160], [1461, 170], [1477, 180], [1480, 183], [1500, 192], [1520, 198], [1540, 202], [1560, 204], [1580, 205], [1600, 208], [1625, 211]],
];
function upperRibbon(ctx) {
  const bounds = UB.map((b) => P(b, 10));
  // saturated rainbow on the U, pastel on the tail; the change happens over the top of the arch
  // saturated on the U (darker up the arms, lighter round the bottom), pastel on the tail past the arch
  const pas = [PC.pPink, PC.pLav, PC.pPeach, PC.pCream];
  ctx.save();
  ctx.beginPath(); ctx.rect(-100, -100, 1410, 1200); ctx.clip();
  bands(ctx, bounds, PC.uTop.map((c, i) => { const g = ctx.createLinearGradient(0, 230, 0, 345); g.addColorStop(0, c); g.addColorStop(1, PC.uBot[i]); return g; }), 2.7);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(1310, -100, 400, 1200); ctx.clip();
  bands(ctx, bounds, PC.uTop.map((c, i) => gradX(ctx, 1310, 1372, c, pas[i])), 2.7);
  ctx.restore();
}

// ---------------------------------------------------------------- the big lower rainbow (laptop view)
// Top (outer, purple) and bottom (inner, yellow) edges as matched pairs across the band, measured on the
// rectified laptop page (stripe runs down columns x = 150…950 and along rows y = 700…980).
const LOW_T = [[-40, 480], [150, 542], [300, 580], [450, 659], [600, 686], [750, 663], [880, 650], [1000, 660], [1085, 705], [1125, 800], [1080, 900], [1000, 975], [950, 1040]];
// laptop view: the U-turn's inner edge sits ~20 units further in (the source's bands are wider there and the pale
// inner band shows right of the button)
const LOW_B = [[-40, 760], [150, 810], [300, 858], [450, 870], [600, 851], [750, 822], [860, 790], [915, 800], [938, 840], [932, 868], [885, 910], [785, 978], [735, 1040]];
// Laptop view, x < 320 (measured per 25-unit column on the rectified source): the ribbon's left end fans out - the
// outer purple band widens to ~115 units and its top edge climbs to ~415 - and it fades toward the screen's left edge
// (~50 % at x 100, ~70 % at x 200).
const LOW_L = [
  [[-40, 395], [35, 418], [100, 415], [135, 420], [185, 470], [235, 533], [310, 585]],
  [[-40, 470], [35, 490], [100, 510], [135, 535], [185, 572], [235, 607], [310, 655]],
  [[-40, 588], [35, 595], [100, 610], [135, 625], [185, 655], [235, 688], [310, 732]],
  [[-40, 628], [35, 640], [100, 680], [135, 700], [185, 735], [235, 768], [310, 800]],
  [[-40, 715], [35, 745], [100, 780], [160, 805], [235, 845], [310, 862]],
];
const lerpTab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; const u = (x - a) / (b - a), w = u * u * (3 - 2 * u); return va + (vb - va) * w; } return T[T.length - 1][1]; };
function lowerRibbon(ctx) {
  const T = P(LOW_T, 12), B = P(LOW_B, 12);
  const bounds = [0, 1, 2, 3, 4].map((k) => T.map((p, i) => {
    const x = p[0] + (B[i][0] - p[0]) * (k / 4), y = p[1] + (B[i][1] - p[1]) * (k / 4);
    if (x >= 340 || i > T.length / 2) return [x, y];
    const u = Math.max(0, Math.min(1, (x - 280) / 60)), w = u * u * (3 - 2 * u);
    return [x, lerpTab(LOW_L[k], x) * (1 - w) + y * w];
  }));
  const sat = ["#4f42a6", "#c93c89", "#e0493a", "#efc04a"];
  const pas = ["#9384c6", "#eea6c8", "#eba080", "#f3e3bd"];
  bands(ctx, bounds, sat.map((c, i) => gradX(ctx, 560, 860, c, pas[i])), 3.2);
  // the fade toward the left edge, per band (measured ratios source/render per 50-unit cell, x < 400): the outer
  // purple band fades most, the red and yellow least
  const FADE = [0.4, 0.34, 0.26, 0.24];   // (fix pass 1d: the ribbon runs out to the bezel on the source)
  for (let k = 0; k < 4; k++) {
    ctx.save();
    ctx.beginPath(); poly(ctx, bounds[k]); for (let j = bounds[k + 1].length - 1; j >= 0; j--) ctx.lineTo(bounds[k + 1][j][0], bounds[k + 1][j][1]); ctx.closePath(); ctx.clip();
    const fd = ctx.createLinearGradient(-40, 0, 380, 0), f = FADE[k];
    fd.addColorStop(0, `rgba(14,10,12,${f})`); fd.addColorStop(0.35, `rgba(14,10,12,${(f * 0.85).toFixed(3)})`); fd.addColorStop(0.62, `rgba(14,10,12,${(f * 0.45).toFixed(3)})`); fd.addColorStop(1, "rgba(14,10,12,0)");
    ctx.fillStyle = fd; ctx.fillRect(-40, 300, 420, 700);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the burst of petals behind "Pure"
// Behind "Pure": thin rainbow wedges converge on a hub at the top-left corner of the r (they show above the u and
// in the u–r gap), and "melting" rainbow tubes curl up out of the u's counter toward the upper left (flames above
// the P and u on the laptop view; drips in the counter on the close-up). The letters cover the rest.
const HUB = [888, 362];
const RAYS = [
  // [a0, a1 (deg, 0 = right, 90 = down), length, colour]
  [100, 108, 190, "#e6c65e"], [108, 117, 190, "#df7a58"], [117, 126, 190, "#d6679a"], [126, 134, 190, "#5b4f9e"], [134, 142, 190, "#d6679a"],
  [142, 150, 190, "#df7a58"], [150, 158, 190, "#e6c65e"], [158, 166, 190, "#d6679a"], [166, 174, 190, "#5b4f9e"], [174, 180.5, 190, "#d6679a"],
  [180.5, 185.5, 140, "#e6c65e"], [185.5, 193.5, 140, "#df7a58"], [193.5, 204.5, 140, "#d6679a"], [204.5, 212, 120, "#5b4f9e"],
];
function rays(ctx) {
  const [hx, hy] = HUB;
  ctx.lineJoin = "round";
  for (const [a0, a1, len, col] of RAYS) {
    if (a0 >= 183) continue;   // laptop view: the upper rays are replaced by the fan
    const r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(r0) * len, hy + Math.sin(r0) * len);
    ctx.lineTo(hx + Math.cos(r1) * len, hy + Math.sin(r1) * len);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  }
}
// A symmetric rainbow tube: nested strokes with round caps, so its ends read as nested drips.
function tube(ctx, pts, W, cols, lw = 3) {
  const s = P(pts, 10);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  cols.forEach((c, k) => {
    const w = W * (1 - k / cols.length);
    strokePoly(ctx, s, w + lw, PC.line);
    strokePoly(ctx, s, Math.max(0.5, w - lw), c);
  });
}
const TUBES = [
  // the nested drip down the u's counter
  [[[752, 380], [752, 415], [752, 448]], 30, ["#e6c65e", "#df7a58", "#d6679a"]],
];
// Fat petals fanning up-left out of the u's counter (a big purple/pink one reaching toward the smiley ball, then
// pink, orange and yellow lobes stacked above the u), each with a nested inner stripe.
// Petals fanning up-left out of the u's counter: four long ones reaching over the P toward the smiley ball
// (laptop view), then short lobes stacked just above the u (close-up), each with a nested inner stripe.
const FLAMES = [
  // base x, y, start angle, end angle (deg), length, tip half-width, colour, inner colour
  [752, 388, 260.1, 244.1, 206, 34, "#5b4f9e", "#d6679a"],
  [752, 388, 244.3, 228.3, 213, 30, "#d6679a", "#5b4f9e"],
  [752, 388, 227.6, 211.6, 230, 30, "#df7a58", "#d6679a"],
  [752, 388, 216.7, 200.7, 267, 30, "#e6c65e", "#df7a58"],
  [752, 388, 241.7, 233.7, 145, 24, "#d6679a", "#df7a58"],
  [752, 388, 226.2, 220.2, 92, 19, "#df7a58", "#e6c65e"],
  [752, 388, 207.9, 203.9, 75, 15, "#e6c65e", null],
];
function petal(ctx, hx, hy, a0, a1, len, hw, col, inner) {
  petalShape(ctx, hx, hy, a0, a1, len, hw, col);
  if (inner) petalShape(ctx, hx, hy, a0 + (a1 - a0) * 0.1, a1, len * 0.86, hw * 0.52, inner);
}
function petalShape(ctx, hx, hy, a0, a1, len, hw, col) {
  const n = 28, C = [[hx, hy]];
  let x = hx, y = hy;
  for (let i = 1; i <= n; i++) {
    const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180;
    x += (Math.cos(a) * len) / n; y += (Math.sin(a) * len) / n; C.push([x, y]);
  }
  const L = [], Rr = [];
  for (let i = 0; i <= n; i++) {
    const p = C[i], a = C[Math.max(0, i - 1)], b = C[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = hw * Math.pow(i / n, 0.7);
    L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]);
  }
  const ea = (a1 * Math.PI) / 180;
  ctx.beginPath(); poly(ctx, L);
  ctx.arc(C[n][0], C[n][1], hw, ea + Math.PI / 2, ea - Math.PI / 2, true);
  for (let i = n; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
}
// Laptop view: the fan is a spray of long straight wedges from a hub behind the u-r (sampled along arcs about
// (880, 372) on the rectified source: yellow 184-193 deg, orange, red 198-210, magenta, purple-blue up to ~223 deg,
// reaching ~340 units, under the smiley ball), not the petals of the close-up.
const HUB2 = [880, 372];
const FAN = [
  [183, 188, 300, "#e6c65e"], [188, 193, 330, "#e6c65e"], [193, 198, 345, "#df7a58"], [198, 204, 350, "#e0493a"],
  [204, 210, 345, "#e0493a"], [210, 214, 335, "#c93c89"], [214, 218, 310, "#c93c89"], [218, 223, 270, "#5b4f9e"],
];
// fix pass 1d: the source's fan is not straight wedges but five long nested petals fanning up-left out of the u's
// counter over the P, the top one reaching above the date line (rectified source, 25.00: tips yellow (540, 290),
// orange (573, 250), pink (628, 218), purple (655, 196), a blue sliver behind; drawn back to front)
const FAN_P = [
  // hub x, y, base angle, tip angle (deg), length, tip half-width, colour, inner stripe
  [748, 394, 262, 256, 205, 20, "#3f4aa0", null],
  [748, 394, 252, 245, 222, 28, "#5b4f9e", "#7a6cc0"],
  [748, 394, 242, 235, 216, 30, "#c93c89", "#d6679a"],
  [748, 394, 228, 220, 228, 32, "#e0493a", "#df7a58"],
  [748, 394, 214, 206, 234, 36, "#e6c65e", "#efd98a"],
];
function fan(ctx) {
  ctx.lineJoin = "round";
  for (const [hx, hy, a0, a1, len, hw, col, inner] of FAN_P) petal(ctx, hx, hy, a0, a1, len, hw, col, inner);
}
// Laptop view: under the r-e junction the source shows the fan's stripes spilling out below the letters (purple by
// the r, then magenta, orange, yellow by the e) down to y ~545, and a white sparkle at (1045, 548).
const FAN_LO = [[975, 470], [[22, 44, 84, "#e6c65e"], [44, 64, 88, "#df7a58"], [64, 84, 86, "#c93c89"], [84, 104, 80, "#5b4f9e"]]];
function fanLow(ctx) {
  const [[hx, hy], W] = FAN_LO;
  ctx.lineJoin = "round";
  for (const [a0, a1, len, col] of W) {
    const r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180, am = (r0 + r1) / 2;
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(r0) * len, hy + Math.sin(r0) * len);
    ctx.quadraticCurveTo(hx + Math.cos(am) * len * 1.12, hy + Math.sin(am) * len * 1.12, hx + Math.cos(r1) * len, hy + Math.sin(r1) * len);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  }
}
function burst(ctx) {
  ctx.lineJoin = "round";
  fan(ctx);
  fanLow(ctx);
  rays(ctx);
  for (const [pts, W, cols] of TUBES) tube(ctx, pts, W, cols);
}
// The swoosh that runs down between the r and the e, hugging the r's ball terminal.
function swoosh(ctx) {
  const B = [
    [[908, 470], [909, 510]],
    [[930, 452], [928, 480], [932, 512]],
    [[957, 452], [955, 480], [958, 512]],
    [[980, 440], [977, 480], [981, 512]],
    [[1000, 420], [998, 470], [1003, 512]],
  ].map((b) => (b.length > 2 ? P(b, 8) : b));
  bands(ctx, B, [PC.purple, PC.pink, PC.orange, PC.gold], 3);
  // the crescent under the ball, and a pink sliver against the stem
  ctx.beginPath(); ctx.moveTo(912, 406); ctx.quadraticCurveTo(916, 452, 950, 462); ctx.quadraticCurveTo(972, 462, 985, 448);
  ctx.lineTo(960, 440); ctx.quadraticCurveTo(930, 440, 925, 405); ctx.closePath();
  ctx.fillStyle = PC.gold; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
}

// ---------------------------------------------------------------- the wordmark
// "u", "r", "e" follow the close-up's letter outlines (page units); "P" and "Imagination" follow the laptop view.
const L_P = [[478, 507, 1], [478, 499, 1], [490, 488], [492, 460], [492, 360], [487, 334], [482, 326, 1], [600, 325], [628, 332], [646, 352], [651, 385], [644, 418], [625, 440], [598, 450], [584, 452, 1], [584, 488], [598, 499, 1], [598, 507, 1]];
const L_U = [[686, 364, 1], [722, 363], [734, 372], [740, 390], [741, 418], [744, 450], [752, 465], [761, 456], [766, 430], [764, 398], [757, 375], [755, 367, 1], [835, 367, 1], [827, 386], [821, 410], [819, 440], [821, 470], [826, 495], [830, 509, 1], [760, 511], [706, 509], [682, 497], [673, 474], [677, 448], [684, 420], [684, 392], [684, 370]];
const L_R = [[845, 366, 1], [911, 366, 1], [912, 381, 1], [918, 376], [931, 365], [948, 360], [963, 364], [972, 378], [974, 393], [970.5, 407], [970, 416], [975, 421], [982, 416], [987, 423], [985, 434], [976, 444], [958, 450], [942, 447], [931, 437], [927.5, 421], [924, 407], [918, 403.5], [912.5, 410], [910, 430], [909.5, 462], [912, 509, 1], [850, 509, 1], [849, 482], [855, 450], [856, 410], [852, 385]];
const L_E = [[1123, 457, 1], [1126, 439], [1126, 420], [1123, 404], [1116, 389], [1107, 378], [1095, 369], [1078, 362.5], [1060, 361], [1044, 363], [1030, 368], [1017, 377], [1007, 389], [999, 403], [994.5, 420], [993, 442], [995, 458], [1000, 471], [1008, 484], [1019, 495], [1034, 504], [1054, 509], [1078, 510], [1097, 507], [1111, 502, 1], [1111, 488], [1110, 472, 1], [1102, 477], [1091, 480.5], [1071, 479], [1058, 472], [1052, 465], [1050, 458, 1]];
const E_COUNTER = [[1050, 458, 1], [1100, 458, 1], [1100, 478.5, 1], [1091, 480.5], [1071, 479], [1058, 472], [1052, 465]];

let _imag = null;
// laptop view: Fraunces 900 (the higher-contrast cut) reads closer to the source's word than Fraunces Soft (blurred
// error over the word 9.7 against 10.4; wider tracking and taller letters measured worse)
const IM_SPAN = 866, IM_R = 2720, IM_CX = 815, IM_BASE = 626, IM_SY = 0.97;
const IM_FONT = 900, IM_FAM = "Fraunces", IM_TRACK = 0;
function imagination(ctx) {
  // arched: baseline 665 at the ends, 640 in the middle (laptop view)
  ctx.font = `${IM_FONT} 100px ${IM_FAM}`;
  const word = "Imagination", track = IM_TRACK;
  const ws = [...word].map((ch) => ctx.measureText(ch).width + track);
  const total = ws.reduce((a, b) => a + b, 0);
  // laptop view (measured on the rectified source, bright-pixel row profiles per 150-unit column): the word spans
  // x 380-1250, its x-height is ~72 units (not squashed), and it arches harder - baseline ~660 at the ends, ~626 at
  // x ~815
  const size = (100 * IM_SPAN) / total;
  const k = size / 100;
  ctx.font = `${IM_FONT} ${size.toFixed(2)}px ${IM_FAM}`;
  const R = IM_R, cx = IM_CX, cy = IM_BASE + R;
  let x = 382;
  const glyphs = [];
  for (let i = 0; i < word.length; i++) {
    const w = ws[i] * k, mid = x + w / 2;
    const ang = Math.asin((mid - cx) / R);
    glyphs.push([word[i], mid, ang]);
    x += w;
  }
  _imag = glyphs;
  const paint = (pass) => {
    for (const [ch, mid, ang] of glyphs) {
      ctx.save();
      ctx.translate(cx + Math.sin(ang) * R, cy - Math.cos(ang) * R + 4);
      ctx.rotate(ang * 1.0); ctx.scale(1, IM_SY);
      ctx.textAlign = "center";
      if (pass === 0) { ctx.lineWidth = 7; ctx.strokeStyle = PC.line; ctx.lineJoin = "round"; ctx.strokeText(ch, 0, 0); }
      else { ctx.fillStyle = PC.title; ctx.fillText(ch, 0, 0); ctx.lineWidth = 3; ctx.strokeStyle = PC.title; ctx.lineJoin = "round"; ctx.strokeText(ch, 0, 0); }
      ctx.restore();
    }
  };
  paint(0); paint(1);
  ctx.textAlign = "left";
}

function wordmark(ctx) {
  swoosh(ctx);
  const letters = [L_P, L_U, L_R, L_E].map((l) => outline(l, 8));
  for (const l of letters) fillOutline(ctx, l, null, 4.2);
  for (const l of letters) fillOutline(ctx, l, PC.title);
  // counters: the P's yellow eye with its dark wedge, the e's eye and lower counter
  ctx.lineWidth = 3; ctx.strokeStyle = PC.line;
  ctx.beginPath(); ctx.ellipse(566, 399, 21, 23, 0, 0, 7); ctx.fillStyle = PC.yellowDeep; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(566, 399); ctx.arc(566, 399, 21, 0.1, 1.5); ctx.closePath(); ctx.fillStyle = "#2a1a14"; ctx.fill();
  ctx.beginPath(); ctx.arc(1064, 421, 15.5, 0, 7); ctx.fillStyle = PC.yellow; ctx.fill(); ctx.stroke();
  fillOutline(ctx, outline(E_COUNTER, 8), PC.yellow, 3);
  imagination(ctx);
}

// ---------------------------------------------------------------- small illustrations (laptop view)
function cloudLeft(ctx) {
  ctx.lineJoin = "round";
  // magenta base streak
  ctx.beginPath(); ctx.moveTo(-10, 258); ctx.lineTo(300, 256); ctx.quadraticCurveTo(335, 262, 350, 276); ctx.quadraticCurveTo(300, 280, 250, 279); ctx.lineTo(-10, 281); ctx.closePath();
  ctx.fillStyle = "#cf4f98"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  const outer = [[-10, 258, 1], [-10, 140], [20, 112], [55, 103], [88, 112], [100, 150], [130, 160], [150, 158], [165, 170], [190, 178], [215, 207], [235, 215], [250, 248], [262, 257, 1]];
  fillOutline(ctx, outline(outer, 8), "#e6a2d2", 3);
  const band = [[-10, 258, 1], [-10, 185], [20, 172], [50, 170], [80, 182], [110, 200], [140, 205], [170, 225], [190, 250], [205, 257, 1]];
  fillOutline(ctx, outline(band, 8), "#efe4d2", 3);
  const hills = [[-10, 245, 1], [-10, 218], [15, 208], [45, 200], [70, 214], [95, 220], [115, 232], [130, 245, 1]];
  fillOutline(ctx, outline(hills, 8), "#6a5bb4", 3);
}
function cloudRight(ctx) {
  ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(1265, 548); ctx.quadraticCurveTo(1280, 536, 1320, 536); ctx.lineTo(1620, 534); ctx.lineTo(1620, 552); ctx.lineTo(1275, 552); ctx.closePath();
  ctx.fillStyle = "#e8927a"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  // orange silhouette: soft top edge, no keyline where it meets the dark (as on the close-up)
  const outer = [[1320, 540, 1], [1332, 515], [1352, 500], [1375, 494], [1390, 470], [1410, 462], [1430, 455], [1448, 445], [1462, 425], [1482, 409], [1502, 406], [1522, 412], [1540, 430], [1548, 452], [1566, 460], [1585, 456], [1610, 450], [1620, 540, 1]];
  const o = outline(outer, 8);
  ctx.beginPath(); poly(ctx, o); ctx.closePath();
  const g = ctx.createLinearGradient(1320, 0, 1600, 0); g.addColorStop(0, "#c68268"); g.addColorStop(0.5, "#b06d52"); g.addColorStop(1, "#aa5c46"); ctx.fillStyle = g; ctx.fill();
  const band = [[1380, 540, 1], [1392, 522], [1412, 507], [1432, 500], [1455, 486], [1478, 470], [1500, 462], [1522, 468], [1545, 478], [1566, 474], [1590, 468], [1620, 470], [1620, 540, 1]];
  fillOutline(ctx, outline(band, 8), "#cfc6b2", 3);
  const sun = [[1455, 540, 1], [1470, 516], [1488, 503], [1506, 498], [1526, 506], [1540, 520], [1552, 540, 1]];
  fillOutline(ctx, outline(sun, 8), "#e7c252", 3);
}
function daisy(ctx, x, y, R, face = true) {
  ctx.lineJoin = "round";
  // stem + leaves
  if (face) {
    ctx.beginPath(); ctx.moveTo(x + 40, y + 60); ctx.quadraticCurveTo(x + 70, y + 130, x + 95, y + 200); ctx.lineWidth = 9; ctx.strokeStyle = PC.line; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = "#8cc04a"; ctx.stroke();
    for (const [lx, ly, rot, s] of [[x + 110, y + 60, -0.7, 1], [x + 55, y + 140, 0.6, 0.8]]) {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(0, -30, 42, 0); ctx.quadraticCurveTo(0, 30, -40, 0); ctx.closePath();
      ctx.fillStyle = "#94c451"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
      ctx.restore();
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.translate(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.42, R * 0.25, 0, 0, 7);
    ctx.fillStyle = "#f1efe6"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(x, y, R * 0.36, 0, 7); ctx.fillStyle = "#ecc452"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  if (face) {
    ctx.fillStyle = "#2b1a14";
    ctx.beginPath(); ctx.ellipse(x - 9, y - 4, 5, 7, 0, 0, 7); ctx.ellipse(x + 11, y - 4, 5, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2, y + 5, 14, 0.35, Math.PI - 0.35); ctx.lineWidth = 3; ctx.strokeStyle = "#2b1a14"; ctx.stroke();
  }
}
function smileyBall(ctx) {
  const x = 530, y = 188, r = 49;   // laptop view: measured on the rectified source (was 520, 200, 46)
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#efd068"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 14, y - 16, 16, 0, 7); ctx.fillStyle = "rgba(255,245,200,0.45)"; ctx.fill();
  ctx.fillStyle = "#2b1a14";
  ctx.beginPath(); ctx.ellipse(x + 8, y + 2, 5, 7, 0, 0, 7); ctx.ellipse(x + 26, y + 2, 5, 7, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 17, y + 12, 13, 0.3, Math.PI - 0.3); ctx.lineWidth = 3; ctx.strokeStyle = "#2b1a14"; ctx.stroke();
  // bow on top
  ctx.save(); ctx.translate(x + 26, y - 70); ctx.rotate(0.3);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -9); ctx.lineTo(-14, 9); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(14, -9); ctx.lineTo(14, 9); ctx.closePath();
  ctx.fillStyle = "#d2443a"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.restore();
}
// Laptop view (measured on the rectified source): a pink toy camera tilted ~-30 deg (body x 250-335, y 380-455) with
// a pale top panel, a dark-gold lens low on the left and a strap, under a small white spray bottle (x 300-322,
// y 312-364) - not a walkie-talkie.
function walkie(ctx) {
  ctx.lineJoin = "round";
  ctx.save(); ctx.translate(311, 338); ctx.rotate(-0.12);
  ctx.beginPath(); ctx.roundRect(-11, -26, 22, 52, 9); ctx.fillStyle = "#e9e7e0"; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.lineWidth = 1.4; for (const y of [-12, -4, 4, 12]) { ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.translate(292, 418); ctx.rotate(-0.55);
  // strap
  ctx.beginPath(); ctx.moveTo(40, -14); ctx.quadraticCurveTo(62, -20, 66, -44); ctx.lineWidth = 9; ctx.strokeStyle = PC.line; ctx.lineCap = "round"; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = "#d9679f"; ctx.stroke(); ctx.lineCap = "butt";
  ctx.beginPath(); ctx.roundRect(-46, -30, 92, 62, 13); ctx.fillStyle = "#d9679f"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-4, -30, 50, 28, [10, 13, 4, 4]); ctx.fillStyle = "#e4dbe8"; ctx.fill(); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(12, -24, 15, 15, 3); ctx.fillStyle = "#3b3346"; ctx.fill();
  ctx.beginPath(); ctx.arc(-18, 9, 17, 0, 7); ctx.fillStyle = "#e7a6c6"; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(-18, 9, 11, 0, 7); ctx.fillStyle = "#8f7a34"; ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#b86a92"; for (const [x, y] of [[14, 12], [24, 12], [34, 12], [14, 21], [24, 21], [34, 21]]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
  ctx.restore();
}
// Laptop view: a grey mushroom plume (x 164-234, y 500-560) rising from a small slate-blue figure (x 150-200,
// y 560-620), not a trumpet tree.
function trumpetTree(ctx) {
  ctx.fillStyle = "#9ea0a2"; ctx.strokeStyle = PC.line; ctx.lineWidth = 2.5;
  for (const [x, y, r] of [[186, 522, 20], [210, 516, 17], [226, 530, 12], [168, 532, 13], [198, 538, 14]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(190, 545); ctx.lineTo(197, 545); ctx.lineTo(193, 575); ctx.closePath(); ctx.fillStyle = "#8a8e94"; ctx.fill();
  // the figure: head, body, arms up
  ctx.fillStyle = "#56607a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(186, 582, 8, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(176, 590); ctx.lineTo(196, 590); ctx.lineTo(192, 616); ctx.lineTo(180, 616); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineCap = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "#56607a";
  ctx.beginPath(); ctx.moveTo(178, 594); ctx.lineTo(166, 576); ctx.moveTo(194, 594); ctx.lineTo(204, 606); ctx.stroke(); ctx.lineCap = "butt";
}
// Laptop view: an orange-and-white rocket robot tilted ~20 deg (x 178-303, y 750-895) with curly dark antennae, an
// orange porthole and a dark side window, a pink-red base, and white smoke puffs trailing down-left.
function robot(ctx) {
  ctx.fillStyle = "#eeeeea";
  for (const [x, y, r] of [[70, 955, 34], [110, 985, 30], [150, 950, 26], [175, 915, 24], [200, 890, 20], [60, 1000, 30], [130, 920, 18], [218, 870, 16]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(240, 826); ctx.rotate(0.36);
  ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.lineJoin = "round";
  for (const dx of [-6, 18]) { ctx.beginPath(); ctx.moveTo(dx, -52); ctx.quadraticCurveTo(dx - 2, -74, dx + 10, -76); ctx.quadraticCurveTo(dx + 18, -74, dx + 14, -64); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 50, 34, 16, 0, 0, 7); ctx.fillStyle = "#d9826e"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-46, -56, 92, 108, 32); ctx.fillStyle = "#d3cbbd"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-58, -30, 22, 58, 5); ctx.fillStyle = "#f1eee6"; ctx.fill(); ctx.lineWidth = 2.4; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-20, -66, 40, 18, 5); ctx.fillStyle = "#f1eee6"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-12, -10, 24, 0, 7); ctx.fillStyle = "#bfb7aa"; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(-12, -10, 13, 0, 7); ctx.fillStyle = "#e0983c"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, 18, 12, 0, 7); ctx.fillStyle = "#e4d6c8"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, 18, 6.5, 0, 7); ctx.fillStyle = "#2c1f1a"; ctx.fill();
  ctx.restore();
}
function pencil(ctx) {
  ctx.save(); ctx.translate(495, 845); ctx.rotate(0.85);
  ctx.beginPath(); ctx.rect(-38, -9, 64, 18); ctx.fillStyle = "#eadcb4"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(26, -9); ctx.lineTo(44, 0); ctx.lineTo(26, 9); ctx.closePath(); ctx.fillStyle = "#d86a8a"; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function heartApple(ctx) {
  ctx.save(); ctx.translate(1112, 740);
  ctx.beginPath(); ctx.moveTo(0, 28); ctx.bezierCurveTo(-40, 5, -32, -30, -8, -24); ctx.quadraticCurveTo(0, -20, 4, -12); ctx.quadraticCurveTo(10, -26, 24, -24); ctx.bezierCurveTo(44, -18, 38, 10, 0, 28);
  ctx.fillStyle = "#e8743e"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(10, -38, 6, 13, 0.3, 0, 7); ctx.fillStyle = "#a6cf5a"; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- chrome: marquee, nav, logo, pills, date, button
function marquee(ctx) {
  // laptop view (measured on the rectified source): the bar reads ~64 once graded (not ~30), its ticker ~1.3x larger
  // and brighter
  ctx.fillStyle = "#2c2e2b"; ctx.fillRect(0, 0, PAGE_W, 46);
  ctx.fillStyle = "#b9bab2"; ctx.fillRect(0, 45, PAGE_W, 2.2);
  ctx.font = "600 15px Poppins"; ctx.fillStyle = "#c9cac2";
  for (let x = -130; x < PAGE_W; x += 256) ctx.fillText("Early bird tickets on sale now!", x, 29);
}
function nav(ctx) {
  ctx.font = "500 14.5px Poppins"; ctx.fillStyle = "#d4d5cb";
  ctx.fillText("Agenda", 152, 116); ctx.fillText("Speakers", 254, 116); ctx.fillText("FAQ", 365, 116);
}
// Original script mark in the logo slot (two lines, like a hand-lettered badge).
function logo(ctx) {
  ctx.save();
  ctx.translate(796, 142); ctx.rotate(-0.06);
  ctx.textAlign = "center"; ctx.fillStyle = "#ecebe4";   // laptop view: the mark in this slot reads white, not cream
  ctx.font = "400 31px Shrikhand"; ctx.fillText("Wonder", -4, -18);
  ctx.font = "400 40px Shrikhand"; ctx.fillText("Camp", 4, 22);
  ctx.beginPath(); ctx.arc(52, 16, 2.6, 0, 7); ctx.fill();
  ctx.restore(); ctx.textAlign = "left";
}
function pill(ctx, x0, x1, label, icon) {
  const y0 = 92, y1 = 127, r = (y1 - y0) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.fillStyle = "#cfd0c4"; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, r); ctx.lineWidth = 2.4; ctx.strokeStyle = "#20231c"; ctx.stroke();
  ctx.font = "600 14px Poppins"; ctx.fillStyle = "#23261f"; ctx.textAlign = "center";
  const cx = icon ? (x0 + x1) / 2 - 9 : (x0 + x1) / 2;
  ctx.fillText(label, cx, 114.5);
  if (icon) {
    ctx.beginPath(); ctx.arc(x1 - 20, 109.5, 7.5, 0, 7); ctx.fillStyle = "#23261f"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x1 - 20, 105); ctx.lineTo(x1 - 20, 113); ctx.moveTo(x1 - 23.5, 110); ctx.lineTo(x1 - 20, 113.5); ctx.lineTo(x1 - 16.5, 110);
    ctx.lineWidth = 1.6; ctx.strokeStyle = "#cfd0c4"; ctx.stroke();
  }
  ctx.textAlign = "left";
}
let _dateSize = null;
function dateLine(ctx) {
  ctx.save();
  ctx.font = "600 100px Poppins";
  if (!_dateSize) _dateSize = (100 * 249) / ctx.measureText("24 - April 26, 2025").width;
  const s = _dateSize;
  ctx.font = `600 ${s.toFixed(2)}px Poppins`;
  const full = "April 24 - April 26, 2025";
  const x = 981 - ctx.measureText(full).width;
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1.2; ctx.shadowOffsetY = 1.8;
  ctx.fillStyle = "#e4e6db"; ctx.fillText(full, x, 275.5);
  ctx.font = `600 ${(s * 0.72).toFixed(2)}px Poppins`;
  ctx.fillText("Linden Hollow", 717, 309.5);
  ctx.restore();
}
function ticketButton(ctx, text, caret) {
  ctx.save(); ctx.translate(800, 828); ctx.rotate(-0.03);
  ctx.beginPath(); ctx.roundRect(-170, -50, 340, 100, 50); ctx.fillStyle = "#efe9dd"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.font = "600 34px Poppins"; ctx.fillStyle = "#3b3632";
  if (text == null) { ctx.textAlign = "center"; ctx.fillText("Get your tickets", 0, 12); }
  else if (text === "" && !caret) { /* blank */ }
  else {
    ctx.fillText(text, -122, 12);
    if (caret) { const w = ctx.measureText(text).width; ctx.fillRect(-120 + w, -14, 3, 32); }
  }
  ctx.restore(); ctx.textAlign = "left";
}
const STARS = [
  // [x, y, r, colour]
  [338, 203, 12, "#eceee6"], [380, 457, 8, "#eceee6"], [935.5, 207.5, 12.5, "#e3e5dc"], [1092, 135, 20, "#eceee6"], [1330, 690, 15, "#eceee6"],
  [1452, 808, 8, "#eceee6"], [1100, 930, 9, "#eceee6"], [1045, 548, 14, "#f2f2ec"], [1030, 196, 11, "#8a86c2"], [1392, 492, 12, "#8a86c2"],
  [378, 240, 6, "#e0784a"], [1440, 256, 6, "#d86c4a"], [1580, 640, 6, "#e6e6de"],
];
const DOTS = [[180, 355, 3.2], [1190, 600, 3], [1370, 862, 2.4], [1540, 905, 3], [1255, 245, 2.2], [445, 598, 2.2], [980, 950, 2.4]];

// ---------------------------------------------------------------- the page
export function drawLaptopPage(ctx, opts = {}) {
  ctx.save();
  ctx.fillStyle = PC.bg; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // a faint lift toward the middle of the screen
  const lift = ctx.createRadialGradient(820, 470, 60, 820, 470, 900);
  lift.addColorStop(0, "rgba(40,50,38,0.55)"); lift.addColorStop(1, "rgba(40,50,38,0)");
  ctx.fillStyle = lift; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  for (const [x, y, r] of DOTS) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#cfd1c8"; ctx.fill(); }
  lowerRibbon(ctx);
  cloudLeft(ctx);
  cloudRight(ctx);
  upperRibbon(ctx);
  burst(ctx);
  smileyBall(ctx);
  walkie(ctx);
  trumpetTree(ctx);
  wordmark(ctx);
  robot(ctx);
  pencil(ctx);
  heartApple(ctx);
  daisy(ctx, 1330, 822, 99);   // laptop view: the source's daisy is ~8 % smaller than F3's
  daisy(ctx, 1522, 998, 50, false);
  for (const [x, y, r, c] of STARS) star4(ctx, x, y, r, c);
  dateLine(ctx);
  logo(ctx);
  nav(ctx);
  pill(ctx, 1200, 1295, "Register");
  pill(ctx, 1318, 1442, "Tix Info", true);
  ticketButton(ctx, opts.ticketText ?? null, opts.ticketCaret);
  marquee(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------- caches

// Selection + note card (pureimg's drawPureOverlay, with the laptop view's brighter card: the source's card paper is
// ~23 levels whiter than the "screen" theme once graded; measured on the rectified screen).
const CARD_THEME = { paper: "#f2f3f1", paperTop: "#eaebe8", paperBot: "#dedfdc", ink: "#2c2c29", text: "#62625e", muted: "#8a8a85", outline: "rgba(20,16,14,0.5)", smiley: "#d9c46e", smileyHi: "#e6d690", glow: "214,92,62", face: "#6a5c3a", rim: { dx: -3.5, dy: -1.5, color: "rgba(10,11,8,0.92)" } };
export function drawLaptopOverlay(ctx, state = {}) {
  const { sel = 1, card = null } = state;
  if (sel) {
    const S = PURE_SEL, u = Math.min(1, sel), s = 0.7 + 0.3 * (1 - Math.pow(1 - u, 2));
    const cx = (S.x0 + S.x1) / 2, cy = (S.y0 + S.y1) / 2, hw = ((S.x1 - S.x0) / 2) * s, hh = ((S.y1 - S.y0) / 2) * s;
    // fix pass 1d: the source's line is wide, soft and dark crimson (graded ~rgb(112, 54, 53)), not a thin bright red
    ctx.save(); ctx.filter = "blur(1.5px)";
    drawSelection(ctx, { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh, width: S.width, color: "rgba(150,46,48,0.88)", shadow: "rgba(70,18,18,0.7)" });
    ctx.restore();
  }
  if (card) {
    const C = PURE_CARD;
    // fix pass 1d: the card pops in blank (25.48-25.56) and its contents come up after (card.contents: 0..1)
    const k = card.contents ?? 1;
    if (k < 1) {
      const P = CARD_THEME.paper, blank = { ...CARD_THEME, ink: P, text: P, muted: P, smiley: P, smileyHi: P, face: P, glow: "242,243,241" };
      drawNoteCard(ctx, { x: C.x, y: C.y, w: C.w, notch: true, ...card, theme: blank });
    }
    if (k > 0) { ctx.save(); ctx.globalAlpha *= k; drawNoteCard(ctx, { x: C.x, y: C.y, w: C.w, notch: true, ...card, theme: CARD_THEME }); ctx.restore(); }
  }
}
