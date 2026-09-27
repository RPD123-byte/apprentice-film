// s16 owl: one drawing per source frame where the owl's drawing changes (./data/owl.js, measured by
// src/shots/s16/trace/owl3.py; geometry and a few measured values only). Each drawing is built from authored parts:
//   sil  the measured silhouette (smoothed), a soft 0.6 px edge
//   G    the plumage's light: a coarse value study (8 px grid, <= 8 levels), upsampled and blurred, then a matte print
//        texture on it: seeded fine grain and stipple, denser toward the shaded underside (no smooth airbrushed grey)
//   HP   the headphones (fix 2): the dark shape (the black gap between band and head), the band as a soft grey bar
//        along its measured centre-lines (./data/band.js), each near cup shaded per pixel as a cylinder seen from the
//        side (./owlparts.js drawCup2), poorly fitted far cups as a dark sliver, left out, or (1143) cut out of the owl
//   feet (fix 2): the near foot as a three-toe template placed per drawing, the far foot's toes traced (./data/feet.js)
//   the bandage (fix 2): two overlapping pale ovals, read off 3x grids per frame (./owlparts.js PLASTER)
//   N    the small dark parts (the notches between feathers, the talons, the beak's shade) as tapered ink strokes
//   S    thin ink lines (measured centre-lines, redrawn tapered), KL small light shapes (C, the "cable", is not drawn)
//   E    eyes, drawn from fitted ellipses (glossy flight eyes; the seated owl's dazed rings with pin pupils)
//   O    the seated owl's inked outline; SEAT its authored parts (./owlparts.js)
// Drawings 1143–1163 are in frame px (the flight, measured with the camera in them); the seated owl (measured on
// 1175) is in plate px and is drawn under the room's camera for 1165–1192.
import { grey } from "../../lib/engrave.js";
import { rng } from "../../lib/rng.js";
import { drawStrokes } from "./room.js";
import { OWL } from "./data/owl.js";
import { drawCupSliver, drawCup2, drawPlaster, drawSeatParts } from "./owlparts.js";
import { BAND, CUPM, HLKEEP } from "./data/band.js";
import { FEET } from "./data/feet.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

// fix 2: how each far cup (flagged cp[10] = 1: its ellipse fit is poor) is drawn, from the source's mean value inside
// its ellipse (snapshots/s16-fix2-tools, see fidelity/s16.md): on the black above the head (mean < 0.2) it is the
// band's top, drawn by the band; behind the head (1144, 1150, 1158) a thin dark sliver inside the headphone shape;
// on 1143 it lies over his hair: cut out of the owl (the room shows) with a thin dark arc at the head's edge.
const FARCUP = { "1143:1": "cut", "1144:0": "none", "1144:1": "sliver", "1150:0": "sliver", "1157:0": "none", "1158:0": "none", "1158:1": "sliver" };
const cupKind = (id, i, cp) => FARCUP[`${id}:${i}`] || (cp[10] === 1 ? "sliver" : "cup");

// source frame -> drawing (frame whose drawing it is)
export function owlDrawingOf(F) {
  if (F === 1146) return 1145;        // held for two frames
  if (F === 1164) return 1163;
  if (F >= 1165) return 1175;         // the seated, dazed owl
  return Math.max(1143, F);
}
export const inPlatePx = (F) => F >= 1165;

export const TUNE = { gsoft: 3.0, feather: 0.8, grain: 0.035, stip: 0.5, dsoft: 0.35, fluff: 0.45, smoothS: 1, nMin: 7, nCap: 2.5, sdv: 0.0, rim: 0.2, rimW: 3.4, rimBlur: 1.2, owmax: 1.2, bandBlur: 0.9, bandW: 1.0, sliver: 0.34, arcV: 0.14, arcW: 3.5, cutK: 1.3, stripA: 1.0, stripBlur: 7, toeW: 1.0, toeLine: 1.1, toeLineV: 0.42, toeV: 0.95, claw: 3.5, clawV: 0.2, nearR: 1.5 };

function ringPath(g, rings) {
  g.beginPath();
  for (const r of rings) {
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}

// the flying owl's eyes, drawn from their measured ellipses (automatic fits of the dark iris blob, of the thin dark
// ring round the white and of the catchlight): e = [type, iris cx, cy, w, h, deg, sclera cx, cy, w, h, deg, catch x, y, r]
function ell(g, cx, cy, w, h, deg) { g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, (deg * Math.PI) / 180, 0, Math.PI * 2); }
function drawEye16(g, e) {
  const [type, ix, iy, iw, ih, ia, sx, sy, sw, sh, sa, kx, ky, kr] = e;
  if (type === 1) {
    // the seated owl's dazed eye: a thin dark ring round the white, a small pupil with a pin of light
    ell(g, sx, sy, sw, sh, sa); g.fillStyle = grey(0.94); g.fill();
    ell(g, sx, sy, sw, sh, sa); g.strokeStyle = grey(0.2); g.lineWidth = 2.1; g.stroke();
    ell(g, ix, iy, Math.max(3, iw), Math.max(6, ih), ia); g.fillStyle = grey(0.1); g.fill();
    if (kr > 0) { g.beginPath(); g.arc(kx, ky, 1.1, 0, Math.PI * 2); g.fillStyle = grey(0.85); g.fill(); }
    return;
  }
  if (sw > 0) {
    ell(g, sx, sy, sw, sh, sa); g.fillStyle = grey(0.95); g.fill();
    ell(g, sx, sy, sw - 1.0, sh - 1.0, sa); g.strokeStyle = grey(0.2); g.lineWidth = 1.8; g.stroke();
  }
  // the iris: near-black with a dark rim and a soft paler crescent low on the far side
  g.save(); ell(g, ix, iy, iw, ih, ia); g.clip();
  g.fillStyle = grey(0.1); g.fill();
  const r = (iw + ih) / 4;
  const gr = g.createRadialGradient(ix + r * 0.25, iy + r * 0.55, 0, ix + r * 0.25, iy + r * 0.55, r * 0.75);
  gr.addColorStop(0, "rgba(120,120,118,0.3)"); gr.addColorStop(1, "rgba(120,120,118,0)");
  g.fillStyle = gr; g.fillRect(ix - r * 1.2, iy - r * 1.2, r * 2.4, r * 2.4);
  ell(g, ix, iy, iw - 1, ih - 1, ia); g.strokeStyle = grey(0.04); g.lineWidth = 1.6; g.stroke();
  g.restore();
  if (kr > 0) { g.beginPath(); g.arc(kx, ky, Math.max(2.4, kr * 0.95), 0, Math.PI * 2); g.fillStyle = grey(0.97); g.fill(); }
}

// the coarse value study as a small canvas (one pixel per 8 px cell)
function gridCanvas(G) {
  const c = document.createElement("canvas"); c.width = G.nx; c.height = G.ny;
  const g = c.getContext("2d"), img = g.createImageData(G.nx, G.ny);
  for (let i = 0; i < G.nx * G.ny; i++) {
    const v = Math.round(Math.max(0, Math.min(1, G.lv[+G.q[i]])) * 255);
    img.data[4 * i] = v; img.data[4 * i + 1] = v; img.data[4 * i + 2] = v; img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// the matte print: fine seeded grain on the whole plumage (multiplicative, strongest in the mid-greys) and stipple
// specks whose density rises with the shade (pixel ops on the layer's value, seeded per drawing); returns the value
// map before the texture (for the fluff strokes)
function printTexture(g, w, h, seed, amt) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const R = rng(seed);
  const V = new Float32Array(w * h), N = new Float32Array(w * h);
  for (let i = 0; i < N.length; i++) { N[i] = R() - 0.5; V[i] = d[4 * i] / 255; }
  // a little spatial correlation: average with the right / lower neighbour (grain ~1.5 px)
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; N[i] = (N[i] + N[i + 1] + N[i + w]) / 1.8; }
  for (let i = 0; i < w * h; i++) {
    const v = V[i];
    if (v <= 0.02) continue;
    const mid = 0.35 + 0.65 * Math.min(1, 4 * v * (1 - v) + 0.15);
    let o = v * (1 + amt * N[i] * mid);
    const s = 1 - v;
    if (R() < TUNE.stip * 0.08 * s * s + 0.004) o *= 0.8 + 0.1 * R();
    const q = Math.max(0, Math.min(255, Math.round(o * 255)));
    d[4 * i] = q; d[4 * i + 1] = q; d[4 * i + 2] = q;
  }
  g.putImageData(img, 0, 0);
  return V;
}

// fluff: short fine hair strokes a little darker than the plumage (and a few paler ones in the shade), mostly
// running down the body, denser where the plumage is shaded; seeded per drawing
function fluff(g, V, w, h, seed, k) {
  const R = rng(seed * 7 + 3);
  const n = Math.round(w * h * 0.012 * k);
  g.save(); g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, v = V[(y | 0) * w + (x | 0)];
    if (v < 0.35) continue;
    const s = 1 - v;
    if (R() > 0.25 + 2.5 * s) continue;
    const a = Math.PI / 2 + (R() - 0.5) * 1.4, l = 2.5 + R() * 4.5, c = (R() - 0.5) * 0.8;
    const pale = R() < 0.25 * s * 3;
    const dv = pale ? 0.06 + 0.06 * R() : -(0.07 + 0.12 * R()) * (0.5 + s);
    g.strokeStyle = grey(Math.max(0, Math.min(1, v + dv))); g.lineWidth = 0.55 + 0.4 * R();
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + ex) / 2 + Math.cos(a + 1.57) * c * l, (y + ey) / 2 + Math.sin(a + 1.57) * c * l, ex, ey); g.stroke();
  }
  g.restore();
}

// fix 2: the feet. Inside each foot box the medial-axis blotches (N) and the short toe-line fragments (S < 14 px)
// are left out; each measured toe axis (./data/feet.js, base -> tip) is drawn as a toe: a dark tapered outline, the
// pale toe inside it, a short dark claw at the tip.
const midIn = (st, B) => {
  const k = 4 * Math.floor(st.length / 8), x = st[k], y = st[k + 1];
  return B.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]);
};
const strokeLen = (st) => { let L = 0; for (let i = 4; i < st.length; i += 4) L += Math.hypot(st[i] - st[i - 4], st[i + 1] - st[i - 3]); return L; };
// a toe as a round-capped stroke along its axis: an outline pass, then the pale toe inside it; the rounded ends
// make the lobes. The claw: a short dark hook at the tip.
function toePath(g, q) {
  g.beginPath(); g.moveTo(q[0][0], q[0][1]);
  if (q.length === 2) g.lineTo(q[1][0], q[1][1]);
  for (let i = 1; i < q.length - 1; i++) {
    const last = i === q.length - 2;
    g.quadraticCurveTo(q[i][0], q[i][1], last ? q[i + 1][0] : (q[i][0] + q[i + 1][0]) / 2, last ? q[i + 1][1] : (q[i][1] + q[i + 1][1]) / 2);
  }
}
function drawToeSet(g, toes, clawOf, under) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const { q, w } of toes) { toePath(g, q); g.strokeStyle = grey(TUNE.toeLineV); g.lineWidth = w + 2 * TUNE.toeLine; g.stroke(); }
  if (under) under();
  for (const { q, w } of toes) { toePath(g, q); g.strokeStyle = grey(TUNE.toeV); g.lineWidth = w; g.stroke(); }
  for (const t of toes) { const c = clawOf(t); if (c) taper(g, c, (u) => Math.max(0.5, t.w * 0.32 * (1 - 0.8 * u)), grey(TUNE.clawV)); }
  g.restore();
}
function drawToes(g, T) {
  const toes = T.map((st) => {
    const P = []; for (let i = 0; i < st.length; i += 4) P.push([st[i], st[i + 1], st[i + 2]]);
    // smoothed (3-point average), thinned to ~6 px steps
    const Q = P.map((p, i) => i === 0 || i === P.length - 1 ? p : [(P[i - 1][0] + p[0] + P[i + 1][0]) / 3, (P[i - 1][1] + p[1] + P[i + 1][1]) / 3, p[2]]);
    const q = [Q[0]]; for (const p of Q) if (Math.hypot(p[0] - q[q.length - 1][0], p[1] - q[q.length - 1][1]) >= 6) q.push(p);
    if (q[q.length - 1] !== Q[Q.length - 1]) q.push(Q[Q.length - 1]);
    const w = Math.max(3.2, Math.min(7, Q.reduce((a, p) => a + p[2], 0) / Q.length)) * TUNE.toeW;
    return { q, w };
  });
  drawToeSet(g, toes, ({ q, w }) => {
    const n = q.length, a = q[n - 1], b = q[Math.max(0, n - 2)];
    let dx = a[0] - b[0], dy = a[1] - b[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    return [[a[0] - dx, a[1] - dy], [a[0] + dx * (w / 2 + 1), a[1] + dy * (w / 2 + 1)], [a[0] + dx * (w / 2 + TUNE.claw) + dy, a[1] + dy * (w / 2 + TUNE.claw) - dx]];
  });
}

// the near foot (over the belly, where its toes have no dark ground to trace against): one three-toe template
// authored on 1153 (its outline read off a 4x grid: lobes at (-21..-9, 14..25), (1.5, 37.6), (19..27, 21..30) in
// (right, up) px from the knuckle), placed per drawing by the knuckle K and the middle toe's apex M read off 4x grids
// of each source frame ([Kx, Ky, Mx, My]; the scale is |KM| / 37.6: the toes grow as the owl nears the camera).
const NEARFOOT = {
  1143: [1173, 467, 1191, 433], 1144: [1122.5, 500, 1132.5, 466], 1145: [1071, 535, 1081, 500], 1147: [1018, 533.5, 1030, 493.5],
  1148: [985, 537, 997.5, 499], 1149: [934, 552, 945, 512], 1150: [900, 573.5, 909, 531.5], 1151: [872, 578, 877, 538],
  1152: [847.5, 587, 850, 546], 1153: [816.5, 597, 818.5, 559.5], 1154: [791, 621.5, 791, 579.5], 1155: [767, 637, 763, 596.5],
  1156: [709, 711, 708, 664], 1157: [660, 778, 659, 733.5], 1158: [610, 869, 618, 812.5], 1159: [613, 888.5, 612, 838.5],
  1160: [614, 888, 610, 833], 1161: [614.5, 888.5, 614.5, 831],
};
const TOES = [
  { p: [[-3, 4], [-12, 13], [-15.5, 21]], w: 8.5 },
  { p: [[1, 4], [2, 19], [2, 32]], w: 8.5 },
  { p: [[5, 4], [14, 13], [20.5, 23]], w: 8.5 },
];
function nearFootFrame(id) {
  const N = NEARFOOT[id];
  if (!N) return null;
  const [kx, ky, mx, my] = N, L = Math.hypot(mx - kx, my - ky), ux = (mx - kx) / L, uy = (my - ky) / L;
  return { kx, ky, ux, uy, rx: -uy, ry: ux, s: L / 37.6, L };
}
function drawNearFoot(g, F) {
  const P = ([r, u]) => [F.kx + (F.rx * r + F.ux * u) * F.s, F.ky + (F.ry * r + F.uy * u) * F.s];
  // toe widths grow more slowly than their length (measured: ~8 px on 1153, ~9-10 px on 1160 where they are 1.5x longer)
  const ws = Math.sqrt(F.s);
  const toes = TOES.map((t) => ({ q: t.p.map(P), w: t.w * ws, t }));
  // the palm: pale over the toes' base outlines (the leg runs straight into the toes)
  const palm = () => { g.save(); g.lineCap = "round"; g.beginPath(); const a = P([1, 9]), b = P([1, -10]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
    g.strokeStyle = grey(TUNE.toeV); g.lineWidth = 15 * ws; g.stroke(); g.restore(); };
  // the curled claw inside each lobe: a short dark hook from the lobe's top down its inner side
  drawToeSet(g, toes, ({ t }) => {
    const [a, b] = [t.p[1], t.p[2]], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), ex = dx / d, ey = dy / d;
    const side = t.p[2][0] < 0 ? 1 : -1, nx = -ey * side, ny = ex * side, h = t.w / 2;
    return [[b[0] + ex * (h - 2.5), b[1] + ey * (h - 2.5)], [b[0] + ex * 0.5 + nx * (h - 3), b[1] + ey * 0.5 + ny * (h - 3)], [b[0] - ex * 6 + nx * (h - 3.5), b[1] - ey * 6 + ny * (h - 3.5)]].map(P);
  }, palm);
}
const nearFoot = (F, st) => { if (!F) return false; const k = 4 * Math.floor(st.length / 8); return Math.hypot(st[k] - F.kx, st[k + 1] - F.ky) < TUNE.nearR * F.L; };

// fix 2: on the seated owl's lower wing (x 385-440, y 765-870) the wing's leading edge is a firm but slim line
// (5x grid of 1175: ~1.5 px at the top to ~3.5 px at the bottom, 0.15-0.25) and the feather lines beside it are
// mid-grey; the measured strokes there printed as one black slash 5-6 px wide. Capped here: the dark part to 3 px
// and 0.12, the feather lines to 1.5 px and 0.4.
function softSlash(st, dark) {
  const k = 4 * Math.floor(st.length / 8), x = st[k], y = st[k + 1];
  if (x < 385 || x > 440 || y < 765 || y > 870) return st;
  const o = st.slice();
  for (let i = 0; i < o.length; i += 4) { o[i + 2] = Math.min(o[i + 2], dark ? 3.0 : 1.5); o[i + 3] = Math.max(o[i + 3], dark ? 0.12 : 0.4); }
  return o;
}

// fix 2 (flight): the ink lines smoothed (3-point moving average of the measured points; they printed cracked and
// jagged), the smallest dark parts (< 7 px: arrow-like ticks inside the wings) left out and the others capped at 2.5 px
function smooth3(st) {
  const n = st.length / 4;
  if (n < 3) return st;
  const o = st.slice();
  for (let i = 1; i < n - 1; i++) for (const c of [0, 1]) o[4 * i + c] = (st[4 * (i - 1) + c] + st[4 * i + c] + st[4 * (i + 1) + c]) / 3;
  return o;
}
const capW = (st, w) => { const o = st.slice(); for (let i = 2; i < o.length; i += 4) o[i] = Math.min(o[i], w); return o; };

let SCR = null;
function build(dw, id) {
  const [x0, y0, x1, y1] = dw.box, pad = 6;
  const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!SCR) SCR = document.createElement("canvas");
  if (SCR.width < w || SCR.height < h) { SCR.width = Math.max(SCR.width, w); SCR.height = Math.max(SCR.height, h); }
  const s = SCR.getContext("2d");
  const view = (globalThis.__S16 || {}).view || "";
  // the plumage's light: the coarse study, upsampled smoothly and softened
  const G = dw.G;
  s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, SCR.width, SCR.height);
  s.fillStyle = grey(dw.base); s.fillRect(0, 0, w, h);
  s.imageSmoothingEnabled = true; s.imageSmoothingQuality = "high";
  s.drawImage(gridCanvas(G), G.x0 - (x0 - pad) - G.c / 2, G.y0 - (y0 - pad) - G.c / 2, G.nx * G.c, G.ny * G.c);
  g.filter = `blur(${TUNE.gsoft}px)`;
  g.drawImage(SCR, 0, 0, w, h, 0, 0, w, h);
  g.filter = "none";
  if (view !== "owlG") { const V = printTexture(g, w, h, 1600 + id, TUNE.grain); fluff(g, V, w, h, 1600 + id, TUNE.fluff); }
  g.translate(pad - x0, pad - y0);
  if (view !== "owlG") {
    // headphones (fix 2): the dark shape (the black gap between band and head), the band as a soft grey bar along
    // its measured centre-lines (./data/band.js), each cup drawn by its kind; no highlight blobs
    if (dw.HP) {
      const HP = dw.HP;
      g.save();
      ringPath(g, HP.rings); g.fillStyle = grey(HP.vg ?? HP.v); g.fill("evenodd");
      ringPath(g, HP.rings); g.clip("evenodd");
      if (BAND[id]) { g.save(); g.filter = `blur(${TUNE.bandBlur}px)`; drawStrokes(g, BAND[id], true, { end: 3, wMin: 1.0, wk: TUNE.bandW }); g.restore(); }
      HP.cups.forEach((cp, i) => { const k = cupKind(id, i, cp); if (k === "sliver") drawCupSliver(g, cp, TUNE.sliver); });
      g.restore();
      HP.cups.forEach((cp, i) => { if (cupKind(id, i, cp) === "cup") drawCup2(g, cp, (CUPM[id] || [])[i]); });
      // the head's lit top edge under the band (measured pale lines; those on the band are left out)
      const keep = new Set(HLKEEP[id] || []);
      drawStrokes(g, (HP.hl || []).filter((_, i) => keep.has(i)), true, { end: 3, wMin: 0.7 });
    }
    for (const it of dw.KL || []) { ringPath(g, it.slice(1)); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
    if (dw.SEAT) drawSeatParts(g, dw.SEAT, id);
    const FT = FEET[id] || { B: [], T: [] }, NF = nearFootFrame(id);
    const S = id === 1175 ? dw.S.map((st) => softSlash(st, false)) : dw.S.map((st) => TUNE.smoothS ? smooth3(st) : st);
    drawStrokes(g, S.filter((st) => !(midIn(st, FT.B) && strokeLen(st) < 14) && !nearFoot(NF, st)), false, { end: 3, dv: TUNE.sdv });
    // the notches between feathers, talons, beak shade: tapered ink strokes (not inside the feet: fix 2)
    g.save();
    if (TUNE.dsoft > 0) g.filter = `blur(${TUNE.dsoft}px)`;
    drawStrokes(g, (dw.N || []).map((st) => id === 1175 ? softSlash(st, true) : dw.O ? st : capW(st, TUNE.nCap))
      .filter((st) => dw.O || strokeLen(st) >= TUNE.nMin).filter((st) => !midIn(st, FT.B) && !nearFoot(NF, st)), false, { end: 2.5, wMin: 0.6 });
    g.restore();
    g.save(); g.filter = "blur(0.4px)";
    const far = FT.T.filter((st) => !nearFoot(NF, st));
    if (far.length) drawToes(g, far);
    if (NF) drawNearFoot(g, NF);
    g.restore();
    for (const e of dw.E || []) drawEye16(g, e);
    drawPlaster(g, id);
  }
  // the silhouette
  g.setTransform(1, 0, 0, 1, 0, 0);
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const mg = m.getContext("2d");
  mg.translate(pad - x0, pad - y0);
  ringPath(mg, dw.sil); mg.fillStyle = "#fff"; mg.fill("evenodd");
  const cuts = dw.HP ? dw.HP.cups.filter((cp, i) => cupKind(id, i, cp) === "cut") : [];
  // (grown 30 %: the headphone shape runs on past the fitted ellipse's lower end into his hair)
  const cutPath = (q, cp) => { q.beginPath(); q.ellipse(cp[0], cp[1], cp[2] * TUNE.cutK, cp[3] * TUNE.cutK, (cp[4] * Math.PI) / 180, 0, Math.PI * 2); };
  for (const cp of cuts) {
    mg.save(); ringPath(mg, dw.HP.rings); mg.clip("evenodd"); cutPath(mg, cp);
    mg.globalCompositeOperation = "destination-out"; mg.fill(); mg.restore();
  }
  g.globalCompositeOperation = "destination-in";
  if (TUNE.feather > 0) g.filter = `blur(${TUNE.feather}px)`;
  g.drawImage(m, 0, 0);
  g.filter = "none";
  // the soft dark rim just inside the edge (the print's ink gathers there: measured edge profile)
  if (TUNE.rim > 0 && !dw.O) {
    g.save(); g.globalCompositeOperation = "source-atop"; g.translate(pad - x0, pad - y0);
    g.filter = `blur(${TUNE.rimBlur}px)`; ringPath(g, dw.sil);
    g.strokeStyle = `rgba(0,0,0,${TUNE.rim})`; g.lineWidth = TUNE.rimW; g.lineJoin = "round"; g.stroke();
    g.restore();
  }
  // the cut far cup: a thin dark arc where the head meets the cut (only over the owl's own pixels)
  for (const cp of cuts) {
    g.save(); g.globalCompositeOperation = "source-atop"; g.translate(pad - x0, pad - y0);
    g.strokeStyle = grey(TUNE.arcV); g.lineWidth = 2 * TUNE.arcW;
    g.save(); ringPath(g, dw.HP.rings); g.clip("evenodd"); cutPath(g, cp); g.stroke(); g.restore();
    g.save(); cutPath(g, cp); g.clip(); ringPath(g, dw.HP.rings); g.stroke(); g.restore();
    g.restore();
    // and just outside the head, inside the cut: the soft dark strip of his hair and the band's end (measured at
    // 1143: 15-20 px wide, 0.16-0.45 pre-grade): the owl's own silhouette, darkened and blurred, spilling into the
    // cut over the room (darkest at the head's edge, fading out)
    const t = document.createElement("canvas"); t.width = w; t.height = h;
    const tg = t.getContext("2d"); tg.drawImage(m, 0, 0); tg.globalCompositeOperation = "source-in";
    tg.fillStyle = "rgb(22,22,21)"; tg.fillRect(0, 0, w, h);
    g.save(); g.globalCompositeOperation = "source-over"; g.translate(pad - x0, pad - y0);
    ringPath(g, dw.HP.rings); g.clip("evenodd"); cutPath(g, cp); g.clip();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.filter = `blur(${TUNE.stripBlur}px)`; g.globalAlpha = TUNE.stripA;
    for (let k = 0; k < 2; k++) g.drawImage(t, 0, 0);
    g.restore();
  }
  g.globalCompositeOperation = "source-over";
  // the seated owl's inked outline, thicker on its shaded underside
  if (dw.O) {
    g.save(); g.translate(pad - x0, pad - y0);
    ringPath(g, dw.sil); g.clip("evenodd");
    drawOutline(g, dw.sil, dw.O);
    g.restore();
  }
  // (fix 2: the measured "cable" lines outside the silhouette, dw.C, are not drawn: they were his lid, hair and jacket
  // lines on 1143-1148 and the steam on 1153-1160, both drawn by the room, and the owl covers the steam)
  return { c, x: x0 - pad, y: y0 - pad };
}

// the outline as a tapered line: width from O[1]*0.5 (top, lit) to O[1] (underside), inside the silhouette
function drawOutline(g, sil, O) {
  const [v, wmax] = O;
  for (const r of sil) {
    let ya = 1e9, yb = -1e9;
    for (let i = 1; i < r.length; i += 2) { ya = Math.min(ya, r[i]); yb = Math.max(yb, r[i]); }
    const n = r.length / 2;
    g.strokeStyle = grey(v); g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1];
      const u = ((ay + by) / 2 - ya) / Math.max(1, yb - ya);
      // fix 2: thin on top, fading out toward the underside (the source's lower wing and tail meet the black with no
      // contour; the fix-1 outline was heaviest there and read as a sticker edge)
      g.lineWidth = 2 * (TUNE.owmax * (0.08 + 0.92 * Math.pow(1 - u, 1.6)));   // doubled: half of it is clipped away
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
  }
}

const CACHE = new Map();       // a few drawings (renders run out of order)
function layer(id) {
  if (CACHE.has(id)) { const v = CACHE.get(id); CACHE.delete(id); CACHE.set(id, v); return v; }
  const v = build(OWL[id], id);
  CACHE.set(id, v);
  while (CACHE.size > 4) CACHE.delete(CACHE.keys().next().value);
  return v;
}

// in the pull-back the seated owl drifts a little against the room: its own offset (px) on top of the room camera
// (ECC translation of the owl on each frame against 1175 moved by the camera, src/shots/s16/trace notes)
const OFF = { 1188: [0.29, 0.29], 1190: [-0.21, -0.11], 1191: [-0.38, -0.12], 1192: [-0.06, -0.79] };

// draw the owl of source frame F into g (the caller sets the transform: frame px, or the room camera for plate px)
export function drawOwl16(g, F) {
  const id = owlDrawingOf(F);
  if (!OWL[id]) return;
  const L = layer(id), o = OFF[F] || [0, 0];
  g.drawImage(L.c, L.x + o[0], L.y + o[1]);
}
export function releaseOwl() { CACHE.clear(); }
// the cached layer of a drawing (measurement harness only)
export function owlLayer(id) { return layer(id); }
