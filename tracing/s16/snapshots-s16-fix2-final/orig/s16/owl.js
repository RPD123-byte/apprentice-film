// s16 owl: one drawing per source frame where the owl's drawing changes (./data/owl.js, measured by
// src/shots/s16/trace/owl3.py; geometry and a few measured values only). Each drawing is built from authored parts:
//   sil  the measured silhouette (smoothed), a soft 0.6 px edge
//   G    the plumage's light: a coarse value study (8 px grid, <= 8 levels), upsampled and blurred, then a matte print
//        texture on it: seeded fine grain and stipple, denser toward the shaded underside (no smooth airbrushed grey)
//   HP   the headphones: band and cups as one dark shape, the band's pale edge line, each cup drawn from its fitted
//        ellipse as pad, rim and face ellipses with a specular streak (./owlparts.js)
//   N    the small dark parts (the notches between feathers, the talons, the beak's shade) as tapered ink strokes
//   S    thin ink lines (measured centre-lines, redrawn tapered), KL small light shapes, C the headphone cable
//   E    eyes, drawn from fitted ellipses (glossy flight eyes; the seated owl's dazed rings with pin pupils)
//   O    the seated owl's inked outline; SEAT its authored parts (./owlparts.js)
// Drawings 1143–1163 are in frame px (the flight, measured with the camera in them); the seated owl (measured on
// 1175) is in plate px and is drawn under the room's camera for 1165–1192.
import { grey } from "../../lib/engrave.js";
import { rng } from "../../lib/rng.js";
import { drawStrokes } from "./room.js";
import { OWL } from "./data/owl.js";
import { drawCup, drawSeatParts } from "./owlparts.js";

// source frame -> drawing (frame whose drawing it is)
export function owlDrawingOf(F) {
  if (F === 1146) return 1145;        // held for two frames
  if (F === 1164) return 1163;
  if (F >= 1165) return 1175;         // the seated, dazed owl
  return Math.max(1143, F);
}
export const inPlatePx = (F) => F >= 1165;

export const TUNE = { gsoft: 3.0, feather: 0.8, grain: 0.06, stip: 1.0, dsoft: 0.35, fluff: 1.0, sdv: 0.0, rim: 0.2, rimW: 3.4, rimBlur: 1.2, owmax: 2.2 };

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
    // headphones: band + cups as one dark shape, the cups drawn inside it, the band's pale edge
    if (dw.HP) {
      const HP = dw.HP;
      g.save();
      ringPath(g, HP.rings); g.fillStyle = grey(HP.vg ?? HP.v); g.fill("evenodd");
      ringPath(g, HP.rings); g.clip("evenodd");
      if (HP.band) { ringPath(g, HP.band); g.fillStyle = grey(HP.v); g.fill("evenodd"); }
      for (const cp of HP.cups) drawCup(g, cp);
      g.restore();
      // the band's pale edges and slider marks (measured centre-lines)
      drawStrokes(g, HP.hl || [], true, { end: 3, wMin: 0.7 });
    }
    for (const it of dw.KL || []) { ringPath(g, it.slice(1)); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
    if (dw.SEAT) drawSeatParts(g, dw.SEAT, id);
    drawStrokes(g, dw.S, false, { end: 3, dv: TUNE.sdv });
    // the notches between feathers, talons, beak shade: tapered ink strokes
    g.save();
    if (TUNE.dsoft > 0) g.filter = `blur(${TUNE.dsoft}px)`;
    drawStrokes(g, dw.N || [], false, { end: 2.5, wMin: 0.6 });
    g.restore();
    for (const e of dw.E || []) drawEye16(g, e);
  }
  // the silhouette
  g.setTransform(1, 0, 0, 1, 0, 0);
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const mg = m.getContext("2d");
  mg.translate(pad - x0, pad - y0);
  ringPath(mg, dw.sil); mg.fillStyle = "#fff"; mg.fill("evenodd");
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
  g.globalCompositeOperation = "source-over";
  // the seated owl's inked outline, thicker on its shaded underside
  if (dw.O) {
    g.save(); g.translate(pad - x0, pad - y0);
    ringPath(g, dw.sil); g.clip("evenodd");
    drawOutline(g, dw.sil, dw.O);
    g.restore();
  }
  // pale lines just outside the silhouette (the headphone cable)
  if (dw.C && dw.C.length) { g.translate(pad - x0, pad - y0); drawStrokes(g, dw.C, true, { end: 3 }); g.setTransform(1, 0, 0, 1, 0, 0); }
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
      g.lineWidth = 2 * (TUNE.owmax * (0.45 + 0.55 * u * u));   // doubled: half of it lies outside and is clipped away
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
