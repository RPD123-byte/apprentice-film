// s07's own copy of the laptop-view "Pure Imagination" page (from src/lib/pureimg.js, F3), re-measured for the laptop
// view of s07 on the rectified source screen (page units 1600 x 1000, the laptop quad mapped to the page rectangle).
// F3's page follows the close-up (s08) closely; the laptop view needs its own corrections (title tone and fan, sun,
// props, ticker, left rainbow), and s07 may not edit the shared lib, so the page is copied here and changed.
// Still an original design: the top-left mark is an original "Wonder Camp" mark, no third-party logo.
import { sampleCurve } from "../../lib/paths.js";
import { drawNoteCard, drawSelection } from "../../lib/notecard.js";
import { IMAG_GLYPHS } from "./imagGlyphs.js";

const PAGE_W = 1600, PAGE_H = 1000;
// The red selection (drawn round "Pure Imagination") and the note card, in page units (measured).
const PURE_SEL = { x0: 352, y0: 311.5, x1: 1247.5, y1: 682, width: 5 };
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
// (build pass, this run: beside the ticket button the U-turn's inner edge sits ~25 units further out - the source
// shows ~25 units of the pale inner band right of the button at y 790-850, and narrower pink and lavender bands)
const LOW_B = [[-40, 760], [150, 810], [300, 858], [450, 870], [600, 851], [750, 822], [865, 788], [935, 795], [966, 830], [950, 868], [884, 910], [785, 978], [735, 1040]];
// Laptop view, x < 340 (build pass, this run: re-measured per 20-unit column on the hue classes of the rectified
// source mean, snapshots/s07-bt/bands.py): the ribbon keeps rising toward the screen's left edge (slope ~0.8) instead of
// flattening; the purple band runs out at x ~110 so the magenta band tops the ribbon at the edge, and a thin orange
// band (~10-20 units) runs between the red and the yellow all along. Rows: purple top, purple/magenta, magenta/red,
// red/orange, orange/yellow, yellow bottom.
const LOW_L = [
  [[-40, 440], [0, 455], [40, 449], [80, 445], [120, 437], [160, 456], [200, 500], [250, 540], [310, 584]],
  [[-40, 440], [0, 455], [40, 449], [80, 459], [120, 500], [160, 538], [200, 578], [250, 618], [310, 655]],
  [[-40, 468], [0, 490], [40, 527], [80, 566], [120, 602], [160, 632], [200, 665], [250, 699], [310, 729]],
  [[-40, 585], [0, 603], [40, 635], [80, 667], [120, 693], [160, 720], [200, 744], [250, 768], [310, 794]],
  [[-40, 620], [0, 638], [40, 656], [80, 683], [120, 712], [160, 733], [200, 756], [250, 778], [310, 802]],
  [[-40, 705], [0, 722], [40, 742], [80, 764], [120, 794], [160, 817], [200, 830], [250, 845], [310, 862]],
];
const lerpTab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; const u = (x - a) / (b - a), w = u * u * (3 - 2 * u); return va + (vb - va) * w; } return T[T.length - 1][1]; };
// band fractions across the ribbon (top edge 0 .. bottom edge 4): the orange band sits in the top quarter of the
// yellow one (x >= 340: source R/O 807, O/Y 818 at x 600; 822 / 831 at x 450)
const LOW_F = [0, 1, 2, 3.08, 3.3, 4];
function lowerRibbon(ctx) {
  const T = P(LOW_T, 12), B = P(LOW_B, 12);
  const bounds = LOW_F.map((f, k) => T.map((p, i) => {
    const x = p[0] + (B[i][0] - p[0]) * (f / 4), y = p[1] + (B[i][1] - p[1]) * (f / 4);
    if (x >= 360 || i > T.length / 2) return [x, y];
    const u = Math.max(0, Math.min(1, (x - 300) / 60)), w = u * u * (3 - 2 * u);
    return [x, lerpTab(LOW_L[k], x) * (1 - w) + y * w];
  }));
  // colours re-balanced against the source (graded, rectified; band centres at x 450 / 600): magenta and red ~15
  // levels brighter; the pastel ends as before
  // (the "orange band" is the yellow band's orange-gold top: no keyline between the two, source x 450-600)
  const sat = ["#574fad", "#df469e", "#f05943", "#e8943e", "#f6ca49"];
  const pas = ["#9384c6", "#eea6c8", "#eba080", "#f0c898", "#f3e3bd"];
  bands(ctx, bounds, sat.map((c, i) => gradX(ctx, 560, 860, c, pas[i])), 0);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  bounds.forEach((b, k) => { if (k !== 4) strokePoly(ctx, b, 3.2, PC.line); });
  // the fade toward the left edge, per band (measured ratios source/render per 50-unit cell, x < 400): the outer
  // purple band fades most, the red and yellow least
  // (build pass: the re-measured purple and magenta bands read ~10 levels too bright left of x ~380, so their fade is
  // ~25 % deeper; all bands fade out by x ~460)
  const FADE = [0.78, 0.65, 0.42, 0.4, 0.38];
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.beginPath(); poly(ctx, bounds[k]); for (let j = bounds[k + 1].length - 1; j >= 0; j--) ctx.lineTo(bounds[k + 1][j][0], bounds[k + 1][j][1]); ctx.closePath(); ctx.clip();
    const fd = ctx.createLinearGradient(-40, 0, 460, 0), f = FADE[k];
    fd.addColorStop(0, `rgba(14,10,12,${f})`); fd.addColorStop(0.3, `rgba(14,10,12,${(f * 0.85).toFixed(3)})`); fd.addColorStop(0.55, `rgba(14,10,12,${(f * 0.5).toFixed(3)})`); fd.addColorStop(0.8, `rgba(14,10,12,${(f * 0.18).toFixed(3)})`); fd.addColorStop(1, "rgba(14,10,12,0)");
    ctx.fillStyle = fd; ctx.fillRect(-40, 300, 500, 700);
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
// Build pass (this run): the source's fan is not straight wedges but curved petals - flat ribbons that rise out of
// the u's counter and bend over to the upper left (purple, magenta, red, orange, yellow, back to front), plus a small
// second spray over the u's right arm toward the r. Each petal: a spine from its base (bx, by) whose direction turns
// from a0 to a1 (deg, 0 = right, 90 = down) over length L, half-width hw * (s / L) ^ pw, round tip. Fitted to the
// hue classes of the rectified source screen (727-763 mean; snapshots/s07-bt/fanfit.py, 0.79 -> 0.84 agreement).
const PETALS = [
  // [colour, bx, by, a0, a1, L, hw, pw]
  ["#5b4f9e", 768.6, 397.6, 266.2, 216.2, 229.6, 17.2, 0.6], ["#c93c89", 773.7, 396.2, 253.8, 203.2, 238.6, 25.2, 0.5],
  ["#e0493a", 771.6, 395.9, 242.2, 192.2, 247.6, 19.7, 0.5], ["#df7a58", 774.6, 384.8, 224.9, 180.6, 263.4, 18.7, 0.7],
  ["#e6c65e", 755.6, 400.7, 228.4, 183.4, 240.5, 24.3, 0.3],
  ["#c93c89", 720.4, 371.7, 307.2, 357.9, 101.3, 19.9, 1.2], ["#e0493a", 737.2, 384.1, 330.5, 362.8, 132.4, 10.3, 0.5],
  ["#df7a58", 729.8, 384.0, 321.2, 363.6, 91.6, 14.4, 0.1], ["#e6c65e", 766.8, 402.2, 312.3, 337.2, 50.3, 11.2, 0.5],
];
function petal2(ctx, col, bx, by, a0, a1, len, hw, pw) {
  const n = 28, C = [[bx, by]];
  let x = bx, y = by;
  for (let i = 1; i <= n; i++) { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; x += (Math.cos(a) * len) / n; y += (Math.sin(a) * len) / n; C.push([x, y]); }
  const L = [], Rr = [];
  for (let i = 0; i <= n; i++) {
    const p = C[i], a = C[Math.max(0, i - 1)], b = C[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = hw * Math.pow(i / n, pw);
    L.push([p[0] - dy * w, p[1] + dx * w]); Rr.push([p[0] + dy * w, p[1] - dx * w]);
  }
  const ea = (a1 * Math.PI) / 180;
  ctx.beginPath(); poly(ctx, L);
  ctx.arc(C[n][0], C[n][1], hw, ea + Math.PI / 2, ea - Math.PI / 2, true);
  for (let i = n; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
}
function fan(ctx) {
  ctx.lineJoin = "round";
  for (const p of PETALS) petal2(ctx, ...p);
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
// build pass (this run): the word is drawn from Fraunces outlines at a soft, low-contrast instance (imagGlyphs.js;
// canvas cannot reach the font's SOFT / opsz axes) - rounder serifs, closer to the source's retro lettering
const IM_GLYPH = "soft9_900";
const _gp = new Map();
function glyphPath(inst, ch) { const k = inst + ch; if (!_gp.has(k)) _gp.set(k, new Path2D(IMAG_GLYPHS[inst].g[ch][1])); return _gp.get(k); }
function imagination(ctx) {
  if (IM_GLYPH && IMAG_GLYPHS[IM_GLYPH]) return imaginationG(ctx, IMAG_GLYPHS[IM_GLYPH]);
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
      if (pass === 0) { ctx.lineWidth = 5; ctx.strokeStyle = PC.line; ctx.lineJoin = "round"; ctx.strokeText(ch, 0, 0); }
      else { ctx.fillStyle = PC.title; ctx.fillText(ch, 0, 0); }
      ctx.restore();
    }
  };
  paint(0); paint(1);
  ctx.textAlign = "left";
}

function imaginationG(ctx, F) {
  const word = "Imagination", track = IM_TRACK_G;
  const ws = [...word].map((ch) => F.g[ch][0] / 10 + track);   // widths at 100 px
  const total = ws.reduce((a, b) => a + b, 0);
  const size = (100 * IM_SPAN_G) / total, k = size / 100;
  const R = IM_R_G, cx = IM_CX_G, cy = IM_BASE_G + R;
  let x = IM_X0_G;
  const glyphs = [];
  for (let i = 0; i < word.length; i++) { const w = ws[i] * k, mid = x + w / 2; glyphs.push([word[i], mid, Math.asin((mid - cx) / R)]); x += w; }
  _imag = glyphs;
  const u = size / F.upm;
  const paint = (pass) => {
    for (const [ch, mid, ang] of glyphs) {
      ctx.save();
      ctx.translate(cx + Math.sin(ang) * R, cy - Math.cos(ang) * R + 4);
      ctx.rotate(ang); ctx.scale(u, -u * IM_SY_G);
      ctx.translate(-(F.g[ch][0] / 1000) * F.upm / 2, 0);
      const pth = glyphPath(IM_GLYPH, ch);
      // (the source's letters are heavier than the instance: emboldened by a stroke of the fill, IM_BOLD units)
      if (pass === 0) { ctx.lineWidth = (5 + IM_BOLD) / u; ctx.strokeStyle = PC.line; ctx.lineJoin = "round"; ctx.stroke(pth); }
      else { ctx.fillStyle = PC.title; ctx.fill(pth); if (IM_BOLD) { ctx.lineWidth = IM_BOLD / u; ctx.strokeStyle = PC.title; ctx.lineJoin = "round"; ctx.stroke(pth); } }
      ctx.restore();
    }
  };
  paint(0); paint(1);
}
// layout fitted to the source's letter mask (snapshots/s07-bt/imfit.py: blurred L1 0.30 -> 0.12): baseline 620.6 at
// x 802.9 on a 1999-unit arch, the word from x 359.5 over 866.7 units with 2.2 units tracking (at 100 px), 1.16 tall
const IM_BOLD = 3;   // swept 1.4-4 units on the word's blurred error: 3 best (8.98 -> 5.36)
const IM_SPAN_G = 866.7, IM_TRACK_G = 2.18, IM_BASE_G = 620.6, IM_SY_G = 1.16, IM_X0_G = 359.5, IM_CX_G = 802.9, IM_R_G = 1999;

// (build pass: the laptop view's "Pure" reads heavier with a thinner keyline: fill stroked 2.2 units, keyline 2.2 + 2.2
// instead of 4.2; letter-box blurred error 9.6 -> 8.8, swept keyline 1.5-4.2 x bold 0-3)
const PURE_BOLD = 2.2, PURE_KEY = 2.2;
function wordmark(ctx) {
  swoosh(ctx);
  const letters = [L_P, L_U, L_R, L_E].map((l) => outline(l, 8));
  for (const l of letters) fillOutline(ctx, l, null, PURE_KEY + PURE_BOLD);
  for (const l of letters) { fillOutline(ctx, l, PC.title); if (PURE_BOLD) { ctx.lineWidth = PURE_BOLD; ctx.strokeStyle = PC.title; ctx.lineJoin = "round"; ctx.stroke(); } }
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
// Build pass (this run): the right cloud re-measured on the rectified source mean (hue classes, top profiles every
// 10 units): a soft peach-to-salmon outer cloud with no keyline (lighter and pinker at its left, x 1335-1620, top
// ~410 at x 1500), a scalloped cream inner cloud with a dark keyline, a small scalloped yellow cloud inside it, and a
// flat peach strip underneath (y 537-551).
const CR_OUT = [[1333, 546], [1340, 533], [1350, 503], [1362, 495], [1380, 497], [1391, 487], [1399, 462], [1412, 457], [1440, 457], [1460, 453], [1471, 440], [1481, 416], [1492, 410], [1510, 409], [1521, 412], [1531, 420], [1541, 431], [1551, 452], [1561, 461], [1571, 462], [1581, 456], [1600, 450], [1625, 449], [1625, 546]];
const CR_IN = [[1383, 537], [1387, 522], [1400, 508], [1420, 498], [1440, 496], [1458, 491], [1470, 484], [1480, 477], [1490, 470], [1500, 467], [1510, 469], [1520, 474], [1530, 483], [1540, 492], [1552, 495], [1568, 492], [1580, 496], [1590, 509], [1597, 537]];
const CR_SUN = [[1446, 524], [1451, 510], [1461, 502], [1471, 503], [1481, 503], [1490, 493], [1500, 488], [1511, 491], [1521, 499], [1531, 510], [1545, 524]];
function cloudRight(ctx) {
  ctx.lineJoin = "round";
  // the strip
  ctx.beginPath(); ctx.moveTo(1268, 551); ctx.quadraticCurveTo(1270, 538, 1292, 537); ctx.lineTo(1625, 537); ctx.lineTo(1625, 551); ctx.closePath();
  ctx.fillStyle = gradX(ctx, 1300, 1600, "#e9b6a0", "#dc8e88"); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  // soft outer cloud
  ctx.save(); ctx.filter = "blur(2px)";
  ctx.beginPath(); poly(ctx, P(CR_OUT, 6)); ctx.closePath();
  const g = ctx.createLinearGradient(1340, 420, 1600, 520); g.addColorStop(0, "#d99888"); g.addColorStop(0.45, "#dc9078"); g.addColorStop(1, "#cc6a5c"); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  fillOutline(ctx, P(CR_IN, 6), "#f2eadb", 2.6);
  fillOutline(ctx, P(CR_SUN, 6), "#f0c955", 2.6);
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
  // (build pass: the laptop view's daisy has 8 broad petals with fine grey keylines and short dark base ticks, a
  // larger golden centre and a face in round brown sunglasses with a wide smile; the small one keeps a plain centre)
  const NP = face ? 8 : 9, pr = face ? [0.45, 0.3] : [0.42, 0.25];
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2 - Math.PI / 2;
    ctx.save(); ctx.translate(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, R * pr[0], R * pr[1], 0, 0, 7);
    ctx.fillStyle = "#f1efe6"; ctx.fill(); ctx.lineWidth = face ? 1.8 : 2.5; ctx.strokeStyle = face ? "#6e645e" : PC.line; ctx.stroke();
    if (face) { ctx.beginPath(); ctx.moveTo(-R * 0.2, 0); ctx.lineTo(-R * 0.06, 0); ctx.lineWidth = 2; ctx.strokeStyle = "#6e645e"; ctx.stroke(); }
    ctx.restore();
  }
  const cr = face ? R * 0.4 : R * 0.36;
  ctx.beginPath(); ctx.arc(x, y, cr, 0, 7);
  if (face) { const gg = ctx.createRadialGradient(x - cr * 0.3, y - cr * 0.3, 0, x, y, cr); gg.addColorStop(0, "#f4d468"); gg.addColorStop(1, "#dcae3e"); ctx.fillStyle = gg; } else ctx.fillStyle = "#ecc452";
  ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = PC.line; ctx.stroke();
  if (face) {
    // sunglasses
    ctx.lineWidth = 2.2; ctx.strokeStyle = "#3a2618";
    for (const dx of [-12, 12]) { ctx.beginPath(); ctx.ellipse(x + dx, y - 5, 10, 9, 0, 0, 7); ctx.fillStyle = "#6a4528"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + dx - 5, y - 9); ctx.lineTo(x + dx + 2, y - 11); ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(240,215,170,0.8)"; ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = "#3a2618"; }
    ctx.beginPath(); ctx.moveTo(x - 3, y - 7); ctx.quadraticCurveTo(x, y - 10, x + 3, y - 7); ctx.stroke();
    // wide smile
    ctx.beginPath(); ctx.moveTo(x - 13, y + 9); ctx.quadraticCurveTo(x, y + 24, x + 14, y + 8); ctx.quadraticCurveTo(x, y + 13, x - 13, y + 9); ctx.closePath();
    ctx.fillStyle = "#8a4a2a"; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = "#3a2618"; ctx.stroke();
  }
}
function smileyBall(ctx) {
  const x = 530, y = 188, r = 49;   // laptop view: measured on the rectified source (was 520, 200, 46)
  // (build pass: paler cream-yellow ball with a broad highlight; the face sits low right - two dark oval eyes with
  // white glints, looking down-left, and a small curled smile under them)
  const gb = ctx.createRadialGradient(x - 16, y - 18, 4, x, y, r); gb.addColorStop(0, "#f7ecb4"); gb.addColorStop(0.6, "#efd97a"); gb.addColorStop(1, "#e2c25a");
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = gb; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.fillStyle = "#2b1a14";
  for (const [ex, ey] of [[x + 2, y + 18], [x + 20, y + 16]]) { ctx.beginPath(); ctx.ellipse(ex, ey, 5.5, 8, -0.2, 0, 7); ctx.fill(); }
  ctx.fillStyle = "rgba(255,250,235,0.9)";
  for (const [ex, ey] of [[x + 3.5, y + 14], [x + 21.5, y + 12]]) { ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x - 14, y + 26); ctx.quadraticCurveTo(x - 20, y + 20, x - 12, y + 19); ctx.moveTo(x - 10, y + 30); ctx.quadraticCurveTo(x + 6, y + 40, x + 22, y + 30);
  ctx.lineWidth = 3; ctx.strokeStyle = "#2b1a14"; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
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
  // build pass (this run): the source's robot is a boxy white frame (a jetpack rig) round a round orange porthole, a
  // dark round window on a peach side panel, a dark mauve dome behind, two curled dark antennae and a pink base;
  // tilted ~22 deg (measured on the rectified source mean: antennae 250-300 x 742-775, porthole centre (217, 812),
  // window centre (270, 847), frame 167-300 x 765-900)
  ctx.save(); ctx.translate(238, 832); ctx.rotate(0.38);
  ctx.lineWidth = 2.6; ctx.strokeStyle = PC.line; ctx.lineJoin = "round"; ctx.lineCap = "round";
  // antennae: two curled loops
  for (const [dx, s] of [[0, 1], [22, 1]]) {
    ctx.beginPath(); ctx.moveTo(dx, -52); ctx.bezierCurveTo(dx - 4 * s, -70, dx + 4, -84, dx + 11, -80); ctx.bezierCurveTo(dx + 17, -76, dx + 13, -66, dx + 7, -68);
    ctx.lineWidth = 4.2; ctx.strokeStyle = "#4a1c1e"; ctx.stroke();
  }
  ctx.lineWidth = 2.6; ctx.strokeStyle = PC.line;
  // dome behind
  ctx.beginPath(); ctx.arc(18, -14, 46, 0, 7); ctx.fillStyle = "#5e4c4e"; ctx.fill(); ctx.stroke();
  // base
  ctx.beginPath(); ctx.ellipse(4, 52, 34, 15, 0, 0, 7); ctx.fillStyle = "#d9826e"; ctx.fill(); ctx.stroke();
  // peach side panel with the dark window
  ctx.beginPath(); ctx.roundRect(8, -18, 46, 56, 8); ctx.fillStyle = "#e6c2ae"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(31, 10, 11.5, 0, 7); ctx.fillStyle = "#2a1c19"; ctx.fill(); ctx.stroke();
  // the white frame: body, top bar, left bar, cross struts
  ctx.beginPath(); ctx.roundRect(-40, -44, 56, 92, 7); ctx.fillStyle = "#ece7dc"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-30, -58, 64, 17, 4); ctx.fillStyle = "#f4f1ea"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-56, -8, 18, 50, 4); ctx.fillStyle = "#f4f1ea"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-40, 22); ctx.lineTo(16, 22); ctx.moveTo(-12, 22); ctx.lineTo(-12, 48); ctx.stroke();
  // porthole
  ctx.beginPath(); ctx.arc(-12, -12, 21, 0, 7); ctx.fillStyle = "#f3efe6"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-12, -12, 13, 0, 7); ctx.fillStyle = "#dd9438"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-16, -16, 4, 0, 7); ctx.fillStyle = "rgba(255,240,200,0.7)"; ctx.fill();
  ctx.restore(); ctx.lineCap = "butt";
}
// (build pass: the source's pencil is ~15 % larger, from (460, 815) to its tip at (525, 885), a cream-yellow body)
function pencil(ctx) {
  ctx.save(); ctx.translate(488, 846); ctx.rotate(0.83); ctx.scale(1.15, 1.2);
  ctx.beginPath(); ctx.rect(-38, -9, 64, 18); ctx.fillStyle = "#e6d8a6"; ctx.fill(); ctx.lineWidth = 2.3; ctx.strokeStyle = PC.line; ctx.stroke();
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
  // (build pass: the source's ticker is as wide but shorter - cap height ~8 units, rows 20-29 - and sits ~50 units
// further right)
  ctx.save(); ctx.scale(1, 0.8);
  ctx.font = "600 14.8px Poppins"; ctx.fillStyle = "#c6c7bf";
  for (let x = -85; x < PAGE_W; x += 256) ctx.fillText("Early bird tickets on sale now!", x, 29.5 / 0.8);
  ctx.restore();
}
function nav(ctx) {
  // (build pass: the source's nav words are ~15 % wider and bolder: "Agenda" spans 155-222)
  ctx.font = "600 16.5px Poppins"; ctx.fillStyle = "#d4d5cb";
  ctx.fillText("Agenda", 155, 117); ctx.fillText("Speakers", 255, 117); ctx.fillText("FAQ", 367, 117);
}
// Original script mark in the logo slot. Build pass (this run): the same original two-line "Wonder / Camp" mark as
// s08's close-up (copied from src/shots/s08/mark.js and its logoMark(): monoline connected script, dark keyline
// heavier below-right), placed through s08's measured close-up mapping (page = 0.41877 R(0.145 deg) F0 +
// (670.59, 106.50)), so the logo does not change across the 30.56 cut. Not the source's third-party wordmark.
const MARK = {
  slant: 0.22,
  w: 12.5,
  lines: [
    // "Wonder": baseline 51, x-height top ~8 (under the strip)
    { base: 51, strokes: [
      // W
      [166, -6, 174, 22, 184, 44, 192, 51, 199, 42, 205, 24, 209, 14, 214, 30, 221, 46, 229, 51, 237, 40, 242, 22, 246, 6, 251, 0],
      // o (+ its exit swing into the n)
      [276, 10, 262, 12, 254, 28, 256, 44, 266, 51, 278, 46, 284, 30, 281, 14, 272, 9, 280, 16, 292, 17, 302, 12],
      // n
      [304, 10, 303, 30, 302, 51],
      [303, 34, 309, 16, 318, 9, 327, 14, 330, 30, 331, 46, 337, 51, 346, 47],
      // d
      [366, 16, 354, 11, 344, 22, 342, 40, 350, 51, 361, 46, 368, 32],
      [378, -34, 373, 6, 369, 34, 370, 47, 377, 51, 386, 46],
      // e
      [386, 46, 398, 38, 404, 26, 399, 15, 389, 16, 383, 30, 385, 45, 395, 51, 407, 47, 414, 38],
      // r
      [414, 38, 419, 20, 423, 10, 430, 14, 434, 12, 436, 22, 432, 38, 434, 49, 440, 47],
    ] },
    // "Camp": baseline 130, x-height top ~88, the p's tall stem from ~66 and its descender to ~154
    { base: 130, strokes: [
      // C
      [271, 73, 266, 61, 252, 55, 232, 58, 210, 71, 194, 93, 188, 116, 195, 134, 213, 142, 236, 138, 252, 128, 262, 116],
      // a
      [262, 116, 274, 101, 288, 90],
      [290, 94, 280, 88, 268, 94, 262, 110, 265, 126, 275, 131, 286, 124, 292, 108],
      [294, 90, 291, 112, 293, 127, 300, 131, 307, 122, 312, 92],
      // m: three downstrokes
      [312, 92, 311, 112, 310, 131],
      [311, 108, 318, 93, 326, 88, 333, 95, 334, 112, 334, 131],
      [335, 108, 342, 93, 350, 88, 357, 95, 358, 112, 359, 126, 366, 131, 374, 125],
      // p
      [374, 125, 378, 104, 384, 80, 388, 68],
      [386, 72, 382, 96, 378, 124, 374, 154],
      [381, 104, 389, 91, 401, 88, 409, 97, 408, 114, 398, 128, 385, 131, 378, 124],
    ] },
  ],
  dot: [426, 112, 4.2],
};
function logo(ctx) {
  const { slant, lines, dot } = MARK, Pp = [];
  const w = MARK.w;   // (1.35x wider strokes measured worse: logo box 5.2 -> 6.2)
  for (const L of lines) for (const st of L.strokes) {
    const pts = [];
    for (let i = 0; i < st.length; i += 2) pts.push([st[i] + (L.base - st[i + 1]) * slant, st[i + 1]]);
    Pp.push(sampleCurve(pts, 6));
  }
  const trace = (dx, dy) => { ctx.beginPath(); for (const q of Pp) { ctx.moveTo(q[0][0] + dx, q[0][1] + dy); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0] + dx, q[i][1] + dy); } };
  const disc = (dx, dy, r) => { ctx.beginPath(); ctx.arc(dot[0] + dx, dot[1] + dy, r, 0, Math.PI * 2); ctx.fill(); };
  ctx.save();
  ctx.translate(670.59, 106.5); ctx.rotate((0.145 * Math.PI) / 180); ctx.scale(0.41877, 0.41877);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "#050605"; ctx.fillStyle = "#050605";
  ctx.lineWidth = w + 6; trace(1.6, 1.8); ctx.stroke();
  ctx.lineWidth = w + 4; trace(0, 0); ctx.stroke();
  disc(0.8, 0.9, dot[2] + 2.5);
  ctx.strokeStyle = "#ecebe4"; ctx.fillStyle = "#ecebe4";   // laptop view: the mark in this slot reads white
  ctx.lineWidth = w; trace(0, 0); ctx.stroke();
  ctx.globalAlpha = 0.55; disc(0, 0, dot[2]); ctx.globalAlpha = 1;
  ctx.restore();
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
  ctx.save(); ctx.translate(802, 831); ctx.rotate(-0.03);   // (build pass: centre re-measured on the source mean, +2, +3)
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
  [1452, 808, 8, "#eceee6"], [1100, 930, 9, "#eceee6"], [1045, 548, 14, "#f2f2ec"], [1030, 196, 11, "#8a86c2"],
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
    drawSelection(ctx, { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh, width: S.width });
  }
  if (card) {
    const C = PURE_CARD;
    drawNoteCard(ctx, { x: C.x, y: C.y, w: C.w, notch: true, ...card, theme: CARD_THEME });
  }
}
