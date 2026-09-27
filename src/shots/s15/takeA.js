// s15 take A (40.72–40.88): the source is one continuous push from s14 into the same corridor (40.64/40.68 held,
// then 40.72, 40.76 ... grow 1.09x, 1.10x, 1.13x, 1.14x, 1.18x per frame: ORB pair fits). So this take reuses s14's own
// room (its painted layers and WebGL layer compositor, imported read-only from src/shots/s14/) and simply continues its
// dolly toward C = (1104.5, 642.9): p' = C + (p - C) / (1 - d w). d per frame from those pair fits for the keyboard's
// depth (w = 1), chained from s14's last value (0.549 at 40.64/40.68).
import { W, H } from "../../config.js";
import { createCompositor } from "../s14/gl.js";
import { buildLayers } from "../s14/room.js";

const C = [1104.5, 642.9];
const LIFT = 1.15;   // s14's gain on the room plates (s14.js LIFT)
// [t, d]: 40.68 = 40.64 (held); then (1 - d0)/(1 - d1) = the measured per-frame zoom
const D = [[40.64, 0.549], [40.68, 0.549], [40.72, 0.587], [40.76, 0.625], [40.80, 0.667], [40.84, 0.708], [40.88, 0.751], [40.92, 0.751]];
function dAt(t) {
  if (t <= D[0][0]) return D[0][1];
  for (let i = 1; i < D.length; i++) if (t <= D[i][0] + 1e-6) { const a = D[i - 1], b = D[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return D[D.length - 1][1];
}

let comp = null;
export function hasTakeA() { return true; }
// draw the corridor for take A at (held) frame time t into ctx; returns false if s14's room could not be built
export function drawTakeA(ctx, t) {
  try {
    if (!comp) {
      comp = createCompositor(W, H);
      for (const L of buildLayers()) comp.addLayer(L.canvas, L.rect, L.plane, L.name, L.blurK ?? 1, L.slices ?? 1);
    }
  } catch (e) { comp = null; return false; }
  const d = dAt(t);
  // shutter as in s14: the last ~0.3 frame of travel, 5 samples; near layers smear by their blurK
  let dv = d - dAt(t - 0.04);
  if (dv < 1e-4) dv = (d - dAt(t - 0.08)) / 2;
  const d0 = d - dv * 0.3;
  const ds = Array.from({ length: 5 }, (_, i) => d0 + (d - d0) * (i / 4));
  const img = comp.render({ ds, d0: d, C, sim: [1, 0, 0], mask: null, gain: LIFT });
  ctx.save(); ctx.filter = "blur(0.9px)"; ctx.drawImage(img, 0, 0); ctx.restore();
  return true;
}
export function releaseTakeA() { if (comp) { comp.dispose(); comp = null; } }
