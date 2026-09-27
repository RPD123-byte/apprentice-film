// "Pure Imagination": the retro event page on the laptop (24–30.5 s) and in the screen close-up (30.56–32.60).
// An original page that follows the composition, palette and feel of the page in the source film (dark ground,
// rainbow ribbons with ink separators, chunky cream wordmark, sparkles, clouds, a daisy) — no third-party marks:
// the top-left logo is an original two-line script mark.
//
// Everything is drawn in PAGE UNITS: the laptop screen rectified to 1600 x 1000 (16:10). Positions were measured
// on the source (rectified laptop frames for the full page, the close-up frames mapped back into page units for the
// region the close-up shows: x 670–1600, y 106–505, where the drawing follows the close-up closely).
//
//   drawPurePage(ctx, opts)            paint the page in page units under the current transform
//   purePageCanvas(w, h, opts)         cached canvas of the whole page at w x h (laptop screens)
//   purePageRegion(x0,y0,x1,y1,k,opts) cached canvas of a page region at k px per page unit (close-ups)
//   drawPureOverlay(ctx, state)        selection rectangle + note card in page units (see notecard.js)
//   pureStateAt(t)                     { page, overlay } for film time t on the laptop (24–30.56), measured timeline
// opts: { ticketText, ticketCaret } — ticketText replaces "Get your tickets" (typed left-aligned text, as the
//   source does in 29.1–30.5 s; "" = blank button), ticketCaret draws a caret after it. See docs/pureimg.md.
import { sampleCurve } from "./paths.js";
import { drawNoteCard, drawSelection } from "./notecard.js";

export const PAGE_W = 1600, PAGE_H = 1000;
// The red selection (drawn round "Pure Imagination") and the note card, in page units (measured).
export const PURE_SEL = { x0: 352, y0: 311.5, x1: 1247.5, y1: 682, width: 5 };
export const PURE_CARD = { x: 1278.2, y: 185.3, w: 193.9, h: 270.2 };

// Palette (pre-grade values: the film's finishing grade darkens and warms these a little).
export const PC = {
  bg: "#1c241b", line: "#2b1113", cream: "#cfd0c5", creamDim: "#c9cbc0", yellow: "#e6c65e", yellowDeep: "#e0b84e",
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
const LOW_B = [[-40, 760], [150, 810], [300, 858], [450, 870], [600, 851], [750, 828], [870, 800], [935, 815], [955, 850], [950, 862], [900, 905], [790, 975], [735, 1040]];
function lowerRibbon(ctx) {
  const T = P(LOW_T, 12), B = P(LOW_B, 12);
  const bounds = [0, 1, 2, 3, 4].map((k) => T.map((p, i) => [p[0] + (B[i][0] - p[0]) * (k / 4), p[1] + (B[i][1] - p[1]) * (k / 4)]));
  const sat = ["#4f42a6", "#c93c89", "#e0493a", "#efc04a"];
  const pas = ["#9384c6", "#eea6c8", "#eba080", "#f3e3bd"];
  bands(ctx, bounds, sat.map((c, i) => gradX(ctx, 560, 860, c, pas[i])), 3.2);
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
function burst(ctx) {
  ctx.lineJoin = "round";
  for (const f of FLAMES) petal(ctx, ...f);
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
function imagination(ctx) {
  // arched: baseline 665 at the ends, 640 in the middle (laptop view)
  ctx.font = "900 100px 'Fraunces Soft'";
  const word = "Imagination", track = -2;
  const ws = [...word].map((ch) => ctx.measureText(ch).width + track);
  const total = ws.reduce((a, b) => a + b, 0);
  const size = (100 * 845) / total;
  const k = size / 100;
  ctx.font = `900 ${size.toFixed(2)}px 'Fraunces Soft'`;
  const R = 3570, cx = 802, cy = 640 + R;
  let x = 380;
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
      ctx.rotate(ang * 1.0); ctx.scale(1, 0.8);
      ctx.textAlign = "center";
      if (pass === 0) { ctx.lineWidth = 5; ctx.strokeStyle = PC.line; ctx.lineJoin = "round"; ctx.strokeText(ch, 0, 0); }
      else { ctx.fillStyle = PC.cream; ctx.fillText(ch, 0, 0); }
      ctx.restore();
    }
  };
  paint(0); paint(1);
  ctx.textAlign = "left";
}

function wordmark(ctx) {
  burst(ctx);
  swoosh(ctx);
  const letters = [L_P, L_U, L_R, L_E].map((l) => outline(l, 8));
  for (const l of letters) fillOutline(ctx, l, null, 4.2);
  for (const l of letters) fillOutline(ctx, l, PC.cream);
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
  const x = 520, y = 200, r = 46;
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
function walkie(ctx) {
  ctx.save(); ctx.translate(300, 420); ctx.rotate(-0.42);
  ctx.fillStyle = "#c9c9c2"; ctx.fillRect(-6, -110, 12, 45); ctx.lineWidth = 2; ctx.strokeStyle = PC.line; ctx.strokeRect(-6, -110, 12, 45);
  ctx.beginPath(); ctx.roundRect(-34, -62, 68, 100, 12); ctx.fillStyle = "#d9679f"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = PC.line; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-22, -52, 44, 28, 5); ctx.fillStyle = "#e9e6de"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 4, 16, 0, 7); ctx.fillStyle = "#d69a3c"; ctx.fill(); ctx.stroke();
  ctx.restore();
}
function trumpetTree(ctx) {
  ctx.fillStyle = "#9ea0a2"; ctx.strokeStyle = PC.line; ctx.lineWidth = 2.5;
  for (const [x, y, r] of [[178, 528, 20], [200, 520, 18], [218, 534, 14], [160, 540, 12]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(182, 545); ctx.lineTo(190, 545); ctx.lineTo(196, 600); ctx.lineTo(214, 628); ctx.lineTo(160, 628); ctx.lineTo(178, 600); ctx.closePath();
  ctx.fillStyle = "#7f858c"; ctx.fill(); ctx.stroke();
}
function robot(ctx) {
  // puffs of white smoke trailing out of the bottom-left
  ctx.fillStyle = "#eeeeea";
  for (const [x, y, r] of [[70, 955, 34], [110, 985, 30], [150, 950, 26], [175, 915, 24], [200, 890, 20], [60, 1000, 30], [130, 920, 18], [218, 870, 16]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(235, 822); ctx.rotate(0.3);
  ctx.lineWidth = 3; ctx.strokeStyle = PC.line;
  for (const dx of [-8, 12]) { ctx.beginPath(); ctx.arc(dx, -62, 9, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); }
  ctx.beginPath(); ctx.roundRect(-45, -50, 90, 95, 10); ctx.fillStyle = "#ebe4d6"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-8, -5, 24, 0, 7); ctx.fillStyle = "#d8d2c6"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-8, -5, 12, 0, 7); ctx.fillStyle = "#e0a640"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(22, 5, 18, 22, 3); ctx.fillStyle = "#3a2a22"; ctx.fill();
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
  ctx.fillStyle = "#0d110d"; ctx.fillRect(0, 0, PAGE_W, 46);
  ctx.fillStyle = "#b9bab2"; ctx.fillRect(0, 45, PAGE_W, 2.2);
  ctx.font = "500 11.5px Poppins"; ctx.fillStyle = "#8f9089";
  for (let x = -130; x < PAGE_W; x += 256) ctx.fillText("Early bird tickets on sale now!", x, 28);
}
function nav(ctx) {
  ctx.font = "500 14.5px Poppins"; ctx.fillStyle = "#d4d5cb";
  ctx.fillText("Agenda", 152, 116); ctx.fillText("Speakers", 254, 116); ctx.fillText("FAQ", 365, 116);
}
// Original script mark in the logo slot (two lines, like a hand-lettered badge).
function logo(ctx) {
  ctx.save();
  ctx.translate(796, 142); ctx.rotate(-0.06);
  ctx.textAlign = "center"; ctx.fillStyle = PC.creamDim;
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
  [1452, 808, 8, "#eceee6"], [1100, 930, 9, "#eceee6"], [1040, 540, 11, "#eceee6"], [1030, 196, 11, "#8a86c2"], [1392, 492, 12, "#8a86c2"],
  [378, 240, 6, "#e0784a"], [1440, 256, 6, "#d86c4a"], [1580, 640, 6, "#e6e6de"],
];
const DOTS = [[180, 355, 3.2], [1190, 600, 3], [1370, 862, 2.4], [1540, 905, 3], [1255, 245, 2.2], [445, 598, 2.2], [980, 950, 2.4]];

// ---------------------------------------------------------------- the page
export function drawPurePage(ctx, opts = {}) {
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
  smileyBall(ctx);
  walkie(ctx);
  trumpetTree(ctx);
  wordmark(ctx);
  robot(ctx);
  pencil(ctx);
  heartApple(ctx);
  daisy(ctx, 1330, 822, 108);
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
const _cache = new Map();
const keyOf = (o) => JSON.stringify([o.ticketText ?? null, !!o.ticketCaret]);
export function purePageCanvas(w, h, opts = {}) {
  const key = `page|${w}|${h}|${keyOf(opts)}`;
  let c = _cache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.scale(w / PAGE_W, h / PAGE_H);
    drawPurePage(g, opts);
    _cache.set(key, c);
  }
  return c;
}
export function purePageRegion(x0, y0, x1, y1, k, opts = {}) {
  const key = `region|${x0}|${y0}|${x1}|${y1}|${k}|${keyOf(opts)}`;
  let c = _cache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.ceil((x1 - x0) * k); c.height = Math.ceil((y1 - y0) * k);
    const g = c.getContext("2d");
    g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    drawPurePage(g, opts);
    c.__x0 = x0; c.__y0 = y0; c.__k = k;
    _cache.set(key, c);
  }
  return c;
}
export function releasePure() { _cache.clear(); }

// Selection + note card on the page, in page units. state: { sel: 0..1 | false, card: false | { appear, text, caret, placeholder, smiley } }
// sel: pop-in progress of the selection (the source scales it up about its centre over 25.20–25.36 s).
// ---------------------------------------------------------------- the laptop-view timeline (film time 24–30.56)
// Measured on the rectified laptop screen, frame by frame:
//  - selection: pops in about its centre over 25.16–25.36 (scale 0.81 at 25.20, 0.89 at 25.24, 0.95 at 25.28);
//  - card: pops in over 25.44–25.72 about a point 45% across / 72% down the card
//    (scale 0.29 25.48, 0.40 25.52, 0.58 25.56, 0.75 25.60, 0.90 25.64, 0.98 25.68, 1 25.72);
//    its textarea shows two short grey placeholder lines; the smiley is grey until the laptop is off screen
//    (s06, 26.72–29.04) and yellow when it comes back;
//  - the "Get your tickets" button: blank at 29.04–29.12, then text is typed into it from its left edge (page x 679),
//    the right edge of the typed run measured per frame below (the source's text is unreadable; an original line
//    with the same growth is used).
const CARD_POP = [[25.44, 0], [25.48, 0.29], [25.52, 0.4], [25.56, 0.58], [25.6, 0.75], [25.64, 0.9], [25.68, 0.98], [25.72, 1]];
const TICKET_EDGE = [[29.16, 694], [29.24, 703], [29.28, 719], [29.36, 722], [29.4, 732], [29.44, 751], [29.56, 766], [29.64, 780], [29.72, 802], [29.84, 809],
  [29.92, 827], [30.04, 831], [30.08, 848], [30.2, 866], [30.24, 872], [30.28, 876], [30.36, 891], [30.44, 903], [30.52, 919]];
export const PURE_TICKET_TEXT = "Seen this, really good";
export const PURE_PLACEHOLDER = "Tell us what you\nthink...";
const tab = (T, t) => { if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * ((t - a) / (b - a)); } return T[T.length - 1][1]; };
let _meas = null;
function ticketPrefix(edge) {
  if (!_meas) { _meas = document.createElement("canvas").getContext("2d"); }
  _meas.font = "600 34px Poppins";
  let best = "";
  for (let n = 1; n <= PURE_TICKET_TEXT.length; n++) {
    const pre = PURE_TICKET_TEXT.slice(0, n);
    if (678 + _meas.measureText(pre).width + 5 <= edge + 4) best = pre; else break;
  }
  return best;
}
// State of the laptop page at film time t: { page: opts for purePageCanvas, overlay: state for drawPureOverlay }.
export function pureStateAt(t) {
  const sel = t < 25.16 ? 0 : Math.min(1, (t - 25.16) / 0.2);
  const appear = t < 25.44 ? 0 : tab(CARD_POP, t);
  const card = appear > 0 ? { appear, anchor: [0.45, 0.72], smiley: t < 27.9 ? 0 : 1, placeholder: PURE_PLACEHOLDER } : null;
  let page = {};
  if (t >= 29.04) {
    // typing: frames step (the table is per source frame); the caret shows throughout
    const f = Math.floor(t * 25 + 1e-6) / 25;
    page = f < 29.16 ? { ticketText: "", ticketCaret: false } : { ticketText: ticketPrefix(tab(TICKET_EDGE, f)), ticketCaret: true };
  }
  return { page, overlay: { sel, card } };
}

export function drawPureOverlay(ctx, state = {}) {
  const { sel = 1, card = null } = state;
  if (sel) {
    const S = PURE_SEL, u = Math.min(1, sel), s = 0.7 + 0.3 * (1 - Math.pow(1 - u, 2));
    const cx = (S.x0 + S.x1) / 2, cy = (S.y0 + S.y1) / 2, hw = ((S.x1 - S.x0) / 2) * s, hh = ((S.y1 - S.y0) / 2) * s;
    drawSelection(ctx, { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh, width: S.width });
  }
  if (card) {
    const C = PURE_CARD;
    drawNoteCard(ctx, { x: C.x, y: C.y, w: C.w, notch: true, ...card });
  }
}
