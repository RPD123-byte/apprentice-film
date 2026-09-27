// s19 room: the floor-level view among the gear (57.32–63.12). Locked-off camera (camtrack: drift < 0.3 px), so the
// room is one engraved plate in frame coordinates. Traced from the source at 57.32 (card in place) and 63.08 (card
// gone: the speaker, the plank, the scissors and the jack panel behind it).
//   paintRoom(P)       the static room (everything the card light does not change)
//   paintFloorRays(g)  the floor lit from under the card: bright radial rays (drawn straight onto a 2D canvas)
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const circ = (x, y, r) => (c) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); };
const ell = (x, y, rx, ry, a = 0) => (c) => { c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const rad = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const A = (dx, dy) => Math.atan2(dy, dx);
const W_ = (a) => `rgba(242,240,234,${a})`;
const K_ = (a) => `rgba(6,6,6,${a})`;
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// a swelling ink line through control points
export function line(o, pts, w, color = INK, per = 6, end = 0.3) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.5)), color);
}
// straight hatch strokes clipped to a path: direction angle, spacing, width; broken and jittered
function strokes(o, clip, box, ang, sp, w, color = INK, seed = 1, { brk = 0.25, jit = 0.4, len = [60, 220], alpha = 1, curve = 0 } = {}) {
  const r = rng(seed);
  o.save(); o.beginPath(); clip(o); o.clip();
  const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  for (let s = -R; s <= R; s += sp * (0.6 + 0.8 * r())) {
    let t = -R - r() * 80;
    while (t < R) {
      const L = len[0] + (len[1] - len[0]) * r();
      if (r() > brk) {
        const off = s + (r() - 0.5) * sp * jit;
        const a = [cx + n[0] * off + d[0] * t, cy + n[1] * off + d[1] * t], b = [a[0] + d[0] * L, a[1] + d[1] * L];
        const m = [(a[0] + b[0]) / 2 + n[0] * curve * L * (r() - 0.3), (a[1] + b[1]) / 2 + n[1] * curve * L * (r() - 0.3)];
        const ww = w * (0.5 + 1.0 * r());
        o.globalAlpha = alpha * (0.45 + 0.55 * r());
        taper(o, sampleCurve([a, m, b], 4), (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.45), color);
      }
      t += L + 6 + r() * 40;
    }
  }
  o.globalAlpha = 1;
  o.restore();
}
function arcPts(cx, cy, rx, ry, a0, a1, n = 40) { const q = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; q.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return q; }

// ---------------------------------------------------------------- geometry (frame px)
const AMP = [[0, 0], [256, 0], [205, 192], [0, 110]];
const AMPPANEL = [[0, 110], [205, 192], [232, 196], [200, 330], [120, 420], [0, 440]];
// guitar case: the neck band from the top down to the body at the bottom left (left edge traced from the source)
const CASE = [[412, 0], [690, 0], [650, 110], [600, 210], [556, 300], [520, 360], [470, 430], [390, 520], [340, 600], [318, 700], [306, 772], [200, 776], [110, 764], [60, 724], [38, 640], [50, 548], [96, 460], [147, 488 - 40], [180, 413], [230, 330], [288, 255], [338, 230], [372, 197], [393, 105]];
const CASE_HANDLE = [[256, 300], [266, 252], [306, 228], [350, 236], [372, 262]];
const LATCHES = [[436, 126, 55, 34, -0.6], [226, 358, 50, 30, -0.3], [54, 628, 42, 38, -0.15]];
const BACKWALL = [[640, 0], [930, 0], [900, 360], [700, 330]];
// milk crate (front long face, right short face)
const CR = { ftl: [368, 378], ftr: [690, 364], fbr: [700, 768], fbl: [338, 766], btr: [912, 432], bbr: [906, 760], rimB: 471 };
const CAB = [[660, 0], [1320, 0], [1316, 778], [900, 780], [880, 700], [700, 660]];
const WOOF = { x: 1014, y: 342, r: 225, sx: 186 / 225 };   // measured at 63.08: x 828–1200, y 117–567 (seen at an angle)
const TWEET = { x: 980, y: 20, r: 54 };
const PLANK = [[1321, 0], [1526, 0], [1546, 800], [1331, 806]];
const JACK = [[1495, 122], [1650, 205], [1652, 280], [1497, 200]];
const RCAB = [[1519, 40], [1600, 40], [1700, 160], [1790, 770], [1545, 770]];
const RCAB_SIDE = [[1586, 36], [1701, 166], [1776, 760], [1640, 770]];
const BOXES = [
  [[2028, 0], [2066, 0], [2106, 96], [2080, 204]],
  [[2125, 73], [2206, 50], [2206, 475], [2142, 300], [2100, 176]],
  [[2091, 288], [2050, 390], [2110, 532], [2170, 470]],
  [[2176, 478], [2112, 548], [2178, 738], [2206, 690], [2206, 520]],
];
const TOPBOX = [[1652, 0], [1900, 0], [1896, 40], [1660, 44]];

// ---------------------------------------------------------------- the room plate
export function paintRoom(P) {
  const o = P.o;
  // --- far back: black
  P.fill(poly([[0, 0], [2206, 0], [2206, 946], [0, 946]]), 0.0, Math.PI / 2, { spacing: 0.3 });
  // wall panel between the case and the speaker: black with faint vertical rain
  strokes(o, poly(BACKWALL), [640, 0, 930, 360], Math.PI / 2 + 0.04, 13, 1.6, INK, 3, { alpha: 0.5, len: [60, 240], brk: 0.4 });
  line(o, [[672, 0], [676, 160], [680, 330]], 2.4, W_(0.6));

  // --- top-left amp: a dim mesh grille over black
  o.save(); o.beginPath(); poly(AMP)(o); o.clip();
  const rg = rng(4);
  for (let k = -20; k < 60; k++) { o.strokeStyle = W_(0.28 + 0.25 * rg()); o.lineWidth = 1.4 + rg() * 1.2; o.beginPath(); o.moveTo(k * 12, -10); o.lineTo(k * 12 - 64, 260); o.stroke(); }
  for (let k = -10; k < 40; k++) { o.strokeStyle = W_(0.25 + 0.25 * rg()); o.lineWidth = 1.4 + rg(); o.beginPath(); o.moveTo(-20, k * 11); o.lineTo(300, k * 11 + 48); o.stroke(); }
  o.restore();
  line(o, [[0, 112], [100, 150], [206, 194]], 5, W_(0.5));
  line(o, [[256, 0], [236, 90], [207, 192]], 2.5, W_(0.6));
  strokes(o, poly(AMPPANEL), [0, 110, 232, 440], 1.95, 11, 2.0, INK, 5, { alpha: 0.45, len: [50, 180] });

  // --- big speaker cabinet (dark wood, faint vertical grain), woofer and tweeter
  strokes(o, poly(CAB), [660, 0, 1320, 780], Math.PI / 2 + 0.02, 9, 1.5, INK, 7, { alpha: 0.4, len: [40, 240], brk: 0.45 });
  paintWoofer(P);
  paintTweeter(P);

  // --- plank (pale wood) with the scissors leaning on it
  P.fill(poly(PLANK), lin(1321, 0, 1546, 0, [[0, 0.62], [0.45, 0.78], [1, 0.55]]), Math.PI / 2 - 0.025, { spacing: 0.35 });
  strokes(o, poly(PLANK), [1321, 0, 1546, 806], Math.PI / 2 - 0.025, 11, 1.4, K_(1), 11, { alpha: 0.6, len: [80, 400] });
  line(o, [[1321, 0], [1326, 400], [1331, 806]], 3, K_(1));
  line(o, [[1526, 0], [1536, 400], [1546, 800]], 3, K_(1));
  paintScissors(P);
  // jack panel with holes, cables hanging from it
  P.fill(poly(JACK), lin(1491, 126, 1676, 336, [[0, 0.72], [1, 0.5]]), 0.36, { style: 2 });
  line(o, [...JACK, JACK[0]], 3, K_(1), 3, 0.8);
  for (let rr = 0; rr < 2; rr++) for (let k = 0; k < 6; k++) {
    const u = (k + 0.5) / 6, v = (rr + 0.5) / 2;
    const top = lerp2(JACK[0], JACK[1], u), bot = lerp2(JACK[3], JACK[2], u), p = lerp2(top, bot, v);
    o.fillStyle = "#070707"; o.beginPath(); o.ellipse(p[0], p[1], 8, 9, 0.3, 0, 7); o.fill();
    o.fillStyle = W_(0.75); o.beginPath(); o.arc(p[0] - 2, p[1] - 3, 2.2, 0, 7); o.fill();
  }
  for (const [x0, bow] of [[1560, 30], [1590, 60], [1618, 40]]) line(o, [[x0, 300], [x0 + bow, 420], [x0 + bow * 0.8, 600], [x0 + 10, 740]], 2.6, W_(0.7));
  // right cabinet: dark body, lit side face with bright vertical strokes
  // measured at 63.08: a dark cabinet whose lit front edge runs (1600, 290) → (1745, 790), with a rounded inner
  // face outline; only sparse strokes on it
  strokes(o, poly(RCAB_SIDE), [1586, 36, 1780, 770], Math.PI / 2 - 0.11, 16, 1.6, INK, 13, { alpha: 0.35, len: [60, 260], brk: 0.45 });
  line(o, [[1600, 290], [1660, 440], [1712, 620], [1745, 790]], 2.6, W_(0.7));
  line(o, [[1566, 380], [1575, 560], [1590, 740], [1640, 770], [1700, 760]], 2.0, W_(0.4));
  line(o, [[1640, 770], [1700, 766], [1776, 760]], 2.5, W_(0.7));
  line(o, arcPts(1760, 318, 34, 50, -2.2, 1.4, 24), 2.5, W_(0.7));
  // leaves at the top
  for (const [x, y, a, s] of [[1488, 22, 0.8, 1], [1520, 8, -0.4, 0.8], [1540, 62, 1.2, 0.9], [1470, 60, 2.2, 0.7]]) leaf(P, x, y, a, s);
  // the framed sign at the top
  line(o, [TOPBOX[3], TOPBOX[2], TOPBOX[1]], 2.2, W_(0.6));
  o.fillStyle = W_(0.6); o.beginPath(); o.arc(1670, 30, 3, 0, 7); o.fill();

  // --- far right boxes: faces of dense slanted strokes, black between
  BOXES.forEach((b, i) => {
    const ang = 1.15;
    P.fill(poly(b), 0.2, ang, { spacing: 0.25 });
    strokes(o, poly(b), [b[0][0] - 20, b[0][1] - 20, b[2][0] + 40, b[2][1] + 20], ang, 9, 2.4, INK, 30 + i, { alpha: 0.5, len: [30, 160], brk: 0.3 });
    line(o, [...b, b[0]], 2.2, W_(0.5), 3, 0.8);
  });

  paintCase(P);
  paintCrate(P);

  // --- floor: black with faint plank lines (the card's light is a separate layer)
  const rf = rng(77);
  for (let i = 0; i < 60; i++) {
    const y0 = 792 + rf() * 150, x0 = rf() * 800;
    const L = 80 + rf() * 260, sl = 0.05 + (y0 - 780) / 900;
    o.globalAlpha = 0.12 + 0.25 * rf();
    line(o, [[x0, y0], [x0 + L, y0 - L * sl]], 1 + rf() * 1.4);
  }
  o.globalAlpha = 1;
  // cable on the floor from the crate to the right, behind the card
  cableRope(o, [[800, 740], [840, 779], [897, 793], [1004, 786], [1120, 780], [1220, 774], [1310, 758]], 9);
}

// concentric engraved rings whose thickness follows a value field V(r, a) (0..1): lines on black, like the source cone
function ringField(o, cx, cy, r0, r1, sp, V, seed, { sy = 1, dcx = 0, dcy = 0 } = {}) {
  const r = rng(seed);
  for (let rr = r0; rr <= r1; rr += sp * (0.8 + 0.4 * r())) {
    const f = (rr - r0) / Math.max(1, r1 - r0), x = cx + dcx * f, y = cy + dcy * f;
    const n = Math.max(24, Math.round(rr * 0.5)), ph = r() * 6.28, pts = [], ws = [];
    for (let k = 0; k <= n; k++) {
      const a = ph + (k / n) * Math.PI * 2;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * sy]);
      const v = clamp(V(rr, a) * (0.85 + 0.3 * Math.sin(a * 3 + rr * 0.21 + ph)));
      ws.push(sp * Math.pow(v, 0.9) * 1.05);
    }
    taper(o, pts, (u) => ws[Math.min(n, Math.round(u * n))], INK);
  }
}
function paintWoofer(P) {
  const o = P.o, W = WOOF, r = rng(23);
  // everything in the woofer's own round space (r = 225), squashed horizontally by sx about its centre
  P.fill((c) => c.ellipse(W.x, W.y, W.r * W.sx, W.r, 0, 0, Math.PI * 2), 0.0, 0, { style: 2 });
  o.save(); o.translate(W.x, W.y); o.scale(W.sx, 1);
  const cap = { x: 50, y: 2, r: 78 };       // dust cap (frame ≈ (1055, 344), r 72)
  // measured (63.08, card gone): the surround is bright only on the left (150–220), the top and right stay dark;
  // the cone carries fine rings, mid-grey on the left, near black on the right
  const V = (rr, a) => {
    const f = (rr - cap.r) / (W.r - 30 - cap.r);
    const side = Math.pow(clamp((Math.cos(a - 3.1) + 0.1) / 1.1), 1.2);
    return 0.14 + 1.0 * side * (0.85 + 0.15 * f) + (f > 0.66 ? 0.1 : 0);
  };
  ringField(o, cap.x, cap.y, cap.r + 6, W.r - 32, 7.5, V, 23, { dcx: -cap.x, dcy: -cap.y });
  line(o, arcPts(0, 0, W.r - 2, W.r - 2, Math.PI * 0.45, Math.PI * 1.55, 60), 4, W_(0.8), 2, 0.3);
  line(o, arcPts(0, 0, W.r - 2, W.r - 2, -Math.PI * 0.45, Math.PI * 0.45, 60), 2.2, W_(0.3), 2, 0.3);
  line(o, arcPts(0, 0, W.r - 28, W.r - 28, Math.PI * 0.55, Math.PI * 1.45, 60), 2.4, W_(0.5), 2, 0.3);
  for (const a of [-2.35, -0.8, 0.8, 2.35]) { const x = Math.cos(a) * (W.r - 14), y = Math.sin(a) * (W.r - 14); o.fillStyle = W_(0.8); o.beginPath(); o.arc(x, y, 6, 0, 7); o.fill(); o.fillStyle = K_(1); o.beginPath(); o.arc(x, y, 3, 0, 7); o.fill(); }
  o.fillStyle = "#040404"; o.beginPath(); o.arc(cap.x, cap.y, cap.r, 0, 7); o.fill();
  line(o, arcPts(cap.x, cap.y, cap.r, cap.r, -Math.PI, Math.PI, 60), 2.2, W_(0.4), 2, 0.8);
  const hx = cap.x + 4, hy = cap.y - 14;
  // a soft specular glow on the cap (the source shows a bright hazy highlight, not a star)
  const gl = o.createRadialGradient(hx, hy, 0, hx, hy, 34);
  gl.addColorStop(0, W_(0.95)); gl.addColorStop(0.3, W_(0.5)); gl.addColorStop(1, W_(0));
  o.fillStyle = gl; o.beginPath(); o.arc(hx, hy, 34, 0, 7); o.fill();
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, L = 18 + r() * 40; o.globalAlpha = 0.12 + 0.2 * r(); line(o, [[hx + Math.cos(a) * 10, hy + Math.sin(a) * 10], [hx + Math.cos(a) * L, hy + Math.sin(a) * L]], 1.0 + r() * 1.2, INK, 2, 0.8); }
  o.globalAlpha = 1;
  o.restore();
}
function paintTweeter(P) {
  const o = P.o, T = TWEET, r = rng(29);
  P.fill(circ(T.x, T.y, T.r), 0.0, 0, { style: 2 });
  for (let i = 0; i < 12; i++) {
    const rr = 34 + i * 3.2, a0 = -Math.PI * 1.15, a1 = a0 + Math.PI * (1.0 + 0.5 * r());
    line(o, arcPts(T.x, T.y, rr, rr, a0, a1, 24), 1.2 + r() * 1.4, W_(0.35 + 0.5 * r()), 2, 0.2);
  }
  line(o, arcPts(T.x, T.y, T.r, T.r, -Math.PI, Math.PI, 50), 3, W_(0.75), 2, 0.7);
  o.fillStyle = W_(0.95); o.beginPath(); o.arc(T.x + 12, T.y - 8, 9, 0, 7); o.fill();
}

function leaf(P, x, y, a, s) {
  const o = P.o, c = Math.cos(a), sn = Math.sin(a), L = 38 * s, Wd = 16 * s;
  const pts = [[0, 0], [L * 0.4, -Wd], [L, 0], [L * 0.4, Wd]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
  P.fill(blob(pts), 0.45, a, { style: 2 });
  line(o, [...pts, pts[0]], 2, K_(1), 4, 0.8);
  line(o, [pts[0], pts[2]], 1.2, K_(1));
}

function paintCase(P) {
  const o = P.o;
  P.fill(blob(CASE), lin(600, 0, 60, 760, [[0, 0.08], [0.5, 0.04], [1, 0.07]]), A(-0.55, 0.84), { spacing: 0.5 });
  strokes(o, blob(CASE), [30, 0, 700, 780], A(-0.5, 0.86), 12, 1.6, INK, 21, { alpha: 0.36, len: [60, 260], brk: 0.45, curve: 0.06 });
  // edges: bright outer rim, the lid seam inside
  line(o, [[412, 0], [393, 105], [372, 197], [338, 230], [288, 255], [230, 330], [180, 413], [130, 480], [80, 560], [50, 640], [60, 724], [110, 764], [200, 776], [306, 772]], 3.0, W_(0.6), 5, 0.6);
  line(o, [[455, 0], [430, 110], [400, 210], [330, 270], [260, 330], [200, 420], [140, 520], [100, 620], [110, 700], [170, 752], [260, 758]], 2.0, W_(0.55), 5, 0.4);
  line(o, [[690, 0], [650, 110], [600, 210], [556, 300], [520, 360], [470, 430]], 2.6, W_(0.55), 5, 0.6);
  line(o, [[640, 0], [606, 120], [560, 220], [520, 290]], 1.6, W_(0.45), 5, 0.4);
  // a soft highlight down the lid
  strokes(o, poly([[560, 90], [620, 110], [560, 260], [520, 240]]), [520, 90, 630, 270], A(-0.3, 1), 7, 2.4, INK, 24, { alpha: 0.45, len: [30, 90] });
  // handle
  line(o, CASE_HANDLE, 9, K_(1)); line(o, CASE_HANDLE, 3.2, W_(0.8));
  line(o, CASE_HANDLE.map(([x, y]) => [x + 2, y + 8]), 2, W_(0.4));
  // latches
  for (const [x, y, w, h, a] of LATCHES) {
    o.save(); o.translate(x + w / 2, y + h / 2); o.rotate(a);
    o.fillStyle = "rgba(160,158,150,0.9)"; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 5); o.fill();
    o.fillStyle = "#0a0a0a"; o.fillRect(-w * 0.25, -h * 0.2, w * 0.5, h * 0.4);
    o.strokeStyle = W_(0.9); o.lineWidth = 2; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 5); o.stroke();
    o.restore();
  }
}

function paintCrate(P) {
  const o = P.o, c = CR;
  const black = [c.ftl, c.ftr, [c.btr[0], c.btr[1]], c.bbr, c.fbr, c.fbl];
  P.fill(poly([c.ftl, c.ftr, c.fbr, c.fbl]), 0.0, Math.PI / 2, { spacing: 0.3 });
  // the coiled cable heaped on the lid (drawn first: the rim covers its lower half)
  const r = rng(47);
  for (let k = 0; k < 6; k++) {
    const cx = 690 + (r() - 0.5) * 40, cy = 372 - k * 5, rx = 150 - k * 10 + r() * 20, ry = 42 - k * 3;
    cableRope(o, arcPts(cx, cy, rx, ry, Math.PI * (1.02 + 0.05 * r()), Math.PI * (1.98 - 0.05 * r()), 30), 13 - k * 0.8);
  }
  // front face rim band (molded, vertical fins)
  const rimF = [c.ftl, c.ftr, [c.ftr[0], c.rimB - 6], [c.ftl[0] - 6, c.rimB]];
  P.fill(poly(rimF), lin(452, 371, 690, 371, [[0, 0.06], [1, 0.12]]), Math.PI / 2, { spacing: 0.4 });
  strokes(o, poly(rimF), [440, 360, 700, 480], Math.PI / 2, 9, 2.0, INK, 41, { brk: 0.15, len: [40, 110], alpha: 0.45 });
  line(o, [c.ftl, c.ftr], 4, W_(0.85)); line(o, [[c.ftl[0] - 6, c.rimB], [c.ftr[0], c.rimB - 6]], 3.5, W_(0.8));
  line(o, [[c.ftl[0] - 4, c.rimB + 14], [c.ftr[0], c.rimB + 8]], 2, W_(0.5));
  line(o, [[c.ftl[0] - 30, c.ftl[1] + 6], c.ftl, [c.ftl[0] - 6, c.rimB]], 3, W_(0.6));
  // front lattice
  latt(o, [[c.ftl[0] - 60, c.rimB + 14], [c.ftr[0] - 24, c.rimB + 8], [c.fbr[0] - 24, 740], [c.fbl[0] + 10, 738]], 86, 2.6, 0.7);
  // front left post (dark) and front right corner post (lit)
  const postR = [[c.ftr[0] - 22, c.ftr[1]], [c.ftr[0] + 12, c.ftr[1] - 2], [c.fbr[0] + 6, c.fbr[1] - 20], [c.fbr[0] - 28, c.fbr[1] - 20]];
  P.fill(poly(postR), lin(670, 0, 705, 0, [[0, 0.5], [1, 0.8]]), Math.PI / 2, { spacing: 0.3 });
  line(o, [postR[0], postR[3]], 2.6, K_(0.9)); line(o, [postR[1], postR[2]], 2.6, K_(0.9));
  line(o, [[c.fbl[0] + 6, c.rimB], [c.fbl[0], 740]], 3, W_(0.55));
  // right (short) face: bright rim band, handle hole, lattice, back post
  const rtl = [c.ftr[0] + 12, c.ftr[1]], rbl = [c.fbr[0] + 6, c.fbr[1] - 20];
  const rimR = [rtl, c.btr, [c.btr[0], c.btr[1] + 60], [rtl[0], rtl[1] + 110]];
  P.fill(poly(rimR), lin(700, 0, 912, 0, [[0, 0.45], [1, 0.35]]), Math.PI / 2, { spacing: 0.3 });
  strokes(o, poly(rimR), [700, 360, 915, 500], Math.PI / 2, 8, 2.0, K_(1), 43, { brk: 0.1, len: [30, 90], alpha: 0.7 });
  line(o, [rtl, c.btr], 3.5, W_(0.9)); line(o, [rimR[3], rimR[2]], 3, W_(0.8));
  // the inner lip of the rim and the handle hole
  P.fill(blob([[770, 486], [866, 506], [870, 572], [776, 552]]), 0.0, 0, { style: 2 });
  line(o, [[760, 480], [870, 500], [874, 578], [770, 560], [760, 480]], 2.4, W_(0.7));
  latt(o, [[rtl[0] + 4, 560], [c.btr[0] - 36, 560], [c.bbr[0] - 30, c.bbr[1] - 22], [rbl[0] + 6, rbl[1] - 10]], 56, 3.4, 0.9);
  const bp = [[c.btr[0] - 40, c.btr[1] + 10], [c.btr[0] + 6, c.btr[1] + 10], [c.bbr[0] + 4, c.bbr[1]], [c.bbr[0] - 40, c.bbr[1]]];
  P.fill(poly(bp), lin(870, 0, 912, 0, [[0, 0.62], [1, 0.4]]), Math.PI / 2, { spacing: 0.3 });
  line(o, [bp[0], bp[3]], 2.2, K_(0.9)); line(o, [bp[1], bp[2]], 2.4, W_(0.7));
  // bottom rails and corner protectors
  line(o, [[c.fbl[0], c.fbl[1] - 8], [c.fbr[0] - 30, c.fbr[1] - 14]], 3.2, W_(0.6));
  line(o, [[rbl[0], rbl[1] + 4], [c.bbr[0], c.bbr[1] - 6]], 3.4, W_(0.85));
  for (const [x, y, w, h, v] of [[300, 722, 50, 48, 0.25], [604, 719, 86, 50, 0.8], [854, 719, 38, 36, 0.75]]) {
    P.fill(poly([[x, y], [x + w, y + 3], [x + w, y + h], [x, y + h - 2]]), v, 0, { style: 2 });
    line(o, [[x, y], [x + w, y + 3], [x + w, y + h], [x, y + h - 2], [x, y]], 2, K_(1), 2, 0.9);
    o.fillStyle = K_(1); o.beginPath(); o.arc(x + w * 0.6, y + h * 0.55, 4.5, 0, 7); o.fill();
  }
  // the cable over the right corner, down to the floor
  cableRope(o, [[700, 336], [733, 343], [751, 457], [758, 564], [769, 671], [797, 743], [840, 779]], 11);
}
// a lattice of diamond bars inside a quad (bilinear), bar spacing in px
function latt(o, q, sp, w, a) {
  const [p0, p1, p2, p3] = q;
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), H = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
  const n = Math.max(2, Math.round(L / sp)), m = Math.max(1, (H / L) * n);
  const P = (u, v) => lerp2(lerp2(p0, p1, u), lerp2(p3, p2, u), v);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  for (let k = -Math.ceil(m) - 1; k <= n + 1; k++) {
    for (const s of [1, -1]) {
      const u0 = k / n, u1 = u0 + s * m / n;
      const A0 = P(u0, 0), A1 = P(u1, 1);
      const d = [A1[0] - A0[0], A1[1] - A0[1]];
      const B0 = [A0[0] - d[0] * 0.05, A0[1] - d[1] * 0.05], B1 = [A1[0] + d[0] * 0.05, A1[1] + d[1] * 0.05];
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], () => w + 2.4, K_(0.95));
      o.globalAlpha = a;
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], (u) => w * (0.75 + 0.25 * Math.sin(Math.PI * u)), INK);
      o.globalAlpha = 1;
    }
  }
  o.restore();
}
// a braided cable: dark core, pale body, alternating ridges
function cableRope(o, pts, w) {
  const q = sampleCurve(pts, 10);
  taper(o, q, () => w + 3, "#050505");
  taper(o, q, () => w * 0.7, "rgba(150,148,142,0.8)");
  for (let i = 1; i < q.length - 1; i++) {
    const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    o.strokeStyle = i % 2 ? W_(0.9) : K_(0.95); o.lineWidth = 1.4;
    o.beginPath(); o.moveTo(q[i][0] - nx * w * 0.5, q[i][1] - ny * w * 0.5); o.lineTo(q[i][0] + nx * w * 0.5 + dx / d * 3, q[i][1] + ny * w * 0.5 + dy / d * 3); o.stroke();
  }
}

// the scissors leaning on the plank, with cobwebs (seen once the card is carried away)
function paintScissors(P) {
  const o = P.o;
  const piv = [1381, 446];
  const loop = (cx, cy, rx, ry, a, th) => {
    const outer = ell(cx, cy, rx, ry, a), inner = ell(cx + 3, cy + 4, rx - th, ry - th * 1.05, a);
    P.fill(outer, 0.9, a + 1.2, { style: 2 });
    P.fill(inner, 0.08, Math.PI / 2, { spacing: 0.4 });
    o.lineWidth = 3; o.strokeStyle = "#0a0a0a"; o.beginPath(); outer(o); o.stroke(); o.beginPath(); inner(o); o.stroke();
    o.lineWidth = 2.2; o.strokeStyle = K_(0.45); o.beginPath(); o.ellipse(cx + 3, cy + 3, rx - th * 0.4, ry - th * 0.45, a, 0.2, 2.2); o.stroke();
  };
  // shanks from the loops to the pivot
  P.fill(poly([[1262, 296], [1300, 300], [piv[0] + 12, piv[1] - 8], [piv[0] - 18, piv[1] + 8]]), 0.8, A(119, 150), { style: 2 });
  P.fill(poly([[1398, 284], [1432, 290], [piv[0] + 22, piv[1] + 4], [piv[0] - 8, piv[1] - 12]]), 0.74, A(-17, 160), { style: 2 });
  line(o, [[1262, 296], [piv[0] - 18, piv[1] + 8]], 2.4, K_(1)); line(o, [[1432, 290], [piv[0] + 22, piv[1] + 4]], 2.4, K_(1));
  loop(1226, 234, 68, 102, -0.42, 26);
  loop(1426, 221, 60, 76, 0.18, 21);
  // blades: two long overlapping blades down to the right
  const b1 = [[piv[0] - 44, piv[1] + 14], [piv[0] + 34, piv[1] - 24], [1524, 786], [1492, 810]];
  const b2 = [[piv[0] - 38, piv[1] + 38], [piv[0] + 24, piv[1] + 26], [1470, 798], [1440, 808]];
  P.fill(poly(b2), lin(1360, 470, 1470, 800, [[0, 0.72], [0.6, 0.55], [1, 0.4]]), A(90, 350), { style: 2 });
  P.fill(poly(b1), lin(1360, 450, 1510, 790, [[0, 0.86], [0.5, 0.68], [1, 0.52]]), A(120, 340), { style: 2 });
  for (const b of [b2, b1]) line(o, [...b, b[0]], 2.6, K_(1), 2, 0.9);
  line(o, [[piv[0] + 26, piv[1] - 14], [1450, 600], [1514, 784]], 2.2, W_(0.95));      // bright cutting edge
  P.light(poly([[1420, 600], [1480, 600], [1524, 786], [1440, 808]]), lin(0, 560, 0, 810, [[0, 0], [1, 0.35]]), "multiply", 0.6);
  const rs = rng(55);
  for (let i = 0; i < 110; i++) {
    const t = 0.3 + rs() * 0.65, x = piv[0] + (1500 - piv[0]) * t + (rs() - 0.5) * 36 * (1 - t * 0.6), y = piv[1] + (798 - piv[1]) * t;
    o.fillStyle = K_(0.15 + rs() * 0.35); o.beginPath(); o.arc(x, y, 0.8 + rs() * 2.4, 0, 7); o.fill();
  }
  o.fillStyle = "rgba(220,218,210,1)"; o.beginPath(); o.arc(piv[0], piv[1], 13, 0, 7); o.fill();
  o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.5; o.stroke();
  o.beginPath(); o.moveTo(piv[0] - 8, piv[1] + 3); o.lineTo(piv[0] + 8, piv[1] - 3); o.stroke();
  // cobwebs
  const rc = rng(61);
  const anchors = [[1280, 150], [1300, 250], [1340, 200], [1350, 330], [1400, 320], [1440, 420], [1470, 560], [1520, 700], [1420, 680], [1380, 760], [1560, 780], [1340, 610], [1300, 700]];
  o.lineWidth = 1;
  for (let i = 0; i < 46; i++) {
    const a = anchors[Math.floor(rc() * anchors.length)], b = anchors[Math.floor(rc() * anchors.length)];
    if (a === b) continue;
    const m = [(a[0] + b[0]) / 2 + (rc() - 0.5) * 20, (a[1] + b[1]) / 2 + 10 + rc() * 15];
    o.strokeStyle = W_(0.3 + 0.35 * rc());
    o.beginPath(); o.moveTo(a[0], a[1]); o.quadraticCurveTo(m[0], m[1], b[0], b[1]); o.stroke();
  }
}

// ---------------------------------------------------------------- floor light (card spill)
// Bright rays fanning out across the floor from a point under the card (measured: they converge near (1300, 780)).
export function paintFloorRays(g, fx = 1300, fy = 645) {
  // measured: the rays fan from x 900..1750 at y 795 to x 500..2206 at the bottom edge -> a virtual origin at
  // (1300, 645) under the card; they are only drawn on the floor (below y 786)
  const r = rng(91);
  g.save();
  g.beginPath(); g.rect(0, 784, 2206, 162); g.clip();
  const N = 420, y0 = 786;
  for (let i = 0; i < N; i++) {
    const xb = -900 + (4000 * (i + r())) / N;
    const d = [xb - fx, 946 - fy], L = Math.hypot(d[0], d[1]); d[0] /= L; d[1] /= L;
    const tA = (y0 - fy) / d[1], tB = (960 - fy) / d[1];
    const off = Math.abs(xb - fx);
    const bright = clamp(1.25 - off / 1250, 0.05, 1) * (0.6 + 0.4 * r());
    const w = (1.4 + 3.2 * r()) * (0.5 + 0.5 * clamp(1 - off / 1800));
    let u = r() * 0.15;
    while (u < 1) {
      const u1 = Math.min(1, u + 0.25 + r() * 0.9);
      if (r() > 0.18) {
        const p = [fx + d[0] * (tA + (tB - tA) * u), fy + d[1] * (tA + (tB - tA) * u)], q = [fx + d[0] * (tA + (tB - tA) * u1), fy + d[1] * (tA + (tB - tA) * u1)];
        g.globalAlpha = clamp(bright * (1.0 - 0.3 * u), 0.04, 0.95);
        taper(g, [p, lerp2(p, q, 0.5), q], (t) => w * (0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.6 + 0.8 * (u + (u1 - u) * t)), INK);
      }
      u = u1 + 0.02 + r() * 0.1;
    }
  }
  // the haze right under the card edge
  g.globalAlpha = 1;
  const hz = g.createLinearGradient(0, 786, 0, 900);
  hz.addColorStop(0, "rgba(242,240,234,0.5)"); hz.addColorStop(1, "rgba(242,240,234,0)");
  g.fillStyle = hz; g.beginPath(); g.moveTo(980, 786); g.lineTo(1700, 786); g.lineTo(1950, 900); g.lineTo(760, 900); g.closePath(); g.fill();
  g.restore();
}
