// The owl on the end card, in frame pixels (measured on the source at 138.0 s): a plump white owl in red headphones,
// a bandage on its crown, perched on the full stop with its left talons over the "t".
// Eye timeline (film time) read off the source every 0.04 s: open to 136.44, sleepy half-lids 136.48-136.60, slits
// 136.64-136.68, shut (curved lash lines) 136.72-136.92, half-open 136.96-137.00, opening 137.04-137.08, open from
// 137.12 with small worried brows. From 139.1 to 139.5 the head tilts ~3 deg to screen-left and the face turns smug:
// heavy lids, thick arched brows, a smirk, and the bandage is gone, leaving a faint tan mark.
import { clamp, smooth, span, rng } from "../../lib/rng.js";

const LINE = "#6e3a32", SOFT = "rgba(120,74,60,0.55)", CREAM = "#f6e5c6", CREAM_SH = "#c9baa9", BELLY = "#e9dcc0";
const RED = "#bf4231", RED_D = "#95302a", RED_L = "#d8573a", BAND = "#5a1c26", BEAK = "#ec8228", BEAK_D = "#b55a2c";
const TALON = "#e39458", LID = "#cfc3bd";

// lids: 0 open .. 1 shut
function lidsAt(u) {
  const k = [[0, 0], [0.44, 0], [0.5, 0.5], [0.6, 0.5], [0.66, 0.82], [0.7, 0.9], [0.72, 1], [0.92, 1], [0.96, 0.5], [1.0, 0.5], [1.06, 0.25], [1.12, 0], [9, 0]];
  for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const [a, va] = k[i - 1], [b, vb] = k[i]; return va + (vb - va) * smooth((u - a) / (b - a)); }
  return 0;
}

function path(g, pts, close = true) {
  const n = pts.length, P = (i) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  g.moveTo(pts[0][0], pts[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), s = 1 / 6;
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s, p1[1] + (p2[1] - p0[1]) * s, p2[0] - (p3[0] - p1[0]) * s, p2[1] - (p3[1] - p1[1]) * s, p2[0], p2[1]);
  }
  if (close) g.closePath();
}
function shape(g, pts, fill, lw = 0, stroke = LINE) {
  g.beginPath(); path(g, pts);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = "round"; g.stroke(); }
}
function line(g, pts, lw, col = LINE) {
  g.beginPath(); path(g, pts, false); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
}

// ---------- body (never moves) ----------
const BODY = [[1537, 300], [1529, 324], [1518, 340], [1513, 362], [1517, 385], [1528, 400], [1545, 410], [1566, 421], [1598, 426], [1628, 423], [1646, 410], [1656, 396], [1662, 374], [1655, 348], [1651, 318]];
const WING_L = [[1534, 334], [1520, 348], [1513, 366], [1516, 386], [1526, 402], [1536, 414], [1546, 418], [1548, 404], [1546, 384], [1543, 360]];
const WING_R = [[1650, 334], [1658, 350], [1662, 372], [1658, 392], [1648, 408], [1636, 418], [1633, 406], [1636, 384], [1639, 360], [1643, 344]];
function body(g) {
  shape(g, BODY, CREAM, 2.2);
  g.save();
  g.beginPath(); path(g, BODY); g.clip();
  // warm shade low on the belly
  const gr = g.createLinearGradient(0, 372, 0, 428);
  gr.addColorStop(0, "rgba(215,190,160,0)"); gr.addColorStop(1, "rgba(200,172,142,0.5)");
  g.fillStyle = gr; g.fillRect(1500, 372, 180, 60);
  // folded wings down each side: soft grey, lighter toward the chest, feathered at the tips
  for (const [W, sx] of [[WING_L, 1], [WING_R, -1]]) {
    g.save();
    g.beginPath(); path(g, W); g.clip();
    const x0 = sx > 0 ? 1512 : 1664, x1 = sx > 0 ? 1550 : 1630;
    const wg = g.createLinearGradient(x0, 0, x1, 0);
    wg.addColorStop(0, "#b8a89c"); wg.addColorStop(0.55, "#d3c5b6"); wg.addColorStop(1, "#e6dac6");
    g.fillStyle = wg; g.fillRect(1500, 320, 180, 110);
    g.restore();
    line(g, W.slice(6).concat([W[0]]), 1.4, SOFT);
    for (let k = 0; k < 3; k++) {
      const [x, y] = sx > 0 ? [1528 + k * 6, 400 + k * 5] : [1654 - k * 6, 398 + k * 6];
      line(g, [[x, y - 8], [x + sx * 1.5, y], [x + sx * 4, y + 3]], 1.1, "rgba(120,84,70,0.45)");
    }
  }
  g.restore();
  // chest fluff: a few short soft strokes
  for (const [x, y, a] of [[1562, 366, 0.3], [1576, 382, -0.2], [1592, 372, 0.1], [1608, 388, 0.25], [1622, 368, -0.3], [1572, 400, 0.1], [1600, 405, -0.1], [1622, 398, 0.2]]) {
    line(g, [[x - 4 * Math.cos(a), y - 4 * Math.sin(a) - 3], [x, y], [x + 3 * Math.cos(a), y + 3 * Math.sin(a) - 2]], 1.2, "rgba(150,110,90,0.4)");
  }
}

// ---------- talons ----------
function talons(g) {
  const toe = (x, y, a, len) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(-4.4, -2); g.quadraticCurveTo(-5.6, len * 0.62, 0, len); g.quadraticCurveTo(5.6, len * 0.62, 4.4, -2); g.closePath();
    g.fillStyle = TALON; g.fill(); g.lineWidth = 1.5; g.strokeStyle = LINE; g.stroke();
    g.beginPath(); g.moveTo(-1.5, len - 4); g.quadraticCurveTo(0, len + 3, 1.5, len - 4); g.fillStyle = "#f6ead8"; g.fill();
    g.restore();
  };
  // left foot hooked over the t's shoulder, right foot on the full stop
  toe(1533, 404, 0.7, 17); toe(1541, 408, 0.35, 19); toe(1551, 411, 0.0, 18);
  toe(1598, 426, 0.45, 16); toe(1607, 429, 0.12, 18); toe(1617, 429, -0.2, 17);
}

// ---------- head group (tilts when smug) ----------
const HEAD = [[1537, 300], [1538, 276], [1546, 261], [1562, 250], [1590, 245], [1616, 247], [1633, 255], [1645, 251], [1663, 243], [1656, 254], [1663, 257], [1652, 267], [1655, 286], [1654, 312], [1651, 330], [1620, 342], [1590, 344], [1560, 342], [1533, 330]];

function headphones(g, back) {
  if (back) {
    // band: dark outer rail, red inner rail, light slider segments down each side
    g.lineCap = "butt";
    g.beginPath(); g.ellipse(1596, 287, 82, 84, 0, Math.PI * 1.06, Math.PI * 1.94); g.lineWidth = 7; g.strokeStyle = BAND; g.stroke();
    g.beginPath(); g.ellipse(1596, 287, 80.5, 82.5, 0, Math.PI * 1.07, Math.PI * 1.93); g.lineWidth = 2.6; g.strokeStyle = "#a8413a"; g.stroke();
    g.fillStyle = "#e9cbb8";
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
      const a = Math.PI * 1.5 + s * (0.86 + k * 0.075);
      const x = 1596 + Math.cos(a) * 82, y = 287 + Math.sin(a) * 84;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.fillRect(-2.2, -1.3, 4.4, 2.6); g.restore();
    }
    return;
  }
  for (const [cx, cy, s] of [[1519, 301, -1], [1669, 309, 1]]) {
    g.save(); g.translate(cx, cy);
    // cup seen from the side: a rounded shell, darker on its outer rim, a lit face with two ridges
    g.beginPath(); g.ellipse(0, 0, 17, 38.5, 0, 0, Math.PI * 2);
    const gr = g.createLinearGradient(s * 17, 0, -s * 17, 0);
    gr.addColorStop(0, "#d0553a"); gr.addColorStop(0.35, "#c9442f"); gr.addColorStop(0.75, "#b63a2a"); gr.addColorStop(1, "#8e2c27");
    g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = LINE; g.stroke();
    g.strokeStyle = "rgba(95,28,24,0.7)"; g.lineWidth = 1.5;
    for (const dx of [2, 8]) { g.beginPath(); g.ellipse(s * dx - s * 2, 0, 9 - dx * 0.4, 34 - dx * 0.5, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke(); }
    g.beginPath(); g.ellipse(s * 11, -2, 2.5, 20, 0, 0, Math.PI * 2); g.fillStyle = "rgba(240,130,90,0.55)"; g.fill();
    g.restore();
  }
}

function eye(g, ex, ey, lids, smug) {
  const R = 15;
  // closed: grey lid with a curved lash line
  if (lids > 0.97) {
    g.beginPath(); g.arc(ex, ey, R, 0, Math.PI * 2); g.fillStyle = LID; g.fill();
    line(g, [[ex - 12, ey + 1], [ex - 5, ey + 5], [ex + 4, ey + 5], [ex + 12, ey]], 2.3);
    return;
  }
  g.save();
  g.beginPath(); g.arc(ex, ey, R, 0, Math.PI * 2); g.clip();
  const gr = g.createRadialGradient(ex, ey + 2, 2, ex, ey, R);
  gr.addColorStop(0, "#5a1a1c"); gr.addColorStop(0.55, "#7c2f22"); gr.addColorStop(0.8, "#b8582f"); gr.addColorStop(1, "#d98446");
  g.fillStyle = gr; g.fillRect(ex - R, ey - R, 2 * R, 2 * R);
  const gx = -3 * smug, gy = 2 * smug;
  g.beginPath(); g.arc(ex + 0.5 + gx, ey + 1 + gy, 8.8, 0, Math.PI * 2); g.fillStyle = "#2e1216"; g.fill();
  g.beginPath(); g.arc(ex - 4.8 + gx, ey - 5 + gy * 2.5, 4.2 - smug, 0, Math.PI * 2); g.fillStyle = "#fbf4ea"; g.fill();
  g.beginPath(); g.arc(ex + 5 + gx, ey + 6, 2, 0, Math.PI * 2); g.fill();
  // upper lid coming down: grey with a dark lid line (flatter and slanted when smug)
  const L = Math.max(lids, smug * 0.46);
  if (L > 0.01) {
    const yl = ey - R + L * 2 * R;
    const tilt = smug * 2.5 * (ex < 1592 ? 1 : -1);
    g.beginPath(); g.moveTo(ex - R - 2, ey - R - 2); g.lineTo(ex + R + 2, ey - R - 2);
    g.lineTo(ex + R + 2, yl - tilt); g.quadraticCurveTo(ex, yl + (1 - smug) * 4, ex - R - 2, yl + tilt); g.closePath();
    g.fillStyle = LID; g.fill();
    g.beginPath(); g.moveTo(ex - R, yl + tilt); g.quadraticCurveTo(ex, yl + (1 - smug) * 4, ex + R, yl - tilt);
    g.lineWidth = 2.6; g.strokeStyle = LINE; g.stroke();
  }
  g.restore();
  g.beginPath(); g.arc(ex, ey, R, 0, Math.PI * 2); g.lineWidth = 2.2; g.strokeStyle = LINE; g.stroke();
}

function face(g, lids, smug) {
  // heart-shaped facial disc: a ring round each eye, meeting in a V above the beak
  line(g, [[1596, 288], [1582, 276], [1560, 273], [1543, 283], [1535, 302], [1539, 322], [1552, 336], [1570, 341], [1584, 338]], 1.7, SOFT);
  line(g, [[1596, 288], [1611, 277], [1633, 277], [1649, 290], [1652, 311], [1645, 330], [1629, 342], [1610, 344], [1598, 340]], 1.7, SOFT);
  line(g, [[1596, 288], [1594, 300], [1592, 318]], 1.2, "rgba(120,70,55,0.3)");
  // grey lid shading above the eyes when smug
  if (smug > 0.01) {
    g.save(); g.globalAlpha = smug * 0.8;
    for (const [ex, ey] of [[1562, 304], [1618, 309]]) { g.beginPath(); g.ellipse(ex, ey - 12, 21, 12, 0, Math.PI, Math.PI * 2); g.fillStyle = "rgba(190,178,176,0.8)"; g.fill(); }
    g.restore();
  }
  eye(g, 1566, 304, lids, smug);
  eye(g, 1619, 309, lids, smug);
  // brows: small worried strokes, or thick arched smug brows
  if (smug < 0.99 && lids < 0.9) {
    g.save(); g.globalAlpha = 1 - smug;
    line(g, [[1559, 289], [1567, 287], [1575, 291]], 1.9);
    line(g, [[1611, 295], [1619, 291], [1628, 293]], 1.9);
    g.restore();
  }
  if (smug > 0.01) {
    g.save(); g.globalAlpha = smug;
    line(g, [[1541, 283], [1552, 277], [1566, 280], [1580, 291]], 4.2, "#4a1c1e");
    line(g, [[1588, 288], [1600, 277], [1614, 272], [1627, 272]], 4.2, "#4a1c1e");
    g.restore();
  }
  // beak (and the smirk lines at its corners when smug)
  shape(g, [[1581, 323], [1590, 320], [1599, 323], [1596, 334], [1590, 346], [1584, 334]], BEAK, 1.6);
  g.beginPath(); g.moveTo(1592, 322); g.lineTo(1598, 324); g.lineTo(1591, 344); g.closePath(); g.fillStyle = "rgba(180,90,44,0.45)"; g.fill();
  if (smug > 0.01) {
    g.save(); g.globalAlpha = smug;
    line(g, [[1560, 327], [1570, 331], [1580, 331]], 1.6);
    line(g, [[1600, 330], [1606, 328], [1611, 324]], 1.6);
    g.restore();
  }
}

function bandage(g, gone) {
  if (gone < 0.99) {
    g.save(); g.globalAlpha = 1 - gone;
    g.save(); g.translate(1573, 257);
    for (const rot of [-0.36, 0.42]) {
      g.save(); g.rotate(rot);
      g.beginPath(); g.roundRect(-22, -5, 44, 10, 5); g.fillStyle = "#f2c9a8"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#9a5a48"; g.stroke();
      g.restore();
    }
    g.beginPath(); g.roundRect(-6, -5, 12, 10, 2); g.fillStyle = "#e3a98a"; g.fill();
    g.fillStyle = "rgba(150,90,70,0.6)";
    for (const [x, y] of [[-3, -2], [0, -2], [3, -2], [-3, 1], [0, 1], [3, 1]]) g.fillRect(x - 0.5, y - 0.5, 1, 1);
    g.restore();
    g.restore();
  }
  if (gone > 0.01) {
    // the mark left behind: a faint blotchy tan patch
    g.save(); g.globalAlpha = gone * 0.55;
    const r = rng(77);
    g.fillStyle = "#c79a6c";
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(1553 + r() * 34, 250 + r() * 14, 4 + r() * 5, 3 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
}

function head(g, lids, smug) {
  headphones(g, true);
  // ear tuft (right) as two soft feathers
  // the head fills over the top of the body; only its top and sides are outlined, so it flows into the body
  shape(g, HEAD, CREAM);
  line(g, [[1533, 330], ...HEAD.slice(0, HEAD.length - 4)], 2.4);
  g.save(); g.beginPath(); path(g, HEAD); g.clip();
  const gr = g.createLinearGradient(1533, 0, 1655, 0);
  gr.addColorStop(0, "rgba(170,150,140,0.35)"); gr.addColorStop(0.18, "rgba(170,150,140,0)"); gr.addColorStop(0.85, "rgba(170,150,140,0)"); gr.addColorStop(1, "rgba(170,150,140,0.4)");
  g.fillStyle = gr; g.fillRect(1520, 240, 150, 110);
  g.restore();
  line(g, [[1638, 262], [1647, 256], [1655, 255]], 1.2, SOFT);
  face(g, lids, smug);
  bandage(g, smug);
  headphones(g, false);
}

export function drawOwl(g, t) {
  const u = t - 136;
  const lids = lidsAt(u);
  const smug = smooth(span(u, 3.12, 3.34));
  const tilt = smooth(span(u, 3.08, 3.5));
  g.save();
  body(g);
  talons(g);
  g.save();
  // head tilt about the neck, measured: band (-12.6,-3.8), right cup (-8.6,-7.7) by 139.5
  g.translate(1590 - 5.3 * tilt, 380 - 3.5 * tilt); g.rotate(-0.05 * tilt); g.translate(-1590, -380);
  head(g, lids, smug);
  g.restore();
  g.restore();
}
