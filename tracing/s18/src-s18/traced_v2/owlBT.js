// s18 shot B owl, drawn from its outline traces (owlBTrace.js, made by trace/trace_owlB.py from the source frames):
//  - 1382-1416: the rigid belly (median of the frames registered on TRACK_B), the far wing in its flap state (a
//    3-frame cycle: down / mid / up), the tail as its own rigid part under a fitted affine per frame, and on top, per
//    frame, everything else that changes (legs and feet, pressed keys, the near wing sweeping down, edge differences);
//  - 1417-1432: the leap, the take-off past the camera and the wing flapping at the left edge, traced per frame.
// Every part is drawn into its own layer and softened (the owl is softer than the keys; the motion-blurred frames
// much more), the static parts once, the per-frame layer each frame.
import { OWL_B_TRACE } from "./owlBTrace.js";
import { drawTrace, decodeTrace } from "./traced.js";
import { bodyOffset } from "./owlB.js";
import { softCanvas } from "./soft.js";

function bbox(layers, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const lay of layers) for (const [, rings] of lay) for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1];
  }
  if (!(x1 > x0)) return null;
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 - x0 + 2 * pad), Math.ceil(y1 - y0 + 2 * pad)];
}
// draw a decoded trace into a (new or reused) canvas around its bounds, softened; returns { c, x, y }
function layerOf(layers, sigma, reuse = null) {
  const bb = bbox(layers, Math.ceil(sigma * 3) + 2);
  if (!bb) return null;
  const [x, y, w, h] = bb;
  let c = reuse;
  if (!c || c.width < w || c.height < h) { c = document.createElement("canvas"); c.width = Math.max(w, reuse ? reuse.width : 0); c.height = Math.max(h, reuse ? reuse.height : 0); }
  const g = c.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.translate(-x, -y);
  drawTrace(g, layers);
  // small softening in JS (exact, premultiplied); large blurs (the motion-blurred frames) by the canvas filter at
  // draw time, which is fast and does not skip sigmas this large
  if (sigma < 1.5) softCanvas(c, sigma);
  return { c, x, y, blur: sigma >= 1.5 ? sigma : 0 };
}
const SOFT_BODY = 0.8, SOFT_STEP = 0.8, SOFT_FLY = 3.0;
let D = null, scratch = null;
function dec() {
  if (D) return D;
  const T = OWL_B_TRACE;
  D = { tailA: T.tailA, state: T.state, hold: T.hold, frames: {}, wing: {} };
  D.belly = layerOf(decodeTrace(T.belly), SOFT_BODY);
  D.tail = layerOf(decodeTrace(T.tail), SOFT_BODY);
  for (const [k, v] of Object.entries(T.body)) D.wing[k] = v.length ? layerOf(decodeTrace(v), SOFT_BODY) : null;
  for (const [k, v] of Object.entries(T.frames)) D.frames[k] = decodeTrace(v);
  return D;
}
export function drawOwlBT(ctx, f) {
  const d = dec();
  if (f <= 1416) {
    const A = d.tailA[f];
    if (A && d.tail) { ctx.save(); ctx.transform(A[0], A[1], A[2], A[3], A[4], A[5]); ctx.drawImage(d.tail.c, d.tail.x, d.tail.y); ctx.restore(); }
    const [dx, dy] = bodyOffset(f), w = d.wing[d.state[f]];
    ctx.drawImage(d.belly.c, d.belly.x + dx, d.belly.y + dy);
    if (w) ctx.drawImage(w.c, w.x + dx, w.y + dy);
  }
  const k = d.hold[f] || f, fr = d.frames[k];
  if (fr) {
    const L = layerOf(fr, k >= 1419 ? SOFT_FLY : SOFT_STEP, scratch);
    if (L) {
      scratch = L.c;
      if (L.blur) { ctx.save(); ctx.filter = `blur(${L.blur}px)`; ctx.drawImage(L.c, L.x, L.y); ctx.restore(); }
      else ctx.drawImage(L.c, L.x, L.y);
    }
  }
}
export function releaseOwlBT() { D = null; scratch = null; }
