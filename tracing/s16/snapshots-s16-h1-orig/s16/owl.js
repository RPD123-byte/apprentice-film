// s16 owl: one drawing per source frame where the owl's drawing changes (the s12/s13 method; ./data/owl.js from
// src/shots/s16/trace/owl.py): the measured silhouette, filled with soft shading (outlines of the light measured on the
// blurred frame, painted flat and softened), the solid ink shapes (eyes, headphone cushions, beak, talons) and the
// ink lines as tapered strokes, plus the thin pale cable of its headphones outside the silhouette. The owl is finished pixels (brighter and softer than the engraved room), as in the kit.
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
export const TUNE = { soft: 2.2, feather: 0.5, edgeW: 2.2 };

let SCR = null;
function build(dw) {
  const [x0, y0, x1, y1] = dw.box, pad = 4;
  const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!SCR) SCR = document.createElement("canvas");
  if (SCR.width < w || SCR.height < h) { SCR.width = Math.max(SCR.width, w); SCR.height = Math.max(SCR.height, h); }
  const s = SCR.getContext("2d");
  s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, SCR.width, SCR.height);
  s.translate(pad - x0, pad - y0);
  // soft shading: base tone, the levels on top, softened
  s.fillStyle = grey(dw.base); s.fillRect(x0 - pad, y0 - pad, w, h);
  for (const it of dw.L) { ringsPath(s, it, 1); s.fillStyle = grey(it[0] / 1000); s.fill("evenodd"); }
  g.filter = `blur(${TUNE.soft}px)`;
  g.drawImage(SCR, 0, 0, w, h, 0, 0, w, h);
  g.filter = "none";
  g.translate(pad - x0, pad - y0);
  // light shapes (eye whites), solid ink shapes, then the ink lines
  // (measurement hook for the lab harness: globalThis.__S16.view "owlL" / "owlK" / "owlS" shows one part; never set in the film)
  const view = (globalThis.__S16 || {}).view || "";
  if (view !== "owlL" && view !== "owlS") {
    for (const it of dw.KL || []) { ringsPath(g, it, 1); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
    for (const it of dw.K) { ringsPath(g, it, 1); g.fillStyle = grey(it[0] / 1000); g.fill("evenodd"); }
  }
  if (view !== "owlL" && view !== "owlK") drawStrokes(g, dw.S, false, { end: 3, dv: 0.1 });
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
  // its outline: a fine line of the measured edge tone just inside the silhouette
  if (dw.edge !== undefined) {
    g.save(); g.translate(pad - x0, pad - y0);
    ringsPath(g, [0, ...dw.sil], 1); g.clip("evenodd");
    ringsPath(g, [0, ...dw.sil], 1);
    g.lineJoin = "round"; g.strokeStyle = grey(Math.min(0.9, dw.edge + 0.05)); g.lineWidth = TUNE.edgeW; g.stroke();
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
