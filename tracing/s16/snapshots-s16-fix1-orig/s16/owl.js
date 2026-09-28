// s16 owl: one drawing per source frame where the owl's drawing changes (./data/owl.js, measured by
// src/shots/s16/trace/owl2.py; geometry only):
//   sil  the measured silhouette (sharp edge, 0.35 px feather)
//   L    soft shading: light outlines of the plumage measured with its ink, parts and gaps taken out (grey closing,
//        inpainting), blurred sigma 3 (flight) / 6 (seated), light-matched to the source (calibration rounds); painted
//        flat, then softened TUNE.soft px
//   D    dark cel levels, painted flat and barely softened: the wide dark parts (headphone band and cups, pupils, the
//        black gaps between feathers); on the seated owl the headphones, feet, far wing and tuft at 11 fine levels
//        (the s13 cel-trace method), and on the flying owl its feet
//   S    thin ink lines (centre-lines with width and value), KL small light shapes, C the headphone cable
//   E    eyes, drawn here from fitted ellipses (glossy flight eyes: sclera ring, iris, catchlight; the seated owl's
//        dazed rings with pin pupils)
//   O    the seated owl's inked outline (value, width)
// Drawings 1143–1163 are in frame px (the flight, measured with the camera in them); the seated owl (measured on
// 1175) is in plate px and is drawn under the room's camera for 1165–1192.
import { grey } from "../../lib/engrave.js";
import { drawStrokes } from "./room.js";
import { OWL } from "./data/owl.js";

// source frame -> drawing (frame whose drawing it is)
export function owlDrawingOf(F) {
  if (F === 1146) return 1145;        // held for two frames
  if (F === 1164) return 1163;
  if (F >= 1165) return 1175;         // the seated, dazed owl
  return Math.max(1143, F);
}
export const inPlatePx = (F) => F >= 1165;

function ringsPath(g, item, from) {
  g.beginPath();
  for (let k = from; k < item.length; k++) {
    const r = item[k];
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}
export const TUNE = { soft: 3.0, dsoft: 0.5, feather: 0.35 };

// the flying owl's eyes, drawn from their measured ellipses (src/shots/s16/trace owl2.py <- eyes_fit.json:
// automatic fits of the dark iris blob, of the thin dark ring round the white and of the catchlight):
// e = [iris cx, cy, w, h, deg, sclera cx, cy, w, h, deg, catch x, y, r]
function ell(g, cx, cy, w, h, deg) { g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, (deg * Math.PI) / 180, 0, Math.PI * 2); }
function drawEye16(g, e) {
  const [type, ix, iy, iw, ih, ia, sx, sy, sw, sh, sa, kx, ky, kr] = e;
  if (type === 1) {
    // the seated owl's dazed eye: a thin dark ring round the white, a small pupil with a pin of light
    ell(g, sx, sy, sw, sh, sa); g.fillStyle = grey(0.94); g.fill();
    ell(g, sx, sy, sw, sh, sa); g.strokeStyle = grey(0.2); g.lineWidth = 2.5; g.stroke();
    ell(g, ix, iy, Math.max(3, iw), Math.max(6, ih), ia); g.fillStyle = grey(0.1); g.fill();
    if (kr > 0) { g.beginPath(); g.arc(kx, ky, 1.1, 0, Math.PI * 2); g.fillStyle = grey(0.85); g.fill(); }
    return;
  }
  if (sw > 0) {
    ell(g, sx, sy, sw, sh, sa); g.fillStyle = grey(0.95); g.fill();
    ell(g, sx, sy, sw - 1.2, sh - 1.2, sa); g.strokeStyle = grey(0.22); g.lineWidth = 2.3; g.stroke();
  }
  // the iris: near-black with a dark rim and a soft paler crescent low on the far side
  g.save(); ell(g, ix, iy, iw, ih, ia); g.clip();
  g.fillStyle = grey(0.1); g.fill();
  const r = (iw + ih) / 4;
  const gr = g.createRadialGradient(ix + r * 0.25, iy + r * 0.55, 0, ix + r * 0.25, iy + r * 0.55, r * 0.75);
  gr.addColorStop(0, "rgba(120,120,118,0.55)"); gr.addColorStop(1, "rgba(120,120,118,0)");
  g.fillStyle = gr; g.fillRect(ix - r * 1.2, iy - r * 1.2, r * 2.4, r * 2.4);
  ell(g, ix, iy, iw - 1, ih - 1, ia); g.strokeStyle = grey(0.04); g.lineWidth = 1.6; g.stroke();
  g.restore();
  if (kr > 0) { g.beginPath(); g.arc(kx, ky, Math.max(2.4, kr * 0.95), 0, Math.PI * 2); g.fillStyle = grey(0.97); g.fill(); }
}

let SCR = null;
function build(dw) {
  const [x0, y0, x1, y1] = dw.box, pad = 4;
  const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!SCR) SCR = document.createElement("canvas");
  if (SCR.width < w || SCR.height < h) { SCR.width = Math.max(SCR.width, w); SCR.height = Math.max(SCR.height, h); }
  const s = SCR.getContext("2d");
  const view = (globalThis.__S16 || {}).view || "";
  // soft shading: base tone, the levels on top, softened
  s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, SCR.width, SCR.height);
  s.translate(pad - x0, pad - y0);
  s.fillStyle = grey(dw.base); s.fillRect(x0 - pad, y0 - pad, w, h);
  for (const it of dw.L) { ringsPath(s, it, 1); s.fillStyle = grey(it[0] / 1000); s.fill("evenodd"); }
  g.filter = `blur(${TUNE.soft}px)`;
  g.drawImage(SCR, 0, 0, w, h, 0, 0, w, h);
  g.filter = "none";
  // the wide dark parts (headphones, pupils, beak and talon shading): dark cel levels, lightly softened
  if (view !== "owlL" && dw.D && dw.D.length) {
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, SCR.width, SCR.height);
    s.translate(pad - x0, pad - y0);
    for (const it of dw.D) { ringsPath(s, it, 1); s.fillStyle = grey(it[0] / 1000); s.fill("evenodd"); }
    g.filter = `blur(${TUNE.dsoft}px)`;
    g.drawImage(SCR, 0, 0, w, h, 0, 0, w, h);
    g.filter = "none";
  }
  g.translate(pad - x0, pad - y0);
  if (view !== "owlL") {
    for (const it of dw.KL || []) { ringsPath(g, it, 1); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
    for (const it of dw.K || []) { ringsPath(g, it, 1); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
    drawStrokes(g, dw.S, false, { end: 3, dv: 0.1 });
    for (const e of dw.E || []) drawEye16(g, e);
  }
  // the silhouette
  g.setTransform(1, 0, 0, 1, 0, 0);
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const mg = m.getContext("2d");
  mg.translate(pad - x0, pad - y0);
  ringsPath(mg, [0, ...dw.sil], 1); mg.fillStyle = "#fff"; mg.fill("evenodd");
  g.globalCompositeOperation = "destination-in";
  if (TUNE.feather > 0) g.filter = `blur(${TUNE.feather}px)`;
  g.drawImage(m, 0, 0);
  g.filter = "none"; g.globalCompositeOperation = "source-over";
  // the seated owl's dark contour (the source draws it as an inked outline, ~2 px, a dark grey)
  if (dw.O) {
    g.save(); g.translate(pad - x0, pad - y0);
    ringsPath(g, [0, ...dw.sil], 1); g.clip("evenodd");
    ringsPath(g, [0, ...dw.sil], 1);
    g.lineJoin = "round"; g.strokeStyle = grey(dw.O[0]); g.lineWidth = dw.O[1]; g.stroke();
    g.restore();
  }
  // pale lines just outside the silhouette (the headphone cable)
  if (dw.C && dw.C.length) { g.translate(pad - x0, pad - y0); drawStrokes(g, dw.C, true, { end: 3 }); g.setTransform(1, 0, 0, 1, 0, 0); }
  return { c, x: x0 - pad, y: y0 - pad };
}

const CACHE = new Map();       // a few drawings (renders run out of order)
function layer(id) {
  if (CACHE.has(id)) { const v = CACHE.get(id); CACHE.delete(id); CACHE.set(id, v); return v; }
  const v = build(OWL[id]);
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
