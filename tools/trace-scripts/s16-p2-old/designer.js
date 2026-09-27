// s16 designer: the gaunt young designer in a beanie, drawn as a pen-and-ink portrait (lit paper, dark pen hatching)
// on the black plate. Every landmark is in frame px of the steady framing, measured on source frame 1175 (46.96 s)
// with zoomed grids (snapshots/s16-fix1-study/g*.jpg).
// paintDesigner(P) paints value + direction and the ink on P.o. drawEyes(g, F) paints the eyes every frame
// (his pupils move 46.16–46.32), then the lock of hair that crosses the left eye's inner corner on top.
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const PEN = "#111111";
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, y, cx, cy, rx, ry) => Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2));

// a swelling ink line through control points
function line(o, pts, w, color, per = 6, prof = 0.5) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), prof)), color);
}
// a line that starts full and tapers to a point
function strand(o, pts, w, color, per = 6, head = 0.12, pow = 0.8) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * Math.min(1, 0.35 + u / head) * Math.pow(1 - u, pow), color);
}
// a short pen stroke pointed at both ends
function tick(o, x0, y0, x1, y1, w, bend = 0) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  taper(o, [[x0, y0], [(x0 + mx) / 2, (y0 + my) / 2], [mx, my], [(mx + x1) / 2, (my + y1) / 2], [x1, y1]], (u) => w * Math.pow(Math.sin(Math.PI * u), 0.6), o.fillStyle);
}

// Pen hatching whose tone follows a density function: parallel lines at angle `ang` (radians, may be a function of
// x,y), spaced `gap`, broken into strokes of about `seg` px; a stroke is laid where dens(x,y) says so, its weight and
// opacity growing with the density. Limited-length strokes, never plate-wide rules.
export function hatchD(o, r, { box, clip, dens, ang = 0, gap = 3.2, seg = 14, w = 1, color = PEN, alpha = 0.75, bend = 0.04 }) {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + seg;
  const a0 = typeof ang === "function" ? ang(cx, cy) : ang;
  const ca = Math.cos(a0), sa = Math.sin(a0);
  o.save();
  if (clip) { o.beginPath(); clip(o); o.clip(); }
  o.fillStyle = color;
  for (let s = -R; s <= R; s += gap * (0.8 + 0.4 * r())) {
    const px = cx - sa * s, py = cy + ca * s;
    let t = -R + r() * seg;
    while (t < R) {
      const L = seg * (0.55 + 0.9 * r());
      const mx = px + ca * (t + L / 2), my = py + sa * (t + L / 2);
      if (mx > x0 - 4 && mx < x1 + 4 && my > y0 - 4 && my < y1 + 4) {
        const d = dens(mx, my);
        if (d > 0.02 && r() < Math.min(1, d * 1.6)) {
          const a = typeof ang === "function" ? ang(mx, my) + (r() - 0.5) * 0.08 : a0 + (r() - 0.5) * 0.08;
          const c2 = Math.cos(a), s2 = Math.sin(a), l = L * (0.6 + 0.4 * Math.min(1, d * 1.5));
          o.globalAlpha = alpha * Math.min(1, 0.35 + d * 0.8);
          tick(o, mx - c2 * l / 2, my - s2 * l / 2, mx + c2 * l / 2, my + s2 * l / 2, w * (0.55 + 0.7 * Math.min(1, d)), (r() - 0.5) * bend * 2);
        }
      }
      t += L + gap * (0.2 + 0.7 * r());
    }
  }
  o.globalAlpha = 1;
  o.restore();
}
// strokes laid along a family of curves between two edges (eye bags, cheek planes): `a` and `b` are polylines with
// the same number of points; n curves are interpolated between them, each broken into dashes
function contourHatch(o, r, a, b, n, { w = 0.9, alpha = 0.6, color = PEN, fade = (f) => 1, dash = 0.8 }) {
  o.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n, al = fade(f);
    if (al <= 0.02) continue;
    const pts = a.map((p, i) => [p[0] + (b[i][0] - p[0]) * f + (r() - 0.5) * 1.2, p[1] + (b[i][1] - p[1]) * f + (r() - 0.5) * 1.2]);
    const q = sampleCurve(pts, 6);
    let i = Math.floor(r() * 4);
    while (i < q.length - 2) {
      const len = 3 + Math.floor(r() * 8);
      const j = Math.min(q.length - 1, i + len);
      if (r() < dash) { o.globalAlpha = alpha * al * (0.6 + 0.4 * r()); taper(o, q.slice(i, j + 1), (u) => w * Math.pow(Math.sin(Math.PI * u), 0.5), color); }
      i = j + 1 + Math.floor(r() * 2);
    }
  }
  o.globalAlpha = 1;
}

// A lock of hair: a bundle of n tapering black strands along a spine (root -> tip). The strands start spread across
// w0 at the root and gather toward the tip, end at different lengths, and leave thin lit gaps between them; a few fine
// light glints run along the lock.
function lockB(o, seed, spine, w0, n, { gather = 0.35, color = "#060606", glint = 0.45, sw = 1.35, wave = 1.5, flare = 0 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(spine, 12), m = q.length;
  const N = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(m - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; });
  const offs = [];
  for (let k = 0; k < n; k++) offs.push(((n === 1 ? 0.5 : k / (n - 1)) - 0.5) * w0 + (r() - 0.5) * w0 / n * 0.6);
  for (let k = 0; k < n; k++) {
    const o0 = offs[k], o1 = o0 * gather + (r() - 0.5) * w0 * 0.25 + flare * (o0 / (w0 || 1)) * 20;
    const endF = 0.7 + 0.3 * r(), ph = r() * 6, amp = wave * (0.5 + r());
    const pts = [];
    for (let i = 0; i < m; i++) {
      const u = i / (m - 1);
      if (u > endF) break;
      const off = o0 + (o1 - o0) * Math.pow(u, 0.8) + Math.sin(u * 7 + ph) * amp * u;
      pts.push([q[i][0] + N[i][0] * off, q[i][1] + N[i][1] * off]);
    }
    if (pts.length < 3) continue;
    const ww = (w0 / n) * sw * (0.75 + 0.5 * r());
    taper(o, pts, (u) => ww * Math.min(1, 0.5 + u * 6) * Math.pow(1 - u, 0.9), color);
  }
  if (glint > 0) {
    const g = 1 + Math.floor(r() * 2.6);
    for (let k = 0; k < g; k++) {
      const off = (r() - 0.5) * w0 * 0.7, u0 = 0.05 + r() * 0.25, u1 = u0 + 0.25 + r() * 0.35;
      const pts = [];
      for (let i = Math.floor(u0 * (m - 1)); i <= Math.min(m - 1, Math.floor(u1 * (m - 1))); i++) {
        const u = i / (m - 1), of = off * (1 - u * 0.6);
        pts.push([q[i][0] + N[i][0] * of, q[i][1] + N[i][1] * of]);
      }
      if (pts.length > 2) { o.globalAlpha = glint * (0.5 + 0.5 * r()); taper(o, pts, (u) => (0.7 + r() * 0.6) * Math.sin(Math.PI * u), INK); o.globalAlpha = 1; }
    }
  }
}

// ---------------------------------------------------------------- measured outlines
export const FACE = [[1283, 188], [1280, 230], [1281, 270], [1286, 310], [1292, 345], [1302, 380], [1324, 412], [1352, 440], [1382, 461], [1415, 469], [1450, 461], [1480, 440], [1505, 410], [1525, 378], [1539, 342], [1547, 300], [1550, 250], [1549, 200], [1545, 150], [1500, 104], [1410, 98], [1320, 108], [1292, 140]];
const NECK = [[1356, 436], [1462, 436], [1458, 520], [1456, 600], [1411, 614], [1366, 600], [1362, 520]];
// beanie: rounded crown; the bottom edge of the cuff over the brow; the fold between crown and cuff
export const BEANIE = [[1190, 206], [1186, 150], [1190, 104], [1200, 66], [1220, 34], [1256, 10], [1310, -6], [1410, -14], [1510, -6], [1566, 10], [1600, 34], [1618, 66], [1626, 108], [1628, 160], [1622, 212], [1596, 202], [1560, 168], [1520, 124], [1470, 106], [1410, 102], [1350, 106], [1300, 124], [1255, 158], [1220, 196]];
const RIM = [[1190, 206], [1220, 196], [1255, 158], [1300, 124], [1350, 106], [1410, 102], [1470, 106], [1520, 124], [1560, 168], [1596, 202], [1622, 212]];
const FOLD = [[1194, 96], [1230, 64], [1270, 48], [1340, 38], [1410, 34], [1480, 38], [1545, 46], [1590, 66], [1620, 92]];
const HAIR_L = [[1192, 196], [1186, 250], [1184, 310], [1190, 362], [1204, 404], [1226, 436], [1256, 452], [1280, 440], [1292, 412], [1294, 380], [1286, 346], [1280, 304], [1277, 250], [1280, 196], [1250, 170]];
const HAIR_R = [[1622, 208], [1632, 262], [1632, 322], [1622, 372], [1604, 410], [1582, 432], [1558, 428], [1544, 400], [1540, 364], [1546, 330], [1551, 290], [1552, 240], [1550, 190], [1590, 190]];
// shirt: the lit body from the laptop up over both shoulders, down the right sleeve to the books and the hand
const SHIRT = [[1003, 650], [1014, 629], [1024, 596], [1036, 561], [1045, 540], [1057, 518], [1080, 490], [1107, 468], [1130, 455], [1161, 443], [1190, 428], [1226, 414], [1262, 412], [1330, 440], [1410, 470], [1490, 440], [1560, 410], [1578, 414], [1620, 436], [1659, 457], [1700, 474], [1730, 490], [1764, 524], [1783, 557], [1796, 584], [1807, 610], [1821, 657], [1850, 686], [1869, 705], [1872, 732], [1868, 756], [1733, 760], [1733, 802], [1696, 805], [1640, 806], [1600, 810], [1578, 822], [1578, 852], [1500, 852], [1442, 650]];
const TSHIRT = [[1250, 600], [1340, 598], [1367, 600], [1390, 609], [1411, 614], [1436, 608], [1456, 600], [1548, 597], [1552, 626], [1566, 740], [1581, 852], [1500, 852], [1442, 650], [1250, 652]];
const HAND = [[1578, 846], [1579, 824], [1592, 812], [1612, 806], [1646, 804], [1676, 803], [1694, 806], [1700, 818], [1698, 846]];

// ---------------------------------------------------------------- the whole figure
export function paintDesigner(P) {
  const r = rng(16061);
  paintShirt(P, r);
  paintNeck(P, r);
  paintHairBack(P, r);
  paintFace(P, r);
  paintBangs(P);
  paintBeanie(P, r);
  paintHeadphones(P, r);
}

// ---------------------------------------------------------------- shirt, t-shirt, hand
function paintShirt(P, r) {
  const o = P.o;
  P.fill(poly(SHIRT), 0.99, 1.4, { style: 2 });
  const S = poly(SHIRT);
  // ---- left shoulder (measured on snapshots/s16-fix1-study/shL3x.png): a band of dense near-vertical strokes
  // between the outer edge and the shoulder seam, clean white below the seam with a few long fold strokes
  const LO = [[1226, 414], [1190, 428], [1161, 443], [1130, 455], [1107, 468], [1080, 490], [1057, 518], [1045, 540], [1036, 561], [1024, 596], [1014, 629], [1003, 650]];
  const SEAM_L = [[1220, 450], [1200, 468], [1161, 489], [1107, 518], [1068, 543], [1058, 556]];
  const TOPL = poly([...LO.slice(0, 8), ...SEAM_L.slice().reverse()]);
  hatchD(o, r, { box: [1040, 410, 1230, 560], clip: TOPL, dens: () => 1, ang: 1.78, gap: 2.5, seg: 34, w: 1.3, alpha: 0.9 });
  hatchD(o, r, { box: [1040, 410, 1230, 560], clip: TOPL, dens: (x, y) => 0.6, ang: 2.3, gap: 3.2, seg: 16, w: 1, alpha: 0.7 });
  hatchD(o, r, { box: [1040, 410, 1230, 560], clip: TOPL, dens: (x, y) => 0.5 * sm(1150, 1060, x), ang: 1.2, gap: 3.4, seg: 18, w: 0.9, alpha: 0.6 });
  line(o, SEAM_L, 1.6, PEN, 6, 0.4);
  line(o, [[1056, 540], [1062, 570], [1072, 604], [1082, 632]], 1.4, "rgba(17,17,17,0.8)", 6, 0.4);
  // the outer-left edge of the sleeve: strokes along it
  edgeStrokes(o, r, LO.slice(6), 1, { len: [26, 64], step: 2.4, w: 1.25, alpha: 0.85, tilt: 1.2 });
  hatchD(o, r, { box: [1000, 530, 1070, 652], clip: S, dens: (x) => 0.9 * sm(1062, 1010, x), ang: 1.95, gap: 2.8, seg: 20, w: 1.1, alpha: 0.8 });
  // long thin fold strokes hanging from the seam
  for (let i = 0; i < 26; i++) {
    const u = r(), x = 1070 + u * 140, y = 520 - u * 50 + r() * 10, L = 30 + r() * 90, a = 1.7 + (r() - 0.5) * 0.2;
    o.globalAlpha = 0.35 + 0.4 * r(); o.fillStyle = PEN;
    taper(o, sampleCurve([[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a + 0.04) * L, y + Math.sin(a + 0.04) * L]], 5), (v) => 1.1 * (1 - v) * Math.min(1, 0.3 + v * 6), PEN);
  }
  o.globalAlpha = 1;
  // between the lapel and the cup: in shadow, dense vertical strokes
  const LAPL = poly([[1222, 418], [1250, 416], [1252, 560], [1248, 600], [1210, 600], [1213, 540], [1217, 480]]);
  hatchD(o, r, { box: [1205, 414, 1255, 604], clip: LAPL, dens: () => 1, ang: 1.62, gap: 2.4, seg: 30, w: 1.35, alpha: 0.9 });
  line(o, [[1222, 418], [1217, 480], [1213, 540], [1210, 600], [1207, 626]], 1.9, PEN, 6, 0.3);
  // left collar point, turned out by the cup
  const CL = [[1200, 630], [1210, 606], [1234, 594], [1252, 590], [1248, 612], [1226, 628]];
  P.fill(poly(CL), 0.98, 0.3, { style: 2 });
  hatchD(o, r, { box: [1205, 596, 1252, 630], clip: poly(CL), dens: (x, y) => 0.25 + 0.4 * sm(606, 628, y), ang: 0.3, gap: 3, seg: 10, w: 0.8 });
  line(o, [...CL, CL[0]], 1.8, PEN, 3, 0.2);
  line(o, LO, 2.2, PEN, 6, 0.3);

  // ---- right shoulder and sleeve (snapshots/s16-fix1-study/shR2x.png)
  const RO = [[1578, 414], [1620, 436], [1659, 457], [1700, 474], [1730, 490], [1764, 524], [1783, 557], [1796, 584], [1807, 610], [1821, 657], [1850, 686], [1869, 705], [1872, 732], [1868, 756]];
  const SEAM_R = [[1588, 443], [1640, 462], [1683, 476], [1720, 494], [1745, 514], [1759, 538], [1752, 576], [1745, 610], [1740, 624]];
  const TOPR = poly([...RO.slice(0, 7), ...SEAM_R.slice(0, 6).reverse()]);
  hatchD(o, r, { box: [1575, 410, 1790, 560], clip: TOPR, dens: () => 0.95, ang: 0.62, gap: 2.6, seg: 14, w: 1.1 });
  hatchD(o, r, { box: [1575, 410, 1790, 560], clip: TOPR, dens: () => 0.75, ang: -0.62, gap: 3.2, seg: 14, w: 0.9 });
  line(o, SEAM_R, 1.6, PEN, 6, 0.4);
  // strokes hanging below the top seam, thinning out downward
  hatchD(o, r, { box: [1590, 440, 1760, 560], clip: S, dens: (x, y) => 0.8 * sm(540, 460, y) * sm(1600, 1640, x), ang: 1.62, gap: 3.4, seg: 30, w: 1, alpha: 0.7 });
  // the chest: long loose fold strokes, and the shade down its right side toward the arm
  hatchD(o, r, { box: [1585, 470, 1750, 800], clip: S, dens: (x, y) => 0.45 + 0.4 * sm(1680, 1745, x) - 0.25 * gauss(x, y, 1650, 600, 40, 60), ang: 1.66, gap: 3.4, seg: 40, w: 1, alpha: 0.7 });
  hatchD(o, r, { box: [1585, 560, 1700, 800], clip: S, dens: (x, y) => 0.5 * gauss(x, y, 1600, 700, 18, 80), ang: 1.5, gap: 3, seg: 30, w: 1, alpha: 0.7 });
  // the sleeve beyond the armhole: cross-hatched, dense near the silhouette
  const SLV = poly([[1759, 538], [1764, 524], [1783, 557], [1796, 584], [1807, 610], [1821, 657], [1850, 686], [1869, 705], [1872, 732], [1868, 756], [1760, 758], [1712, 736], [1740, 624], [1745, 610], [1752, 576]]);
  hatchD(o, r, { box: [1700, 520, 1875, 760], clip: SLV, dens: (x, y) => 0.55 + 0.45 * sm(1760, 1800, x), ang: 0.7, gap: 2.7, seg: 14, w: 1.1 });
  hatchD(o, r, { box: [1700, 520, 1875, 760], clip: SLV, dens: (x, y) => 0.3 + 0.55 * sm(1770, 1810, x) * sm(560, 600, y), ang: -0.6, gap: 3.2, seg: 14, w: 0.9 });
  hatchD(o, r, { box: [1700, 600, 1875, 760], clip: S, dens: (x, y) => 0.85 * gauss(x, y, 1800, 700, 70, 40), ang: -0.45, gap: 3, seg: 28, w: 1.05 });
  // folds in the shirt front and the forearm: leaf-shaped cross-hatched folds pointing up from the wrist
  const folds = [
    [[1648, 800], [1626, 668], 9], [[1662, 798], [1668, 640], 8], [[1676, 796], [1704, 684], 8],
    [[1692, 790], [1768, 712], 8], [[1706, 794], [1810, 734], 8], [[1720, 798], [1818, 762], 6],
  ];
  folds.forEach(([B, T, w], i) => foldLeaf(o, r, B, T, w, S));
  line(o, [[1598, 660], [1606, 720], [1614, 790]], 1.1, "rgba(17,17,17,0.55)", 6);
  line(o, [[1745, 624], [1714, 690], [1700, 740]], 1.3, "rgba(17,17,17,0.7)", 6);
  line(o, RO, 2.2, PEN, 6, 0.3);
  line(o, [[1868, 756], [1800, 758], [1733, 760]], 2, PEN, 4, 0.2);
  // right lapel edge and collar point, open over the t-shirt
  line(o, [[1578, 416], [1566, 480], [1560, 540], [1564, 580], [1572, 598]], 1.8, PEN, 6, 0.3);
  hatchD(o, r, { box: [1556, 420, 1600, 600], clip: S, dens: (x, y) => 0.75 * sm(1590, 1562, x), ang: 1.6, gap: 3, seg: 26, w: 1, alpha: 0.8 });
  const CR = [[1546, 597], [1574, 596], [1596, 614], [1614, 646], [1590, 642], [1564, 628], [1550, 614]];
  P.fill(poly(CR), 0.94, 0.9, { style: 2 });
  hatchD(o, r, { box: [1545, 594, 1616, 648], clip: poly(CR), dens: (x, y) => 0.3 + 0.5 * sm(608, 640, y), ang: 0.85, gap: 3, seg: 12, w: 0.8 });
  line(o, [...CR, CR[0]], 1.9, PEN, 3, 0.2);

  // ---- t-shirt: dark crew neck under the open shirt; the knit is a fine cross-hatch cut into the black, darkest
  // under the chin, lighter down the strip right of the laptop
  P.fill(poly(TSHIRT), linear(0, 600, 0, 850, [[0, 0.1], [0.2, 0.2], [0.45, 0.52], [1, 0.66]]), 0.78, { spacing: 0.32, style: 1 });
  line(o, [[1552, 626], [1558, 690], [1566, 740], [1574, 800], [1581, 852]], 2.4, PEN, 6, 0.3);
  line(o, [[1340, 598], [1367, 601], [1390, 610], [1411, 615], [1436, 609], [1460, 600]], 2.8, "#050505", 6, 0.3);

  // ---- the hand on the desk in front of the books (a loose fist, knuckles up)
  P.fill(blob(HAND), 0.8, 0.05, { style: 2 });
  line(o, [[1579, 846], [1579, 824], [1592, 812], [1612, 806], [1646, 804], [1676, 803], [1694, 806], [1700, 818], [1698, 846]], 2, PEN, 5, 0.3);
  for (const k of [[[1604, 812], [1607, 826], [1605, 842]], [[1630, 808], [1633, 824], [1631, 840]], [[1656, 806], [1659, 822], [1658, 838]]]) line(o, k, 1.1, "rgba(17,17,17,0.6)", 4);
  hatchD(o, r, { box: [1578, 800, 1700, 846], clip: blob(HAND), dens: (x, y) => 0.25 + 0.4 * sm(826, 846, y), ang: 0.3, gap: 3, seg: 10, w: 0.8 });
}
// a fold: a narrow leaf from base B to tip T, cross-hatched, with a dark edge on one side
function foldLeaf(o, r, B, T, w, clip) {
  const d = [T[0] - B[0], T[1] - B[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, h = w * 1.5 * Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - t * 0.2); pts.push([B[0] + d[0] * t + n[0] * h, B[1] + d[1] * t + n[1] * h]); }
  for (let i = 10; i >= 0; i--) { const t = i / 10, h = w * 0.4 * Math.sin(Math.PI * Math.pow(t, 0.7)); pts.push([B[0] + d[0] * t - n[0] * h, B[1] + d[1] * t - n[1] * h]); }
  const a = Math.atan2(d[1], d[0]);
  const box = [Math.min(B[0], T[0]) - w * 1.5, Math.min(B[1], T[1]) - w * 1.5, Math.max(B[0], T[0]) + w * 1.5, Math.max(B[1], T[1]) + w * 1.5];
  o.save(); o.beginPath(); clip(o); o.clip();
  hatchD(o, r, { box, clip: blob(pts), dens: (x, y) => 0.9 * (0.35 + 0.65 * Math.min(1, Math.hypot(x - T[0], y - T[1]) / L)), ang: a + 0.12, gap: 2.6, seg: 18, w: 1, alpha: 0.8 });
  hatchD(o, r, { box, clip: blob(pts), dens: () => 0.4, ang: a - 0.7, gap: 3, seg: 8, w: 0.8, alpha: 0.55 });
  o.restore();
  line(o, pts.slice(0, 11), 1.1, "rgba(17,17,17,0.55)", 3, 0.4);
}
// strokes laid in from an outline: side +1/-1 picks the inward normal; tilt rotates them toward the outline's end
function edgeStrokes(o, r, pts, side, { len = [16, 40], step = 3, w = 1, alpha = 0.7, tilt = 0 }) {
  const q = sampleCurve(pts, 10);
  o.fillStyle = PEN;
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc < step) continue;
    acc = 0;
    const a = q[Math.max(0, i - 2)], b = q[Math.min(q.length - 1, i + 2)];
    const ta = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const na = ta + side * Math.PI / 2 + tilt + (r() - 0.5) * 0.2;
    const L = len[0] + (len[1] - len[0]) * r();
    o.globalAlpha = alpha * (0.6 + 0.4 * r());
    const x0 = q[i][0] - Math.cos(na) * 1, y0 = q[i][1] - Math.sin(na) * 1;
    taper(o, [[x0, y0], [x0 + Math.cos(na) * L * 0.5, y0 + Math.sin(na) * L * 0.5], [x0 + Math.cos(na + 0.05) * L, y0 + Math.sin(na + 0.05) * L]], (u) => w * Math.min(1, 0.4 + u * 4) * Math.pow(1 - u, 0.9), PEN);
  }
  o.globalAlpha = 1;
}
// a fan of long tapered fold strokes from a base point
function fanStrokes(o, r, [x, y], a0, a1, n, [l0, l1], w, alpha) {
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (k / (n - 1)) + (r() - 0.5) * 0.06, L = l0 + (l1 - l0) * r();
    const b = (r() - 0.5) * 0.25, sx = x + (r() - 0.5) * 16, sy = y - r() * 8;
    o.globalAlpha = alpha * (0.55 + 0.45 * r());
    taper(o, sampleCurve([[sx, sy], [sx + Math.cos(a + b) * L * 0.5, sy + Math.sin(a + b) * L * 0.5], [sx + Math.cos(a) * L, sy + Math.sin(a) * L]], 6), (u) => w * (1.2 - u) * Math.min(1, 0.3 + u * 5), PEN);
  }
  o.globalAlpha = 1;
}

// ---------------------------------------------------------------- neck
function paintNeck(P, r) {
  const o = P.o;
  P.fill(poly(NECK), 0.96, 1.57, { style: 2 });
  const N = poly(NECK);
  // the chin's shadow on the neck: cross-hatched, dense under the jaw
  const shade = (x, y) => 0.6 * sm(500, 466, y) * sm(1352, 1372, x) * sm(1466, 1446, x);
  hatchD(o, r, { box: [1356, 440, 1462, 520], clip: N, dens: shade, ang: 0.45, gap: 2.8, seg: 12, w: 1 });
  hatchD(o, r, { box: [1356, 440, 1462, 520], clip: N, dens: (x, y) => shade(x, y) * 0.5, ang: -0.55, gap: 3.2, seg: 12, w: 0.85 });
  // the sides of the neck, in the shadow of the cups
  hatchD(o, r, { box: [1356, 470, 1462, 612], clip: N, dens: (x, y) => 0.7 * (sm(1392, 1364, x) + sm(1430, 1458, x)), ang: 1.62, gap: 3, seg: 18, w: 0.9 });
  // stubble running down under the chin
  o.fillStyle = PEN;
  for (let i = 0; i < 260; i++) {
    const x = 1368 + r() * 86, y = 470 + Math.pow(r(), 1.6) * 60;
    o.globalAlpha = 0.25 + 0.35 * r(); const a = 1.57 + (r() - 0.5) * 0.9, l = 1.5 + r() * 2.2;
    tick(o, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.9);
  }
  o.globalAlpha = 1;
}

// ---------------------------------------------------------------- hair behind the face (the side masses) and ears
function paintHairBack(P, r) {
  const o = P.o;
  P.fill(blob(HAIR_L), 0.05, 1.5, { style: 2 });
  P.fill(blob(HAIR_R), 0.04, 1.7, { style: 2 });
  // ears (drawn before the locks that fall over them)
  const EARL = [[1236, 268], [1252, 262], [1268, 272], [1272, 292], [1264, 308], [1246, 306], [1236, 290]];
  const EARR = [[1552, 270], [1568, 264], [1584, 272], [1586, 290], [1578, 306], [1560, 306]];
  P.fill(blob(EARL), 0.42, 1.57, { style: 2 });
  P.fill(blob(EARR), 0.5, 1.57, { style: 2 });
  line(o, [[1240, 272], [1254, 264], [1268, 274], [1272, 292], [1264, 308]], 1.8, PEN, 5);
  line(o, [[1250, 274], [1260, 278], [1263, 290], [1257, 300], [1250, 298]], 1.6, "rgba(17,17,17,0.85)", 4);
  hatchD(o, r, { box: [1234, 260, 1274, 310], clip: blob(EARL), dens: (x) => 0.6 * sm(1262, 1238, x), ang: 1.2, gap: 2.6, seg: 10, w: 0.9 });
  line(o, [[1582, 274], [1586, 290], [1578, 306]], 1.8, PEN, 5);
  line(o, [[1566, 276], [1576, 284], [1576, 296], [1568, 300]], 1.5, "rgba(17,17,17,0.85)", 4);
  hatchD(o, r, { box: [1550, 262, 1588, 308], clip: blob(EARR), dens: (x) => 0.6 * sm(1566, 1586, x), ang: -1.2, gap: 2.6, seg: 10, w: 0.9 });
  // left mass: locks falling from under the cuff, flaring out to points at the left and over the shoulder
  const LL = [
    [[[1196, 200], [1188, 250], [1184, 305], [1188, 350], [1200, 392]], 22, 6, -1],
    [[[1212, 198], [1204, 254], [1202, 312], [1208, 366], [1224, 416], [1240, 444]], 24, 6, -1],
    [[[1232, 190], [1226, 240], [1228, 262]], 20, 5, 0],
    [[[1232, 300], [1224, 350], [1232, 400], [1252, 446]], 26, 6, 0],
    [[[1256, 178], [1250, 222], [1244, 262], [1238, 280]], 22, 5, 0],
    [[[1272, 300], [1268, 344], [1274, 390], [1286, 430]], 22, 5, 1],
    [[[1276, 190], [1273, 240], [1275, 290], [1282, 330], [1290, 370]], 14, 4, 1],
    [[[1204, 250], [1190, 290], [1180, 330], [1178, 356]], 10, 3, -1],
    [[[1220, 320], [1204, 354], [1192, 384], [1188, 404]], 12, 3, -1],
  ];
  LL.forEach(([s, w, n, fl], i) => lockB(o, 500 + i, s, w, n, { gather: 0.4, glint: 0.8, flare: fl * 0.2, color: "#030303" }));
  // right mass
  const RR = [
    [[[1616, 206], [1626, 260], [1628, 318], [1620, 370], [1604, 412]], 22, 6, 1],
    [[[1598, 198], [1606, 254], [1608, 316], [1600, 370], [1584, 420]], 24, 6, 1],
    [[[1578, 190], [1586, 240], [1584, 262]], 18, 5, 0],
    [[[1590, 300], [1596, 348], [1588, 396], [1570, 430]], 24, 6, 0],
    [[[1560, 186], [1566, 230], [1570, 262]], 16, 4, 0],
    [[[1556, 300], [1556, 340], [1551, 380], [1544, 404]], 16, 4, -1],
    [[[1624, 250], [1636, 290], [1640, 330], [1636, 350]], 10, 3, 1],
    [[[1612, 330], [1624, 362], [1630, 392], [1628, 412]], 12, 3, 1],
  ];
  RR.forEach(([s, w, n, fl], i) => lockB(o, 600 + i, s, w, n, { gather: 0.4, glint: 0.7, flare: fl * 0.2, color: "#030303" }));
  // fine glossy strands over both masses
  o.fillStyle = INK;
  for (let i = 0; i < 150; i++) {
    const left = i % 5 < 3, x0 = left ? 1190 + r() * 90 : 1548 + r() * 80, y0 = 200 + r() * 190;
    const out = left ? -1 : 1, L = 30 + r() * 70, bow = (r() - 0.3) * 10;
    o.globalAlpha = (left ? 0.45 : 0.25) + 0.45 * r();
    taper(o, sampleCurve([[x0, y0], [x0 + out * (3 + bow * 0.5), y0 + L * 0.4], [x0 + out * (6 + bow), y0 + L * 0.75], [x0 + out * (8 + r() * 12), y0 + L]], 6), (u) => (0.6 + r() * 0.7) * Math.sin(Math.PI * u), INK);
  }
  o.globalAlpha = 1;
}

// ---------------------------------------------------------------- face
function paintFace(P, r) {
  const o = P.o;
  const F = blob(FACE);
  P.fill(F, 0.975, 1.57, { style: 2 });
  // a faint value underlay only where the source's pencil tone is (sides of the face, the eye bags); the visible
  // shading is the pen hatching below
  P.light(F, (g) => { const q = g.createLinearGradient(1280, 0, 1552, 0); q.addColorStop(0, grey(0.88)); q.addColorStop(0.1, grey(0.99)); q.addColorStop(0.3, grey(1)); q.addColorStop(0.8, grey(0.99)); q.addColorStop(0.94, grey(0.9)); q.addColorStop(1, grey(0.82)); return q; });
  // ---- shading, all pen hatching
  // temples and the sides of the face next to the hair
  hatchD(o, r, { box: [1280, 180, 1310, 400], clip: F, dens: (x, y) => 0.8 * sm(1304, 1283, x) * sm(180, 215, y), ang: -1.05, gap: 2.8, seg: 12, w: 0.9, alpha: 0.7 });
  hatchD(o, r, { box: [1500, 180, 1552, 410], clip: F, dens: (x, y) => 0.45 * sm(1530, 1552, x) * sm(170, 205, y), ang: -1.2, gap: 2.8, seg: 14, w: 0.8, alpha: 0.6 });
  hatchD(o, r, { box: [1520, 200, 1552, 400], clip: F, dens: (x) => 0.35 * sm(1540, 1552, x), ang: 0.45, gap: 3.2, seg: 10, w: 0.8, alpha: 0.55 });
  // cheek hollows below the cheekbones (strokes along the cheek plane, about -60 degrees)
  hatchD(o, r, { box: [1290, 270, 1360, 400], clip: F, dens: (x, y) => 0.1 * gauss(x, y, 1300, 345, 12, 36), ang: -1.05, gap: 3.2, seg: 13, w: 0.85, alpha: 0.6 });
  hatchD(o, r, { box: [1480, 260, 1545, 400], clip: F, dens: (x, y) => 0.2 * gauss(x, y, 1524, 322, 14, 36), ang: -1.1, gap: 3.2, seg: 13, w: 0.85, alpha: 0.6 });
  // under the brows, above the lid crease
  hatchD(o, r, { box: [1284, 176, 1366, 204], clip: F, dens: (x, y) => 0.45 * gauss(x, y, 1330, 192, 36, 8), ang: 0.15, gap: 2.8, seg: 10, w: 0.8, alpha: 0.5 });
  hatchD(o, r, { box: [1446, 174, 1544, 204], clip: F, dens: (x, y) => 0.5 * gauss(x, y, 1500, 190, 42, 8), ang: -0.1, gap: 2.8, seg: 10, w: 0.8, alpha: 0.5 });
  // inner eye corners into the nose bridge
  hatchD(o, r, { box: [1350, 190, 1462, 250], clip: F, dens: (x, y) => 0.5 * (gauss(x, y, 1365, 215, 10, 16) + gauss(x, y, 1446, 212, 10, 16)), ang: 1.3, gap: 2.8, seg: 10, w: 0.8, alpha: 0.55 });
  // eye bags: strokes following the lower lid, darkest at the inner lower part, then short cross strokes
  const bag = (x0, xm, x1, yTop0, yTopM, yTop1, sag, inner) => {
    const a = [[x0, yTop0], [(x0 + xm) / 2, (yTop0 + yTopM) / 2 + 2], [xm, yTopM], [(xm + x1) / 2, (yTopM + yTop1) / 2 + 1], [x1, yTop1]];
    const b = a.map(([x, y], i) => [x + (i - 2) * 1.5, y + sag * Math.sin(Math.PI * (i / 4)) + 3]);
    contourHatch(o, r, a, b, 12, { w: 1.1, alpha: 0.85, fade: (f) => 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, f * 1.15)), dash: 0.95 });
    hatchD(o, r, { box: [Math.min(x0, x1), yTopM, Math.max(x0, x1), yTopM + sag + 6], clip: blob([...a, ...b.slice().reverse()]), dens: (x, y) => 0.85 * gauss(x, y, inner, yTopM + sag * 0.45, 30, sag * 0.6), ang: -1.05, gap: 2.6, seg: 8, w: 0.9, alpha: 0.7 });
    hatchD(o, r, { box: [Math.min(x0, x1), yTopM, Math.max(x0, x1), yTopM + sag + 6], clip: blob([...a, ...b.slice().reverse()]), dens: (x, y) => 0.6 * gauss(x, y, inner, yTopM + sag * 0.4, 26, sag * 0.5), ang: 0.3, gap: 2.8, seg: 8, w: 0.85, alpha: 0.6 });
  };
  bag(1284, 1318, 1360, 214, 231, 224, 20, 1335);
  bag(1452, 1492, 1538, 222, 229, 216, 24, 1478);
  // the line along the bottom of each bag
  line(o, [[1290, 236], [1310, 248], [1336, 250], [1356, 240]], 1.1, "rgba(17,17,17,0.55)", 6);
  line(o, [[1456, 240], [1478, 254], [1508, 254], [1530, 240]], 1.2, "rgba(17,17,17,0.6)", 6);
  // the upper lids' skin between the lash line and the crease: hatched grey, darkest at the corners
  hatchD(o, r, { box: [1280, 186, 1364, 210], clip: blob([[1282, 210], [1296, 195], [1320, 189], [1344, 191], [1362, 202], [1350, 206], [1318, 203], [1294, 209]]), dens: (x) => 0.55 + 0.35 * (sm(1310, 1284, x) + sm(1340, 1362, x)), ang: -0.1, gap: 2.4, seg: 9, w: 0.9, alpha: 0.7 });
  hatchD(o, r, { box: [1448, 184, 1542, 208], clip: blob([[1450, 206], [1470, 192], [1500, 187], [1524, 190], [1542, 204], [1526, 204], [1498, 201], [1468, 204]]), dens: (x) => 0.55 + 0.35 * (sm(1480, 1452, x) + sm(1510, 1540, x)), ang: 0.1, gap: 2.4, seg: 9, w: 0.9, alpha: 0.7 });
  // lid creases (the eyes themselves are drawn per frame)
  line(o, [[1282, 206], [1296, 195], [1320, 189], [1344, 191], [1360, 200]], 1.3, "rgba(17,17,17,0.75)", 6);
  line(o, [[1452, 202], [1470, 192], [1500, 187], [1524, 190], [1540, 200]], 1.3, "rgba(17,17,17,0.75)", 6);
  // brows: heavy, drawn as a band of short hair strokes, thickest at the inner ends
  brow(o, r, [[1298, 174], [1318, 167], [1338, 166], [1358, 171]], 1, 11);
  brow(o, r, [[1514, 172], [1490, 165], [1466, 166], [1442, 174]], 1, 12);
  // ---- nose: the bridge's shadowed left side, the ball, the nostril wings and the shadow under them
  hatchD(o, r, { box: [1368, 240, 1392, 320], clip: F, dens: (x, y) => 0.75 * gauss(x, y, 1382, 292, 7, 34), ang: 1.5, gap: 2.3, seg: 12, w: 0.85, alpha: 0.6 });
  hatchD(o, r, { box: [1428, 260, 1452, 320], clip: F, dens: (x, y) => 0.35 * gauss(x, y, 1440, 296, 6, 20), ang: 1.2, gap: 2.6, seg: 10, w: 0.8, alpha: 0.5 });
  hatchD(o, r, { box: [1366, 230, 1396, 330], clip: F, dens: (x, y) => 0.6 * gauss(x, y, 1379, 300, 8, 26) + 0.35 * gauss(x, y, 1384, 250, 6, 20), ang: 1.45, gap: 2.2, seg: 12, w: 0.85, alpha: 0.65 });
  line(o, [[1384, 236], [1382, 262], [1379, 290], [1376, 312]], 1.2, "rgba(17,17,17,0.5)", 6);
  line(o, [[1388, 300], [1383, 310], [1382, 322]], 1.2, "rgba(17,17,17,0.45)", 4);
  line(o, [[1438, 298], [1444, 308], [1445, 320]], 1.1, "rgba(17,17,17,0.4)", 4);
  line(o, [[1432, 282], [1440, 294], [1447, 308]], 1.1, "rgba(17,17,17,0.45)", 5);
  line(o, [[1375, 312], [1375, 324], [1380, 331], [1390, 333]], 1.5, "rgba(17,17,17,0.8)", 5);
  line(o, [[1447, 308], [1451, 320], [1447, 330], [1438, 333]], 1.4, "rgba(17,17,17,0.75)", 5);
  line(o, [[1390, 333], [1400, 338], [1417, 341], [1430, 338], [1438, 333]], 1.8, "rgba(17,17,17,0.85)", 5, 0.35);
  o.fillStyle = "rgba(20,20,20,0.75)";
  for (const [x, y, rx] of [[1396, 335, 4.5], [1432, 334.5, 4]]) { o.beginPath(); o.ellipse(x, y, rx, 1.6, 0.1, 0, 7); o.fill(); }
  hatchD(o, r, { box: [1360, 222, 1400, 336], clip: F, dens: (x, y) => 0.45 * gauss(x, y, 1376, 280, 9, 50), ang: 1.5, gap: 2.4, seg: 14, w: 0.8, alpha: 0.5 });
  hatchD(o, r, { box: [1386, 338, 1446, 356], clip: F, dens: (x, y) => 0.45 * gauss(x, y, 1416, 346, 22, 6), ang: 0.2, gap: 2.6, seg: 8, w: 0.8, alpha: 0.5 });
  // philtrum and the upper lip
  line(o, [[1405, 350], [1404, 362], [1404, 372]], 0.9, "rgba(17,17,17,0.3)", 4);
  line(o, [[1426, 350], [1427, 362], [1427, 372]], 0.9, "rgba(17,17,17,0.3)", 4);
  line(o, [[1400, 376], [1414, 373], [1430, 376]], 1.1, "rgba(17,17,17,0.45)", 4);
  // mouth: flat, the corners a little down; the lower lip a short line with its shadow under it
  line(o, [[1360, 392], [1382, 388], [1400, 387], [1415, 389], [1430, 387], [1452, 387], [1473, 392]], 2.6, PEN, 6, 0.35);
  line(o, [[1383, 408], [1410, 411], [1440, 408]], 1.7, "rgba(17,17,17,0.8)", 5);
  hatchD(o, r, { box: [1380, 410, 1446, 428], clip: F, dens: (x, y) => 0.4 * gauss(x, y, 1412, 418, 24, 5), ang: 0.1, gap: 2.4, seg: 8, w: 0.8, alpha: 0.5 });
  // stubble: short dark hairs, dense along the jaw and on the chin, sparse on the upper lip
  o.save(); o.beginPath(); F(o); o.clip();
  o.fillStyle = PEN;
  for (let i = 0; i < 2600; i++) {
    const x = 1284 + r() * 266, y = 340 + r() * 130;
    const jaw = Math.min(Math.abs(x - (1292 + (y - 340) * 0.72)), Math.abs(x - (1540 - (y - 340) * 0.62)));
    let d = 0.32 * Math.exp(-jaw / 14) + (y > 414 ? 0.16 : 0) + (y > 360 && y < 384 && x > 1370 && x < 1460 ? 0.1 : 0);
    if (y < 360) d *= sm(340, 360, y);
    if (r() > d) continue;
    const a = 1.57 + (x - 1415) * 0.004 + (r() - 0.5) * 0.7, l = 1.6 + r() * 2.6;
    o.globalAlpha = 0.25 + 0.4 * r();
    tick(o, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.9);
  }
  o.globalAlpha = 1; o.restore();
  // jaw and chin contour (fine)
  line(o, [[1318, 404], [1340, 428], [1360, 446], [1382, 461], [1415, 469], [1450, 461], [1472, 446], [1492, 426], [1510, 402]], 1.3, "rgba(17,17,17,0.6)", 6);
  // sweat drops: small outlined teardrops
  for (const [x, y, s] of [[1350, 134, 1], [1455, 134, 1.1], [1467, 116, 0.8], [1443, 260, 1.2], [1308, 309, 1.2], [1515, 306, 1], [1507, 356, 1]]) {
    o.strokeStyle = "rgba(30,30,30,0.85)"; o.lineWidth = 1.3;
    o.beginPath(); o.moveTo(x, y - 7 * s); o.quadraticCurveTo(x + 4.5 * s, y + 1 * s, x, y + 4 * s); o.quadraticCurveTo(x - 4.5 * s, y + 1 * s, x, y - 7 * s); o.stroke();
    o.fillStyle = "rgba(30,30,30,0.5)"; o.beginPath(); o.arc(x + 1.2 * s, y + 1.5 * s, 1.3 * s, 0, 7); o.fill();
  }
}
// an eyebrow: a dark band of short slanted hairs along pts (inner end last), heavier toward the inner end
function brow(o, r, pts, _s, w) {
  const q = sampleCurve(pts, 10);
  o.fillStyle = "#0a0a0a";
  for (let i = 0; i < q.length; i++) {
    const u = i / (q.length - 1), hw = w * (0.35 + 0.65 * u);
    for (let k = 0; k < 3; k++) {
      const x = q[i][0] + (r() - 0.5) * 2, y = q[i][1] + (r() - 0.5) * hw;
      const a = Math.atan2(q[Math.min(q.length - 1, i + 1)][1] - q[Math.max(0, i - 1)][1], q[Math.min(q.length - 1, i + 1)][0] - q[Math.max(0, i - 1)][0]) + (u < 0.5 ? 0.5 : 0.8) * (pts[0][0] < pts[pts.length - 1][0] ? -1 : 1);
      const l = 5 + r() * 5;
      o.globalAlpha = 0.55 + 0.4 * r();
      tick(o, x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2, x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, 1.3 + u * 0.8);
    }
  }
  o.globalAlpha = 1;
  line(o, pts, w * 0.7, "rgba(10,10,10,0.75)", 6, 0.6);
}

// ---------------------------------------------------------------- bangs and temple locks over the face
// [spine root->tip, width, strands, seed]; all start at the cuff's bottom edge
const BANGS = [
  // left forehead: locks sweeping down-left over the temple, past the outer corner of the eye
  [[[1336, 110], [1312, 136], [1294, 176], [1284, 226], [1280, 276], [1282, 316]], 26, 6, 701],
  [[[1314, 118], [1294, 156], [1280, 204], [1272, 256], [1272, 306], [1278, 342]], 22, 5, 702],
  [[[1352, 108], [1338, 140], [1326, 176], [1316, 200]], 12, 3, 703],
  [[[1296, 130], [1282, 172], [1274, 222], [1270, 262]], 14, 3, 704],
  // the central lock down between the eyes, its fine tips reaching the top of the nose
  [[[1398, 103], [1394, 146], [1386, 190], [1374, 232], [1364, 266], [1360, 294]], 30, 7, 705],
  [[[1416, 104], [1413, 146], [1404, 188], [1394, 226], [1388, 250]], 16, 4, 706],
  [[[1380, 104], [1372, 140], [1362, 180], [1356, 214], [1352, 240]], 12, 3, 707],
  // right forehead: locks sweeping down-right over the temple
  [[[1478, 108], [1500, 132], [1518, 164], [1530, 200], [1536, 236]], 20, 5, 708],
  [[[1504, 116], [1528, 150], [1545, 196], [1552, 246], [1552, 288]], 20, 5, 709],
  [[[1532, 128], [1556, 170], [1568, 226], [1572, 284], [1566, 332]], 24, 5, 710],
  [[[1456, 104], [1468, 128], [1478, 150], [1484, 170]], 10, 3, 711],
];
const WISPS = [
  [[1384, 150], [1380, 206], [1382, 256], [1388, 300]], [[1350, 128], [1336, 170], [1326, 214], [1322, 246]],
  [[1490, 122], [1512, 160], [1528, 214], [1534, 262]], [[1300, 160], [1288, 220], [1286, 280], [1290, 326]],
  [[1426, 108], [1426, 150], [1420, 190], [1414, 214]],
];
function paintBangs(P) {
  const o = P.o;
  for (const [s, w, n, seed] of BANGS) lockB(o, seed, s, w, n, { gather: 0.3, glint: 0.5, sw: 1.65 });
  const r = rng(733);
  for (const w of WISPS) { o.globalAlpha = 0.85; strand(o, w, 1.8 + r(), "#070707", 8, 0.1); }
  o.globalAlpha = 1;
}
// the part of the central lock that lies over the left eye's inner corner, redrawn after the eyes every frame
let FRONT = null;
function frontHair() {
  if (FRONT) return FRONT;
  const c = document.createElement("canvas"); c.width = 70; c.height = 70;
  const g = c.getContext("2d"); g.translate(-1330, -185);
  for (const [s, w, n, seed] of BANGS.slice(4, 7)) lockB(g, seed, s, w, n, { gather: 0.3, glint: 0.5, sw: 1.65 });
  FRONT = c;
  return c;
}

// ---------------------------------------------------------------- beanie
function paintBeanie(P, r) {
  const o = P.o, B = blob(BEANIE);
  P.fill(B, linear(1188, 0, 1628, 0, [[0, 0.38], [0.18, 0.6], [0.45, 0.7], [0.7, 0.66], [0.88, 0.48], [1, 0.34]]), 1.57, { spacing: 0.05, style: 0 });
  P.light(B, (g) => { const q = g.createLinearGradient(0, -14, 0, 212); q.addColorStop(0, grey(0.5)); q.addColorStop(0.3, grey(0.72)); q.addColorStop(1, grey(0.66)); return q; }, "multiply", 0.35);
  o.save(); o.beginPath(); B(o); o.clip();
  // knit: fine wavy rib columns, hanging straight in the cuff and bending over the dome in the crown; each column
  // is broken into short stitches whose tone varies a little from row to row
  o.fillStyle = "#0b0b0b";
  const cols = 92;
  for (let i = 0; i <= cols; i++) {
    const f = i / cols, xb = 1188 + 440 * f, edge = Math.abs(f - 0.5) * 2;
    const pts = [];
    for (let y = 214; y >= -18; y -= 6) {
      const crown = y < 42 ? (42 - y) / 60 : 0;
      pts.push([xb + (xb - 1408) * (0.03 * (y / 214 - 0.5) - crown * crown * 0.35) + Math.sin(i * 1.7 + y * 0.21) * 0.9, y]);
    }
    let k = 0;
    while (k < pts.length - 1) {
      const n = 2 + Math.floor(r() * 4), seg = pts.slice(k, Math.min(pts.length, k + n + 1));
      if (seg.length > 1) {
        o.globalAlpha = Math.min(1, (0.26 + 0.3 * edge + 0.12 * Math.sin(k * 0.8 + i * 0.4)) * (0.7 + 0.5 * r()));
        taper(o, seg, (u) => (0.85 + 0.8 * edge) * (0.75 + 0.35 * r()) * Math.pow(Math.sin(Math.PI * u), 0.4), "#0b0b0b");
      }
      k += n + (r() < 0.25 ? 1 : 0);
    }
  }
  // a few pale stitches catching the light between the ribs
  o.fillStyle = INK;
  for (let i = 0; i < 160; i++) { const x = 1230 + r() * 360, y = r() * 200; o.globalAlpha = 0.2 + 0.25 * r(); tick(o, x, y, x + (r() - 0.5) * 2, y + 4 + r() * 4, 0.9); }
  o.globalAlpha = 1;
  // shade the two sides with cross strokes, and the cuff just under the fold
  hatchD(o, r, { box: [1186, -14, 1300, 212], dens: (x) => 0.85 * sm(1290, 1195, x), ang: 0.6, gap: 3.4, seg: 20, w: 1.1, alpha: 0.7 });
  hatchD(o, r, { box: [1520, -14, 1630, 212], dens: (x) => 0.9 * sm(1525, 1622, x), ang: -0.6, gap: 3.4, seg: 20, w: 1.1, alpha: 0.7 });
  hatchD(o, r, { box: [1190, 30, 1626, 120], clip: blob([[1194, 96], [1230, 64], [1270, 48], [1340, 38], [1410, 34], [1480, 38], [1545, 46], [1590, 66], [1620, 92], [1620, 110], [1545, 64], [1410, 52], [1270, 66], [1200, 116]]), dens: () => 0.55, ang: 0.1, gap: 3, seg: 14, w: 0.9, alpha: 0.6 });
  o.restore();
  // the fold between crown and cuff, and the cuff's bottom edge over the hair
  line(o, FOLD, 2.8, "#0a0a0a", 6, 0.35);
  line(o, [[1192, 110], [1240, 76], [1300, 60], [1410, 54], [1520, 60], [1590, 80], [1622, 110]], 1.4, "rgba(10,10,10,0.6)", 6);
  line(o, RIM, 3, "#0a0a0a", 6, 0.3);
  line(o, [[1188, 190], [1186, 150], [1190, 104], [1200, 66], [1220, 34], [1256, 10]], 2.2, "#0a0a0a", 6, 0.3);
  line(o, [[1566, 10], [1600, 34], [1618, 66], [1626, 108], [1628, 160], [1622, 212]], 2.2, "#0a0a0a", 6, 0.3);
}

// ---------------------------------------------------------------- headphones round his neck
// Two padded cups seen at an angle: the left one shows its outer shell face (a dark disc in a lit rim) with the
// ribbed cushion toward his neck; the right one shows the ribbed cushion ring nearly face on, the shell behind it.
function paintHeadphones(P, r) {
  const o = P.o;
  // headband stubs going up behind the hair
  line(o, [[1246, 470], [1240, 440], [1244, 410], [1258, 388]], 12, "#060606", 6, 0.2);
  line(o, [[1240, 452], [1244, 420], [1256, 396]], 1.6, "rgba(242,240,234,0.55)", 5);
  line(o, [[1528, 420], [1540, 404], [1558, 396]], 11, "#060606", 6, 0.2);
  // ---- left cup: seen from its outer side; the ribbed cushion sticks out behind it on the neck side
  o.save(); o.translate(1302, 536); o.rotate(-0.1);
  o.fillStyle = "#050505"; o.beginPath(); o.ellipse(0, 0, 70, 109, 0, 0, 7); o.fill();
  ribRing(o, r, { cx: 30, cy: 0, rx: 40, ry: 106, ix: 26, iy: 0, irx: 16, iry: 86, a0: -1.62, a1: 1.62, n: 44, w: 3.2, alpha: 0.8 });
  // the shell: its side wall lit toward the top right, the dark outer face low on it
  const shell = (c) => c.ellipse(-20, 6, 44, 100, 0, 0, 7);
  o.save(); o.beginPath(); shell(o); o.clip();
  o.fillStyle = "#121212"; o.beginPath(); shell(o); o.fill();
  // the lit side wall: engraved arcs following the shell's curve, brightest on its upper right
  for (let k = 0; k < 18; k++) {
    const rr = 0.62 + 0.36 * (k / 17), a0 = -2.0 + r() * 0.5, a1 = 1.3 + r() * 0.5;
    const pts = []; for (let j = 0; j <= 24; j++) { const a = a0 + (a1 - a0) * j / 24; pts.push([-20 + Math.cos(a) * 44 * rr, 6 + Math.sin(a) * 100 * rr]); }
    o.globalAlpha = (0.6 + 0.4 * r()) * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, (rr - 0.6) / 0.4)));
    taper(o, pts, (u) => (2.2 + 2 * r()) * Math.pow(Math.max(0, Math.cos((a0 + (a1 - a0) * u + 0.35) * 0.9)), 1.2), INK);
  }
  o.globalAlpha = 1;
  // outer face: dark disc with a lit lip, a grey sheen low on it
  o.fillStyle = "#0a0a0a"; o.beginPath(); o.ellipse(-30, 20, 27, 50, 0, 0, 7); o.fill();
  for (let k = 0; k < 6; k++) { o.strokeStyle = `rgba(242,240,234,${0.2 + 0.1 * k})`; o.lineWidth = 1.8; o.beginPath(); o.ellipse(-30, 20, 8 + k * 3.5, 16 + k * 7, 0, 2.2, 3.9); o.stroke(); }
  o.restore();
  o.strokeStyle = "rgba(242,240,234,0.9)"; o.lineWidth = 2.2; o.beginPath(); o.ellipse(-30, 20, 27, 50, 0, 1.6, 5.2); o.stroke();
  o.strokeStyle = "rgba(242,240,234,0.4)"; o.lineWidth = 1.3; o.beginPath(); o.ellipse(-30, 22, 20, 40, 0, 2.3, 4.0); o.stroke();
  o.strokeStyle = "#060606"; o.lineWidth = 2.6; o.beginPath(); shell(o); o.stroke();
  o.strokeStyle = "rgba(242,240,234,0.7)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(-20, 6, 40, 96, 0, 3.6, 4.7); o.stroke();
  o.restore();
  // yoke: the fork under the left cup and the cable dropping to the laptop
  line(o, [[1292, 606], [1300, 622], [1312, 632]], 5, "#070707", 4, 0.3);
  o.strokeStyle = "rgba(242,240,234,0.85)"; o.lineWidth = 2; o.beginPath(); o.ellipse(1306, 624, 8, 6, 0.5, 0, 7); o.stroke();
  line(o, [[1306, 628], [1309, 640], [1312, 652]], 3.2, "#070707", 3, 0.2);
  line(o, [[1304, 628], [1307, 640], [1309, 651]], 1.2, "rgba(242,240,234,0.7)", 3, 0.3);
  // ---- right cup: the ribbed cushion nearly face on, the shell behind it to the right
  o.save(); o.translate(1520, 512); o.rotate(0.03);
  o.fillStyle = "#050505"; o.beginPath(); o.ellipse(4, 0, 70, 106, 0, 0, 7); o.fill();
  // shell: dark, with lit rim streaks down its curve
  for (const [cx, rx, w, al, a0, a1] of [[30, 38, 4.5, 0.9, -1.25, 1.25], [36, 34, 3.6, 0.75, -1.15, 1.05], [42, 30, 3.4, 0.7, -1.1, 1.0], [48, 24, 3, 0.6, -0.95, 0.9], [54, 18, 2.4, 0.55, -0.8, 0.8], [22, 42, 2.4, 0.6, -1.35, 1.2]]) {
    o.strokeStyle = `rgba(242,240,234,${al})`; o.lineWidth = w; o.beginPath(); o.ellipse(cx, 0, rx, 100, 0, a0, a1); o.stroke();
  }
  // the cushion's inner surface seen at a grazing angle: horizontal ribs from the dark hole (left) to the rim
  for (let y = -98; y <= 98; y += 7.6 + r() * 1.4) {
    const xr = -18 + 46 * Math.sqrt(Math.max(0, 1 - (y / 102) ** 2)) * 0.97;
    const xl = -52 + 14 * Math.sqrt(Math.max(0, 1 - (y / 92) ** 2)) + 3;
    if (xr - xl < 6) continue;
    const a = xl + (xr - xl) * (0.12 + 0.25 * r()), b = xr - (xr - xl) * (0.04 + 0.2 * r());
    o.globalAlpha = (0.6 + 0.4 * r()) * (0.6 + 0.4 * (1 - Math.abs(y) / 110));
    const wr = 3.2 + 2.6 * r(), bow = (y / 102) * 4;
    taper(o, [[a, y - bow], [a + (b - a) * 0.3, y + 1.2 - bow * 0.3], [a + (b - a) * 0.7, y + 1.6], [b, y + 0.5 + bow * 0.5]], (u) => wr * Math.pow(Math.sin(Math.PI * Math.min(1, 0.04 + u * 0.92)), 0.3), "#eeece6");
    if (r() < 0.5) { o.globalAlpha = 0.6; const m = a + (b - a) * (0.3 + 0.4 * r()); taper(o, [[m, y - wr * 0.5], [m + 1, y + wr * 0.5]], () => 1.4, "#101010"); }
  }
  o.globalAlpha = 1;
  // the cushion's outer roll on the left, catching a little light: fine arcs following the ring
  ribRing(o, r, { cx: -18, cy: 0, rx: 46, ry: 102, ix: -30, iy: 0, irx: 30, iry: 92, a0: 1.75, a1: 4.55, n: 30, w: 1.8, alpha: 0.5 });
  for (let k = 0; k < 4; k++) { o.strokeStyle = `rgba(242,240,234,${0.35 + 0.12 * k})`; o.lineWidth = 1.4 + 0.4 * k; o.beginPath(); o.ellipse(-18, 0, 44 - k * 5, 100 - k * 4, 0, 1.9 + k * 0.1, 4.4 - k * 0.1); o.stroke(); }
  o.strokeStyle = "#050505"; o.lineWidth = 3; o.beginPath(); o.ellipse(-52, 0, 14, 92, 0, -1.4, 1.4); o.stroke();
  o.restore();
  line(o, [[1560, 590], [1574, 604], [1590, 612]], 6, "#070707", 4, 0.3);
  o.strokeStyle = "rgba(242,240,234,0.6)"; o.lineWidth = 1.6; o.beginPath(); o.ellipse(1576, 602, 7, 5, 0.3, 0, 7); o.stroke();
}
// ribs across a cushion ring between an outer ellipse (cx,cy,rx,ry) and an inner hole (ix,iy,irx,iry) for angles a0..a1
function ribRing(o, r, { cx, cy, rx, ry, ix, iy, irx, iry, a0, a1, n, w, alpha, flat = false }) {
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * (k + r() * 0.6) / n;
    const c = Math.cos(a), s = Math.sin(a);
    const po = [cx + c * rx * 0.96, cy + s * ry * 0.96], pi = [ix + c * irx * 1.05, iy + s * iry * 1.05];
    const f0 = 0.08 + r() * 0.25, f1 = 0.6 + r() * 0.35;
    const A = [po[0] + (pi[0] - po[0]) * f0, po[1] + (pi[1] - po[1]) * f0], Bp = [po[0] + (pi[0] - po[0]) * f1, po[1] + (pi[1] - po[1]) * f1];
    const mid = [(A[0] + Bp[0]) / 2 + (flat ? 0 : s * 2), (A[1] + Bp[1]) / 2 + (flat ? 1.5 : -c * 2)];
    const lit = Math.max(0.15, 0.5 + 0.5 * (flat ? c : -s * 0.3 + c * 0.7));
    o.globalAlpha = alpha * lit * (0.55 + 0.45 * r());
    taper(o, [A, mid, Bp], (u) => w * (0.6 + 0.6 * r()) * Math.pow(Math.sin(Math.PI * u), 0.5), INK);
  }
  o.globalAlpha = 1;
}

// ---------------------------------------------------------------- eyes (per frame)
// Heavy-lidded narrow eyes: sclera about 18 px tall between a heavy lash line and a fine lower lid; iris 24 px across
// with one small highlight. dx: the pupils' offset from their final place (frame 1161 on), lid: 0..1 opening.
const EYES = [
  { A: [1280, 212], B: [1361, 220], top: [[1292, 205], [1314, 202], [1340, 204]], bot: [[1296, 228], [1324, 230], [1348, 227]], iris: [1298, 216] },
  { A: [1539, 211], B: [1450, 219], top: [[1526, 204], [1500, 200.5], [1470, 203]], bot: [[1522, 224], [1494, 228], [1466, 226]], iris: [1471, 214] },
];
export function drawEyes(g, dx = 0, lid = 1) {
  for (const E of EYES) {
    const drop = (1 - lid) * 6;
    const top = E.top.map(([x, y], i) => [x, y + drop * (i === 1 ? 1 : 0.7)]);
    const upper = [E.A, ...top, E.B], lower = [E.B, ...E.bot.slice().reverse(), E.A];
    const open = (c) => { smoothPath(c, [...upper, ...lower.slice(1, -1)], true, 0.45); };
    g.save();
    g.fillStyle = "#e4e2dc"; g.beginPath(); open(g); g.fill();
    g.beginPath(); open(g); g.clip();
    // shadow of the upper lid on the eyeball, and a little grey in the corners
    const sg = g.createLinearGradient(0, E.iris[1] - 12, 0, E.iris[1] + 8);
    sg.addColorStop(0, "rgba(40,40,40,0.75)"); sg.addColorStop(0.45, "rgba(90,90,90,0.25)"); sg.addColorStop(1, "rgba(90,90,90,0)");
    g.fillStyle = sg; g.fillRect(E.A[0] - 50, E.iris[1] - 16, 200, 30);
    const [ix, iy] = [E.iris[0] + dx, E.iris[1]];
    g.fillStyle = "#1c1c1c"; g.beginPath(); g.arc(ix, iy, 13.5, 0, 7); g.fill();
    g.fillStyle = "#070707"; g.beginPath(); g.arc(ix, iy, 8, 0, 7); g.fill();
    g.strokeStyle = "rgba(110,110,110,0.55)"; g.lineWidth = 1.2; g.beginPath(); g.arc(ix, iy, 11.5, 0.5, 2.6); g.stroke();
    g.fillStyle = "#f4f2ec";
    g.beginPath(); g.moveTo(ix + 3, iy - 4.5); g.lineTo(ix + 10.5, iy - 4); g.lineTo(ix + 10, iy - 0.6); g.lineTo(ix + 3.5, iy - 1); g.closePath(); g.fill();
    g.restore();
    // heavy lash line (runs a little past the outer corner), the fine lower lid and the pale rim under it
    const o = Math.sign(E.A[0] - E.B[0]);
    line(g, [[E.A[0] + o * 3, E.A[1] + 1.5], ...top, [E.B[0] - o * 1, E.B[1] - 1]], 4, "#070707", 6, 0.3);
    line(g, [[E.A[0], E.A[1] + 1], ...E.bot, [E.B[0], E.B[1] + 0.5]], 1.8, "rgba(20,20,20,0.9)", 6, 0.5);
    line(g, [[E.A[0] + o * -3, E.A[1] + 6], ...E.bot.map(([x, y]) => [x, y + 5]), [E.B[0] + o * 4, E.B[1] + 5]], 1.3, "rgba(30,30,30,0.6)", 6, 0.5);
  }
  // the central lock of hair crosses the left eye's inner corner
  const E = EYES[0];
  g.save(); g.beginPath(); smoothPath(g, [E.A, ...E.top.map(([x, y]) => [x, y - 4]), [E.B[0] + 4, E.B[1]], ...E.bot.slice().reverse().map(([x, y]) => [x, y + 4])], true, 0.45); g.clip();
  g.drawImage(frontHair(), 1330, 185);
  g.restore();
}
