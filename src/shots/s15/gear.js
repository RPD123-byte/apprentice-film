// s15 gear pictures (fix pass 2): the gear room's shelving units, the CRT monitor, the speaker, the keyboards and take
// H's gear wall, redrawn in the source's scratchboard manner: near-black interiors, every surface built from many thin
// light strokes that follow its form (shelf boards and posts streaked along their length, the speaker cone swirled
// round its axis), cables as grey ropes with a dark keyline and a lit edge, lit edges and knobs picked out.
// Each picture is laid out in FRAME PIXELS of the source frame it was measured on (the face's quad on that frame is
// the picture's rectangle, so a feature measured at frame (x, y) is drawn at (x, y)): shelfC / shelfD / monitor at
// 45.00 (take J's GL, GR and GM quads), rackE at 44.08 (take H's RK quad), the speakers in the face's own uv (the ring
// measured on 44.80 and 45.00, mapped through the quads' homographies). Numbers only; nothing is copied from the source.
// g = value canvas (R: 0 black .. 1 white), q = ink canvas (white = dark ink that stays black).
import { rng } from "../../lib/rng.js";

const G = (x) => { const c = Math.round(Math.max(0, Math.min(1, x)) * 255); return `rgb(${c},${c},${c})`; };
const inkW = (a) => `rgba(255,255,255,${a})`;
const TAU = Math.PI * 2;

function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
function curve(c, pts) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }
// a tapered stroke (a thin lens) from p0 to p1, w wide in the middle
function lens(g, x0, y0, x1, y1, w) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0); g.fill();
}
// scratchboard strokes inside a polygon: n strokes along angle a (or toward a vanishing point vp), values v, widths w,
// lengths len (px); ja = angle jitter
function scratch(g, r, pts, o) {
  const [x0, y0, x1, y1] = bbox(pts);
  g.save(); poly(g, pts); g.clip();
  for (let i = 0; i < o.n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    let dx, dy;
    if (o.vp) { dx = o.vp[0] - x; dy = o.vp[1] - y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const j = (r() - 0.5) * (o.ja ?? 0.03); const c = Math.cos(j), s = Math.sin(j); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    else { const a = o.a + (r() - 0.5) * (o.ja ?? 0.06); dx = Math.cos(a); dy = Math.sin(a); }
    const L = o.len[0] + r() * (o.len[1] - o.len[0]), t0 = -L * r();
    g.fillStyle = G(o.v[0] + r() * (o.v[1] - o.v[0]));
    g.globalAlpha = o.alpha ?? 1;
    lens(g, x + dx * t0, y + dy * t0, x + dx * (t0 + L), y + dy * (t0 + L), (o.w[0] + r() * (o.w[1] - o.w[0])) * 0.5);
  }
  g.restore(); g.globalAlpha = 1;
}
// a board / plank front: base value, streaks along it, a dark lower edge and an inked outline
function plank(g, q, r, pts, v, o = {}) {
  g.fillStyle = G(v); poly(g, pts); g.fill();
  const a = o.a ?? Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
  scratch(g, r, pts, { n: o.n ?? 40, a, v: o.sv ?? [v * 0.45, Math.min(1, v + 0.35)], w: o.sw ?? [0.8, 2.4], len: o.len ?? [30, 160], ja: 0.03 });
  if (o.dark !== false) { g.strokeStyle = G(0.04); g.lineWidth = o.lip ?? 3; g.beginPath(); g.moveTo(pts[3][0], pts[3][1]); g.lineTo(pts[2][0], pts[2][1]); g.stroke(); }
  q.strokeStyle = inkW(o.ink ?? 0.75); q.lineWidth = 1.6; poly(q, pts); q.stroke();
}
// a cable: dark keyline, grey body, a lit edge along its upper side
function rope(g, pts, w, v = 0.5) {
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = G(0.03); g.lineWidth = w + 3; curve(g, pts); g.stroke();
  g.strokeStyle = G(v); g.lineWidth = w; curve(g, pts); g.stroke();
  g.save(); g.translate(-w * 0.18, -w * 0.22); g.strokeStyle = G(Math.min(1, v + 0.42)); g.lineWidth = Math.max(0.8, w * 0.3); curve(g, pts); g.stroke(); g.restore();
}
// a loose coil of cable: k loops round (cx, cy)
function coil(g, r, cx, cy, rx, ry, k, w, v = 0.5) {
  for (let i = 0; i < k; i++) {
    const a0 = r() * TAU, ox = (r() - 0.5) * rx * 0.5, oy = (r() - 0.5) * ry * 0.5, sx = rx * (0.6 + 0.5 * r()), sy = ry * (0.6 + 0.5 * r()), tilt = (r() - 0.5) * 0.8;
    const pts = [];
    for (let j = 0; j <= 14; j++) {
      const a = a0 + (j / 14) * TAU * 1.05, x = Math.cos(a) * sx, y = Math.sin(a) * sy;
      pts.push([cx + ox + x * Math.cos(tilt) - y * Math.sin(tilt), cy + oy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    rope(g, pts, w, v);
  }
}
function knob(g, q, x, y, rr, v = 0.12) {
  g.fillStyle = G(v); g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  g.strokeStyle = G(0.8); g.lineWidth = Math.max(0.8, rr * 0.3); g.beginPath(); g.arc(x, y, rr * 0.85, Math.PI * 0.9, Math.PI * 1.7); g.stroke();
  g.fillStyle = G(0.85); g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.22, 0, TAU); g.fill();
}
// frame-pixel drawing space for a picture measured on the quad (x0, y0, w, h)
function frameSpace(cs, W, H, x0, y0, w, h) { for (const c of cs) { c.save(); c.scale(W / w, H / h); c.translate(-x0, -y0); } }
function done(cs) { for (const c of cs) c.restore(); }

// ------------------------------------------------------------------ the left shelving unit (take I/J "GL", 45.00:
// x 315..685, y -126..695): posts, an upper board with cables hanging over it, the top shelf with a flat device, the
// synth with its display, knobs and keys, a lower shelf with cables hanging, a lit box and a small box at the bottom
export function shelfC(g, q, W, H) {
  const r = rng(273);
  frameSpace([g, q], W, H, 315, -126, 370, 821);
  g.fillStyle = G(0.04); g.fillRect(300, -140, 400, 860);
  // back boards: faint vertical grain in the dark
  scratch(g, r, [[356, -126], [662, -126], [662, 700], [356, 700]], { n: 260, a: Math.PI / 2, v: [0.07, 0.2], w: [0.7, 1.8], len: [20, 90] });
  // the upper board (seen from below), receding up-left
  plank(g, q, r, [[500, 10], [662, 128], [662, 150], [500, 34]], 0.42, { n: 26 });
  // cables hanging over the top shelf from above
  rope(g, [[372, 60], [360, 110], [372, 160], [410, 196], [446, 186], [470, 226]], 7, 0.5);
  rope(g, [[396, 80], [424, 130], [414, 186], [452, 222], [474, 214]], 6, 0.45);
  rope(g, [[466, 40], [498, 130], [478, 196], [512, 238], [540, 232]], 6, 0.5);
  rope(g, [[420, 70], [440, 100], [470, 110], [500, 150], [520, 200], [555, 222]], 5, 0.42);
  rope(g, [[500, -40], [504, 90], [512, 230], [522, 330], [528, 366]], 5, 0.55);
  g.fillStyle = G(0.75); g.fillRect(521, 360, 15, 22); q.strokeStyle = inkW(0.8); q.lineWidth = 1.4; q.strokeRect(521, 360, 15, 22);
  // the top shelf: its top surface, then the thick front, slanting down to the right
  g.fillStyle = G(0.72); poly(g, [[362, 150], [660, 292], [660, 304], [362, 162]]); g.fill();
  plank(g, q, r, [[362, 162], [660, 304], [660, 338], [362, 197]], 0.62, { n: 46 });
  // a flat device on it, with cables
  g.fillStyle = G(0.72); poly(g, [[528, 204], [646, 258], [646, 270], [528, 216]]); g.fill();
  plank(g, q, r, [[528, 216], [646, 270], [646, 292], [528, 238]], 0.4, { n: 14 });
  for (let i = 0; i < 5; i++) knob(g, q, 548 + i * 20, 232 + i * 9, 3.2, 0.1);
  // the synth: a dark casing whose panel slopes down to the right, a display, buttons, knobs, the keybed
  const panel = [[362, 344], [602, 388], [660, 468], [362, 452]];
  g.fillStyle = G(0.24); poly(g, panel); g.fill();
  scratch(g, r, panel, { n: 60, a: 0.18, v: [0.1, 0.5], w: [0.8, 2.0], len: [20, 110] });
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.8; poly(q, panel); q.stroke();
  g.strokeStyle = G(0.85); g.lineWidth = 2.5; g.beginPath(); g.moveTo(362, 345); g.lineTo(602, 389); g.lineTo(660, 468); g.stroke();
  const disp = [[394, 366], [470, 378], [470, 418], [394, 406]];
  g.fillStyle = G(0.7); poly(g, disp); g.fill();
  scratch(g, r, disp, { n: 10, a: 0.16, v: [0.5, 0.95], w: [0.8, 1.6], len: [20, 60] });
  q.strokeStyle = inkW(0.9); q.lineWidth = 2.2; poly(q, disp); q.stroke();
  for (let i = 0; i < 6; i++) { g.fillStyle = G(0.8); g.fillRect(396 + i * 13, 424 + i * 2.2, 9, 6); q.strokeStyle = inkW(0.7); q.lineWidth = 1; q.strokeRect(396 + i * 13, 424 + i * 2.2, 9, 6); }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) knob(g, q, 492 + i * 22 + j * 4, 392 + j * 20 + i * 4, 6.5, 0.1);
  // the keys, slanting down to the right, dark lip below
  const K0 = [364, 458], K1 = [654, 520], kd = 40, nk = 26;
  g.fillStyle = G(0.88); poly(g, [K0, K1, [K1[0], K1[1] + kd], [K0[0], K0[1] + kd]]); g.fill();
  for (let i = 0; i <= nk; i++) {
    const t = i / nk, x = K0[0] + (K1[0] - K0[0]) * t, y = K0[1] + (K1[1] - K0[1]) * t;
    g.strokeStyle = G(0.2); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + kd); g.stroke();
    const m = i % 7;
    if (i < nk && m !== 2 && m !== 6) { const dx = (K1[0] - K0[0]) / nk, dy = (K1[1] - K0[1]) / nk; g.fillStyle = G(0.08); poly(g, [[x + dx * 0.65, y + dy * 0.65], [x + dx * 1.3, y + dy * 1.3], [x + dx * 1.3 - 1, y + dy * 1.3 + kd * 0.58], [x + dx * 0.65 - 1, y + dy * 0.65 + kd * 0.58]]); g.fill(); }
  }
  g.fillStyle = G(0.1); poly(g, [[K0[0], K0[1] + kd], [K1[0], K1[1] + kd], [K1[0], K1[1] + kd + 12], [K0[0], K0[1] + kd + 12]]); g.fill();
  // the lower shelf, cables hanging from it
  g.fillStyle = G(0.72); poly(g, [[362, 540], [660, 552], [660, 560], [362, 548]]); g.fill();
  plank(g, q, r, [[362, 548], [660, 560], [660, 592], [362, 584]], 0.6, { n: 40 });
  rope(g, [[506, 588], [516, 624], [548, 654], [590, 646], [606, 606], [620, 590]], 6, 0.5);
  rope(g, [[560, 590], [590, 614], [630, 640], [648, 690]], 5, 0.45);
  rope(g, [[598, 592], [612, 640], [596, 700]], 5, 0.5);
  // at the bottom: the lit box on the left, a small box with a label on the right
  const bx = [[296, 612], [486, 612], [486, 760], [296, 760]];
  g.fillStyle = G(0.84); poly(g, bx); g.fill();
  scratch(g, r, bx, { n: 18, a: Math.PI / 2, v: [0.62, 0.95], w: [0.8, 2], len: [30, 120] });
  g.fillStyle = G(0.95); g.fillRect(296, 610, 190, 5); q.strokeStyle = inkW(0.8); q.lineWidth = 2; poly(q, bx); q.stroke();
  const bx2 = [[486, 654], [654, 654], [654, 760], [486, 760]];
  g.fillStyle = G(0.62); poly(g, bx2); g.fill();
  scratch(g, r, bx2, { n: 16, a: 0, v: [0.4, 0.85], w: [0.8, 1.8], len: [30, 100] });
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.6; poly(q, bx2); q.stroke(); q.strokeRect(598, 666, 40, 32);
  // posts: a dark edge at the far left, the lit left post, the lit right post, streaked along their length
  scratch(g, r, [[300, -126], [328, -126], [328, 700], [300, 700]], { n: 30, a: Math.PI / 2, v: [0.1, 0.35], w: [0.8, 2], len: [40, 200] });
  plank(g, q, r, [[328, -130], [357, -130], [357, 704], [328, 704]], 0.74, { a: Math.PI / 2, n: 34, len: [60, 300], dark: false });
  plank(g, q, r, [[659, -130], [690, -130], [690, 704], [659, 704]], 0.78, { a: Math.PI / 2, n: 36, len: [60, 300], dark: false });
  done([g, q]);
}

// ------------------------------------------------------------------ the right shelving unit (take I/J "GR", 45.00:
// x 1573..1885, y -4..661): the lit left post, the top board under the monitor, a small deck on the main tape deck, a
// board, the cubby of coiled cables, a thin board, a small device with a knob and hanging cables, the bottom board,
// the lit right post, the dark gap and the speaker cabinet's lit edge
export function shelfD(g, q, W, H) {
  const r = rng(274);
  frameSpace([g, q], W, H, 1573, -4, 312, 665);
  g.fillStyle = G(0.04); g.fillRect(1560, -20, 340, 700);
  scratch(g, r, [[1588, -4], [1770, -4], [1770, 661], [1588, 661]], { n: 200, a: Math.PI / 2, v: [0.07, 0.22], w: [0.7, 1.8], len: [15, 70] });
  // top board of the unit (under the monitor), rising to the right
  g.fillStyle = G(0.72); poly(g, [[1586, 142], [1770, 54], [1770, 62], [1586, 150]]); g.fill();
  plank(g, q, r, [[1586, 150], [1770, 62], [1770, 96], [1586, 182]], 0.64, { n: 34 });
  // the small deck on top of the main deck
  const sd = [[1664, 168], [1770, 128], [1770, 176], [1664, 214]];
  g.fillStyle = G(0.82); poly(g, [[1664, 158], [1770, 118], [1770, 128], [1664, 168]]); g.fill();
  plank(g, q, r, sd, 0.6, { n: 14, dark: false });
  g.fillStyle = G(0.1); poly(g, [[1680, 180], [1735, 160], [1735, 172], [1680, 192]]); g.fill();
  // the main tape deck: a lit top, a slanted front with a cassette window, buttons and a meter
  g.fillStyle = G(0.85); poly(g, [[1606, 244], [1770, 162], [1770, 172], [1606, 254]]); g.fill();
  const md = [[1606, 254], [1770, 172], [1770, 312], [1606, 362]];
  plank(g, q, r, md, 0.66, { n: 30, dark: false });
  const win = [[1644, 282], [1716, 250], [1716, 290], [1644, 322]];
  g.fillStyle = G(0.1); poly(g, win); g.fill(); q.strokeStyle = inkW(0.9); q.lineWidth = 2; poly(q, win); q.stroke();
  g.fillStyle = G(0.6); for (const f of [0.28, 0.72]) { g.beginPath(); g.ellipse(1644 + 72 * f, 286 - 32 * f + 20, 6, 8, 0, 0, TAU); g.fill(); }
  for (let i = 0; i < 4; i++) { g.fillStyle = G(0.85); g.fillRect(1611, 272 + i * 17, 13, 8); q.strokeStyle = inkW(0.8); q.lineWidth = 1.2; q.strokeRect(1611, 272 + i * 17, 13, 8); }
  for (let i = 0; i < 4; i++) { g.fillStyle = G(0.15); g.fillRect(1726 + i * 10, 204 - i * 5, 7, 6); }
  g.strokeStyle = G(0.15); g.lineWidth = 1.6; g.beginPath(); g.moveTo(1606, 270); g.lineTo(1770, 188); g.stroke();
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.6; poly(q, md); q.stroke();
  // the board under the deck
  g.fillStyle = G(0.75); poly(g, [[1592, 342], [1770, 312], [1770, 320], [1592, 350]]); g.fill();
  plank(g, q, r, [[1592, 350], [1770, 320], [1770, 360], [1592, 394]], 0.62, { n: 36 });
  // the cubby of coiled cables
  coil(g, r, 1690, 448, 62, 36, 8, 5.5, 0.52);
  // a thin board under the coils
  plank(g, q, r, [[1608, 494], [1770, 490], [1770, 512], [1608, 518]], 0.5, { n: 18 });
  // a small device with a round knob, cables hanging past it
  const dv = [[1608, 530], [1700, 530], [1700, 632], [1608, 632]];
  g.fillStyle = G(0.52); poly(g, dv); g.fill();
  scratch(g, r, dv, { n: 18, a: Math.PI / 2, v: [0.3, 0.8], w: [0.8, 1.8], len: [20, 70] });
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.6; poly(q, dv); q.stroke();
  knob(g, q, 1634, 580, 15, 0.7);
  g.strokeStyle = G(0.1); g.lineWidth = 2; g.beginPath(); g.ellipse(1634, 580, 15, 15, 0, 0, TAU); g.stroke();
  rope(g, [[1680, 500], [1692, 560], [1668, 610], [1690, 660]], 5, 0.5);
  rope(g, [[1740, 505], [1752, 580], [1736, 640], [1748, 680]], 4.5, 0.5);
  rope(g, [[1720, 500], [1706, 540], [1728, 600], [1712, 640]], 4, 0.45);
  // the bottom board, running out past the left post
  g.fillStyle = G(0.78); poly(g, [[1550, 616], [1770, 640], [1770, 648], [1550, 624]]); g.fill();
  plank(g, q, r, [[1550, 624], [1770, 648], [1770, 680], [1550, 664]], 0.66, { n: 40 });
  // posts
  plank(g, q, r, [[1565, 150], [1588, 150], [1588, 664], [1565, 664]], 0.76, { a: Math.PI / 2, n: 26, len: [50, 240], dark: false });
  plank(g, q, r, [[1770, -10], [1801, -10], [1801, 670], [1770, 670]], 0.8, { a: Math.PI / 2, n: 40, len: [60, 300], dark: false });
  // the dark gap: the speaker cabinet's side, dark wood grain; its lit front edge
  scratch(g, r, [[1801, -10], [1840, -10], [1840, 670], [1801, 670]], { n: 60, a: Math.PI / 2, v: [0.1, 0.35], w: [0.8, 2.2], len: [40, 200] });
  plank(g, q, r, [[1838, 215], [1860, 205], [1860, 670], [1838, 670]], 0.7, { a: Math.PI / 2, n: 16, len: [60, 200], dark: false });
  scratch(g, r, [[1860, 200], [1890, 190], [1890, 670], [1860, 670]], { n: 30, a: Math.PI / 2, v: [0.15, 0.45], w: [0.8, 2], len: [40, 160] });
  done([g, q]);
}

// ------------------------------------------------------------------ the CRT monitor on top of the right shelving
// (take I/J "GM", 45.00: x 1575..1762, y -116..122): a lit casing streaked along its form, the dark screen, the lower
// bezel rising to the right, the dark right side
export function monitor(g, q, W, H) {
  const r = rng(275);
  frameSpace([g, q], W, H, 1575, -116, 187, 238);
  g.fillStyle = G(0.1); g.fillRect(1560, -130, 220, 270);
  const cas = [[1575, -116], [1740, -116], [1762, 30], [1592, 126], [1575, 126]];
  g.fillStyle = G(0.72); poly(g, cas); g.fill();
  scratch(g, r, cas, { n: 40, a: -0.5, v: [0.5, 0.95], w: [0.8, 2], len: [20, 90] });
  const scr = [[1592, -116], [1728, -116], [1732, 28], [1604, 86], [1594, 70]];
  g.fillStyle = G(0.07); poly(g, scr); g.fill();
  scratch(g, r, scr, { n: 26, a: -0.7, v: [0.1, 0.3], w: [0.8, 2], len: [20, 70] });
  g.fillStyle = G(0.35); g.globalAlpha = 0.5; poly(g, [[1600, -60], [1640, -116], [1660, -116], [1606, -30]]); g.fill(); g.globalAlpha = 1;
  q.strokeStyle = inkW(0.9); q.lineWidth = 2.4; poly(q, scr); q.stroke();
  // the bezel's lower edge and its thickness, the casing's dark right side
  g.strokeStyle = G(0.95); g.lineWidth = 2.5; g.beginPath(); g.moveTo(1594, 118); g.lineTo(1760, 26); g.stroke();
  g.fillStyle = G(0.25); poly(g, [[1740, -116], [1762, -116], [1762, 30], [1745, 38]]); g.fill();
  scratch(g, r, [[1740, -116], [1762, -116], [1762, 30], [1745, 38]], { n: 10, a: Math.PI / 2, v: [0.1, 0.4], w: [0.8, 1.6], len: [30, 100] });
  for (let i = 0; i < 3; i++) { g.fillStyle = G(0.2); g.beginPath(); g.arc(1640 + i * 14, 94 - i * 8, 2.5, 0, TAU); g.fill(); }
  q.strokeStyle = inkW(0.8); q.lineWidth = 2; poly(q, cas); q.stroke();
  done([g, q]);
}

// ------------------------------------------------------------------ the speaker front, in the face's uv (canvas y down):
// ring centre (cx, cy), radii (rx, ry) as fractions of the picture. A dark wood cabinet with vertical grain, a recessed
// front bevel, screws; the metal frame ring (lit, dark keylines, screws), the dark rubber surround, a MID-GREY cone
// swirled with lit concentric strokes, lighter toward the lower left, and a small dark glossy dust cap (0.3 of the ring)
// with one highlight
export function speaker({ cx, cy, rx, ry, seed = 81 }) {
  return (g, q, W, H) => {
    const r = rng(seed);
    g.fillStyle = G(0.2); g.fillRect(0, 0, W, H);
    scratch(g, r, [[0, 0], [W, 0], [W, H], [0, H]], { n: 220, a: Math.PI / 2, v: [0.08, 0.45], w: [0.8, 2.6], len: [H * 0.08, H * 0.5], ja: 0.02 });
    // the front bevel (lit) and its dark inner line, screws at the corners
    g.strokeStyle = G(0.62); g.lineWidth = W * 0.012; g.strokeRect(W * 0.03, H * 0.03, W * 0.94, H * 0.94);
    g.strokeStyle = G(0.04); g.lineWidth = W * 0.008; g.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
    const X = cx * W, Y = cy * H, RX = rx * W, RY = ry * H;
    g.save(); g.translate(X, Y); g.scale(1, RY / RX);
    const R = RX;
    // outer gasket (dark), the lit metal frame, its keylines and screws
    g.fillStyle = G(0.05); g.beginPath(); g.arc(0, 0, R * 1.02, 0, TAU); g.fill();
    g.fillStyle = G(0.66); g.beginPath(); g.arc(0, 0, R * 0.985, 0, TAU); g.fill();
    for (let i = 0; i < 70; i++) { const a0 = r() * TAU, rr = R * (0.88 + 0.1 * r()); g.strokeStyle = G(0.4 + 0.55 * r()); g.lineWidth = 0.8 + r() * 1.8; g.beginPath(); g.arc(0, 0, rr, a0, a0 + 0.3 + r() * 0.9); g.stroke(); }
    g.strokeStyle = G(0.06); g.lineWidth = R * 0.02; g.beginPath(); g.arc(0, 0, R * 0.985, 0, TAU); g.stroke();
    g.lineWidth = R * 0.016; g.beginPath(); g.arc(0, 0, R * 0.88, 0, TAU); g.stroke();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5; knob(g, q, Math.cos(a) * R * 0.935, Math.sin(a) * R * 0.935, R * 0.028, 0.06); }
    // the rubber surround: a dark roll with a faint sheen on its upper left
    g.fillStyle = G(0.05); g.beginPath(); g.arc(0, 0, R * 0.87, 0, TAU); g.fill();
    g.strokeStyle = G(0.4); g.lineWidth = R * 0.03; g.beginPath(); g.arc(0, 0, R * 0.82, Math.PI * 0.95, Math.PI * 1.6); g.stroke();
    g.strokeStyle = G(0.28); g.lineWidth = R * 0.02; g.beginPath(); g.arc(0, 0, R * 0.82, Math.PI * 0.1, Math.PI * 0.6); g.stroke();
    // the cone: mid grey, lighter to the lower left, darker toward the cap and the upper right
    const cg = g.createRadialGradient(-R * 0.3, R * 0.3, R * 0.05, 0, 0, R * 0.78);
    cg.addColorStop(0, G(0.62)); cg.addColorStop(0.55, G(0.42)); cg.addColorStop(1, G(0.22));
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R * 0.77, 0, TAU); g.fill();
    // swirl: lit concentric strokes, denser and brighter on the lit (lower left) side, a few dark ones
    g.lineCap = "round";
    for (let i = 0; i < 150; i++) {
      const rr = R * (0.3 + 0.46 * r()), a0 = r() * TAU, da = 0.25 + r() * 0.9;
      const lit = 0.5 + 0.5 * Math.cos(a0 + da / 2 - Math.PI * 0.75);
      const dark = r() < 0.25;
      g.strokeStyle = dark ? G(0.1 + 0.1 * r()) : G(0.45 + 0.5 * lit * r() + 0.1);
      g.lineWidth = 0.8 + r() * 2.2;
      g.globalAlpha = dark ? 0.6 : 0.5 + 0.5 * lit;
      g.beginPath(); g.arc(0, 0, rr, a0, a0 + da); g.stroke();
    }
    g.globalAlpha = 1;
    // a shadow ring round the cap
    g.strokeStyle = G(0.12); g.lineWidth = R * 0.05; g.beginPath(); g.arc(0, 0, R * 0.33, 0, TAU); g.stroke();
    // dust cap: dark and glossy, one highlight upper left
    const dg = g.createRadialGradient(-R * 0.08, -R * 0.08, R * 0.02, 0, 0, R * 0.29);
    dg.addColorStop(0, G(0.35)); dg.addColorStop(0.5, G(0.12)); dg.addColorStop(1, G(0.04));
    g.fillStyle = dg; g.beginPath(); g.arc(0, 0, R * 0.29, 0, TAU); g.fill();
    g.fillStyle = G(0.95); g.beginPath(); g.ellipse(-R * 0.1, -R * 0.12, R * 0.07, R * 0.05, -0.6, 0, TAU); g.fill();
    g.strokeStyle = G(0.5); g.lineWidth = R * 0.012; g.beginPath(); g.arc(0, 0, R * 0.27, Math.PI * 0.1, Math.PI * 0.7); g.stroke();
    g.restore();
    // screws on the cabinet front
    for (const [u, v] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) knob(g, q, u * W, v * H, W * 0.012, 0.08);
  };
}

// ------------------------------------------------------------------ a keyboard seen from above (u along its length,
// v across: canvas y 0..0.36 the control strip, then the keys). The strip is a dark casing with a column of small
// buttons, a pale display window, four knobs and a second small window (not repeating bars); ~24 white keys (a white key ~36 px across at 45.40), soft
// greys (0.84 / 0.12), a dark lip along the keys' front edge
export function keys(g, q, W, H) {
  const r = rng(276);
  const py = H * 0.36;
  g.fillStyle = G(0.14); g.fillRect(0, 0, W, H);
  g.fillStyle = G(0.2); g.fillRect(0, 0, W, py);
  scratch(g, r, [[0, 0], [W, 0], [W, py], [0, py]], { n: 90, a: 0, v: [0.1, 0.42], w: [0.8, 2], len: [30, 180] });
  // small buttons in two rows near the top end
  for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) {
    const x = W * 0.03 + i * W * 0.022, y = py * (0.2 + j * 0.38);
    g.fillStyle = G(0.06); g.fillRect(x, y, W * 0.014, py * 0.22);
    g.fillStyle = G(0.6); g.fillRect(x, y, W * 0.014, 2);
  }
  // the display window
  g.fillStyle = G(0.72); g.fillRect(W * 0.24, py * 0.18, W * 0.13, py * 0.6);
  scratch(g, r, [[W * 0.24, py * 0.18], [W * 0.37, py * 0.18], [W * 0.37, py * 0.78], [W * 0.24, py * 0.78]], { n: 12, a: 0, v: [0.5, 0.95], w: [0.8, 1.6], len: [20, 80] });
  q.strokeStyle = inkW(0.85); q.lineWidth = 2.5; q.strokeRect(W * 0.24, py * 0.18, W * 0.13, py * 0.6);
  for (let i = 0; i < 4; i++) knob(g, q, W * (0.45 + i * 0.035), py * 0.48, py * 0.16, 0.1);
  g.fillStyle = G(0.6); g.fillRect(W * 0.66, py * 0.3, W * 0.06, py * 0.36); q.strokeStyle = inkW(0.8); q.lineWidth = 2; q.strokeRect(W * 0.66, py * 0.3, W * 0.06, py * 0.36);
  g.fillStyle = G(0.55); g.fillRect(0, py - 3, W, 3);
  // keys
  const n = 24, x0 = W * 0.02, x1 = W * 0.985, kw = (x1 - x0) / n, ky = py + 5, kh = H - ky - 12;
  g.fillStyle = G(0.84); g.fillRect(x0, ky, x1 - x0, kh);
  for (let i = 0; i < n; i++) { g.fillStyle = G(0.74 + 0.1 * r()); g.fillRect(x0 + i * kw + 1, ky + kh * 0.62, kw - 2, kh * 0.38); }
  g.strokeStyle = G(0.2); g.lineWidth = 2;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(x0 + i * kw, ky); g.lineTo(x0 + i * kw, ky + kh); g.stroke(); }
  for (let i = 0; i < n - 1; i++) {
    const m = i % 7; if (m === 2 || m === 6) continue;
    const bx = x0 + (i + 0.68) * kw, bw = kw * 0.64;
    g.fillStyle = G(0.12); g.fillRect(bx, ky, bw, kh * 0.58);
    g.fillStyle = G(0.4); g.fillRect(bx + bw * 0.15, ky + kh * 0.46, bw * 0.7, kh * 0.06);
  }
  g.fillStyle = G(0.1); g.fillRect(0, H - 12, W, 12); g.fillRect(0, py, x0, H - py); g.fillRect(x1, py, W - x1, H - py);
  q.strokeStyle = inkW(0.8); q.lineWidth = 3; q.strokeRect(2, 2, W - 4, H - 4);
}

// ------------------------------------------------------------------ take H's gear wall (RK quad at 44.08: x -60..600,
// y -60..560), dark gear seen at a steep angle receding to the right (vanishing point ~(620, 350)): the near wall of
// gear (x 0..300) dark with heavy white strokes converging on the vanishing point, stacked units above with lit frame
// edges and small panels, the angled synth box with its lit top, a cable loop hanging at the right, black beyond
export function rackE(g, q, W, H) {
  const r = rng(277);
  const VP = [640, 350];
  frameSpace([g, q], W, H, -60, -60, 660, 620);
  g.fillStyle = G(0.03); g.fillRect(-80, -80, 700, 660);
  // the near wall: dark, with converging strokes, darker plank divisions
  const wall = [[-60, -60], [300, -60], [300, 560], [-60, 560]];
  g.fillStyle = G(0.16); poly(g, wall); g.fill();
  scratch(g, r, wall, { n: 520, vp: VP, v: [0.2, 0.62], w: [0.8, 2.6], len: [40, 220], ja: 0.04 });
  for (const x of [60, 150, 225, 290]) { g.fillStyle = G(0.05); g.globalAlpha = 0.6; g.fillRect(x, -60, 6 + r() * 6, 620); }
  g.globalAlpha = 1;
  // the gear zone beyond the wall is packed with dark hatched devices, not black gaps between them
  const zone = [[300, -60], [560, -60], [600, 160], [600, 540], [300, 540]];
  g.fillStyle = G(0.12); poly(g, zone); g.fill();
  scratch(g, r, zone, { n: 260, vp: VP, v: [0.16, 0.5], w: [0.8, 2.2], len: [20, 120], ja: 0.05 });
  // stacked units above: dark fronts with lit frame edges, small panels
  const unit = (pts, v) => {
    g.fillStyle = G(v); poly(g, pts); g.fill();
    scratch(g, r, pts, { n: 50, vp: VP, v: [v * 0.6, Math.min(0.9, v + 0.4)], w: [0.8, 2.2], len: [20, 110] });
    g.strokeStyle = G(0.75); g.lineWidth = 2.6; poly(g, pts); g.stroke();
    q.strokeStyle = inkW(0.6); q.lineWidth = 1.2; poly(q, pts); q.stroke();
  };
  unit([[300, -60], [430, -60], [430, 150], [300, 175]], 0.22);
  unit([[350, 60], [428, 50], [428, 150], [350, 165]], 0.3);
  unit([[330, 180], [440, 160], [440, 330], [330, 350]], 0.24);
  unit([[440, 100], [540, 120], [540, 330], [440, 330]], 0.2);
  // small lit-framed screens and knobs on the units
  for (const [x, y, w, h] of [[452, 132, 40, 44], [452, 190, 40, 42], [498, 140, 30, 60], [350, 196, 60, 30], [352, 240, 36, 60]]) {
    g.fillStyle = G(0.12); g.fillRect(x, y, w, h); g.strokeStyle = G(0.8); g.lineWidth = 2.2; g.strokeRect(x, y, w, h);
    scratch(g, r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { n: 6, vp: VP, v: [0.3, 0.7], w: [0.8, 1.4], len: [10, 30] });
  }
  for (let i = 0; i < 4; i++) knob(g, q, 470 + i * 16, 290 - i * 3, 4, 0.1);
  knob(g, q, 480, 290, 6, 0.85);
  // the angled synth box: lit top face, a dark front with white strokes, keys along the top's front edge
  const top = [[360, 336], [498, 390], [578, 478], [424, 438]];
  g.fillStyle = G(0.4); poly(g, top); g.fill();
  scratch(g, r, top, { n: 40, a: 0.5, v: [0.25, 0.8], w: [0.8, 2], len: [20, 120] });
  g.strokeStyle = G(0.92); g.lineWidth = 2.5; poly(g, top); g.stroke();
  const front = [[424, 438], [578, 478], [580, 520], [414, 528]];
  g.fillStyle = G(0.2); poly(g, front); g.fill();
  scratch(g, r, front, { n: 34, a: 0.15, v: [0.3, 0.8], w: [0.8, 2.2], len: [20, 110] });
  q.strokeStyle = inkW(0.85); q.lineWidth = 2; poly(q, top); q.stroke(); poly(q, front); q.stroke();
  for (let i = 0; i <= 12; i++) { const t = i / 12, x = 430 + 140 * t, y = 440 + 36 * t; g.strokeStyle = G(0.15); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x - 6, y - 2); g.stroke(); }
  // under the synth, dark shelf shadow down to the box top (y ~540)
  scratch(g, r, [[300, 520], [600, 520], [600, 560], [300, 560]], { n: 30, vp: VP, v: [0.08, 0.3], w: [0.8, 2], len: [30, 120] });
  // a cable loop hanging at the right edge (white-edged rope)
  for (const [cx, cy, rx, ry, a] of [[592, 262, 30, 80, 0.1], [600, 270, 24, 70, -0.05], [586, 250, 22, 60, 0.2]]) {
    const pts = []; for (let j = 0; j <= 16; j++) { const t = (j / 16) * TAU; pts.push([cx + Math.cos(t) * rx * Math.cos(a) - Math.sin(t) * ry * Math.sin(a), cy + Math.cos(t) * rx * Math.sin(a) + Math.sin(t) * ry * Math.cos(a)]); }
    g.strokeStyle = G(0.85); g.lineWidth = 6; curve(g, pts); g.stroke();
    g.strokeStyle = G(0.18); g.lineWidth = 3; curve(g, pts); g.stroke();
  }
  rope(g, [[560, 180], [572, 150], [600, 150], [610, 180]], 4, 0.5);
  done([g, q]);
}

// ------------------------------------------------------------------ take D's gear shelving on the left (the "SH" face,
// 42.36-42.64), laid out on its quad at 42.52 (x 165..618, y -60..805) from the source strip 42.36-42.60: cables draped
// over the top board (y ~140-200), the synth with its display, knobs and keys (y ~280-460), a board (y ~480-530),
// cables hanging below it, a small CRT monitor and a small box on the bottom shelf, lit posts at both edges
export function shelfK(g, q, W, H) {
  const r = rng(278);
  frameSpace([g, q], W, H, 165, -60, 453, 865);
  // (the source's interior here is a mid-dark grey, not black)
  g.fillStyle = G(0.17); g.fillRect(150, -80, 480, 900);
  scratch(g, r, [[180, -60], [602, -60], [602, 805], [180, 805]], { n: 320, a: Math.PI / 2, v: [0.08, 0.36], w: [0.7, 2], len: [20, 110] });
  // cables draped over the top board, hanging down in front of it
  rope(g, [[210, -60], [220, 40], [250, 120], [290, 150], [320, 110], [330, 40]], 7, 0.45);
  rope(g, [[300, -60], [330, 60], [380, 150], [420, 170], [450, 120], [440, 40]], 7, 0.5);
  rope(g, [[400, -40], [430, 70], [470, 140], [520, 160], [560, 110], [570, 20]], 6, 0.45);
  rope(g, [[250, 0], [270, 90], [262, 190], [280, 250]], 5, 0.5);
  g.fillStyle = G(0.72); poly(g, [[170, 135], [615, 115], [615, 125], [170, 145]]); g.fill();
  plank(g, q, r, [[170, 145], [615, 125], [615, 185], [170, 205]], 0.6, { n: 44 });
  // the synth: dark casing sloping toward us, display, buttons, knobs; keys along its front
  const panel = [[176, 282], [560, 276], [612, 372], [176, 396]];
  g.fillStyle = G(0.22); poly(g, panel); g.fill();
  scratch(g, r, panel, { n: 60, a: 0, v: [0.1, 0.45], w: [0.8, 2], len: [20, 110] });
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.8; poly(q, panel); q.stroke();
  g.strokeStyle = G(0.8); g.lineWidth = 2.5; g.beginPath(); g.moveTo(176, 283); g.lineTo(560, 277); g.lineTo(612, 372); g.stroke();
  const disp = [[200, 300], [300, 298], [300, 338], [200, 340]];
  g.fillStyle = G(0.62); poly(g, disp); g.fill(); q.strokeStyle = inkW(0.9); q.lineWidth = 2.2; poly(q, disp); q.stroke();
  for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) knob(g, q, 330 + i * 30, 305 + j * 30, 8, 0.1);
  for (let i = 0; i < 5; i++) { g.fillStyle = G(0.75); g.fillRect(205 + i * 18, 352, 12, 8); }
  const K0 = [178, 398], K1 = [612, 376], kd = 50, nk = 22;
  g.fillStyle = G(0.86); poly(g, [K0, K1, [K1[0], K1[1] + kd], [K0[0], K0[1] + kd]]); g.fill();
  for (let i = 0; i <= nk; i++) {
    const t = i / nk, x = K0[0] + (K1[0] - K0[0]) * t, y = K0[1] + (K1[1] - K0[1]) * t;
    g.strokeStyle = G(0.2); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + kd); g.stroke();
    const m = i % 7;
    if (i < nk && m !== 2 && m !== 6) { const dx = (K1[0] - K0[0]) / nk, dy = (K1[1] - K0[1]) / nk; g.fillStyle = G(0.08); poly(g, [[x + dx * 0.65, y + dy * 0.65], [x + dx * 1.3, y + dy * 1.3], [x + dx * 1.3, y + dy * 1.3 + kd * 0.58], [x + dx * 0.65, y + dy * 0.65 + kd * 0.58]]); g.fill(); }
  }
  g.fillStyle = G(0.1); poly(g, [[K0[0], K0[1] + kd], [K1[0], K1[1] + kd], [K1[0], K1[1] + kd + 12], [K0[0], K0[1] + kd + 12]]); g.fill();
  // the board under the synth, cables hanging from it
  g.fillStyle = G(0.72); poly(g, [[170, 474], [615, 464], [615, 472], [170, 482]]); g.fill();
  plank(g, q, r, [[170, 482], [615, 472], [615, 515], [170, 528]], 0.58, { n: 40 });
  rope(g, [[330, 520], [340, 580], [380, 640], [430, 650], [460, 610], [470, 560]], 6, 0.45);
  rope(g, [[400, 518], [420, 600], [470, 660], [520, 640], [530, 590]], 5, 0.5);
  // the bottom shelf: a small CRT monitor (lit casing, dark screen) and a small lit box with a slot
  const crt = [[204, 628], [402, 628], [402, 812], [204, 812]];
  g.fillStyle = G(0.72); poly(g, crt); g.fill();
  scratch(g, r, crt, { n: 20, a: 0, v: [0.5, 0.95], w: [0.8, 1.8], len: [20, 80] });
  g.fillStyle = G(0.08); poly(g, [[226, 648], [380, 648], [376, 780], [230, 780]]); g.fill();
  q.strokeStyle = inkW(0.85); q.lineWidth = 2.2; poly(q, crt); q.stroke(); poly(q, [[226, 648], [380, 648], [376, 780], [230, 780]]); q.stroke();
  const bx = [[410, 622], [580, 622], [580, 782], [410, 782]];
  g.fillStyle = G(0.74); poly(g, bx); g.fill();
  scratch(g, r, bx, { n: 16, a: Math.PI / 2, v: [0.5, 0.95], w: [0.8, 1.8], len: [20, 90] });
  q.strokeStyle = inkW(0.8); q.lineWidth = 1.8; poly(q, bx); q.stroke(); q.strokeRect(500, 640, 30, 40);
  g.fillStyle = G(0.72); poly(g, [[165, 786], [618, 786], [618, 794], [165, 794]]); g.fill();
  plank(g, q, r, [[165, 794], [618, 794], [618, 830], [165, 830]], 0.6, { n: 30 });
  // posts
  plank(g, q, r, [[150, -80], [180, -80], [180, 830], [150, 830]], 0.72, { a: Math.PI / 2, n: 34, len: [60, 300], dark: false });
  plank(g, q, r, [[602, -80], [632, -80], [632, 830], [602, 830]], 0.78, { a: Math.PI / 2, n: 34, len: [60, 300], dark: false });
  done([g, q]);
}
