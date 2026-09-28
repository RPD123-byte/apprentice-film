// Speed lines for s24 (frame px): long round-ended white/grey strokes running down-right at 27.5° (structure tensor
// of the source's background), ~2.4 lines per 100 px across, 2–8 px wide, peak grey 90–220. The source cycles a few
// line layers frame to frame (frames two apart correlate ~0.8 with a small up-left drift); a layer here is a seeded
// set of lines that drifts by `drift` px along the line direction.
import { rng } from "../../lib/rng.js";

export const LINE_ANG = 27.5 * Math.PI / 180;
const CA = Math.cos(LINE_ANG), SA = Math.sin(LINE_ANG);
const W = 2206, H = 946;

const LAYERS = new Map();
function layer(seed, density) {
  const key = seed + ":" + density;
  if (LAYERS.has(key)) return LAYERS.get(key);
  const r = rng(seed * 7919 + 13);
  // rotated frame: u along the lines, v across. Cover the frame with margin.
  const vMin = -W * SA - 60, vMax = H * CA + 60, uMin = -200, uMax = W * CA + H * SA + 400;
  const n = Math.round(400 * density);
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = vMin + r() * (vMax - vMin);
    const len = 70 + Math.pow(r(), 1.7) * 780;
    const u = uMin + r() * (uMax - uMin);
    const q = r();
    const w = 2.2 + Math.pow(r(), 1.3) * 9.5;
    const val = q < 0.25 ? 0.36 + r() * 0.2 : q < 0.7 ? 0.55 + r() * 0.25 : 0.8 + r() * 0.14;
    out.push([u, v, len, w, val]);
  }
  LAYERS.set(key, out);
  return out;
}

// Paint one layer. drift: px along the line direction (+ = down-right). alpha multiplies every line.
export function drawSpeedLines(g, { seed = 1, drift = 0, density = 1, alpha = 1, gain = 1 } = {}) {
  const L = layer(seed, density);
  g.save();
  g.lineCap = "round";
  // rotated coordinates: x' = u*CA - v*SA, y' = u*SA + v*CA
  g.setTransform(CA, SA, -SA, CA, 0, 0);
  for (const [u, v, len, w, val] of L) {
    const c = Math.round(Math.min(1, val * gain) * 255);
    g.strokeStyle = `rgba(${c},${c},${c},${alpha})`;
    g.lineWidth = w;
    const u0 = u + drift;
    g.beginPath(); g.moveTo(u0, v); g.lineTo(u0 + len, v); g.stroke();
  }
  g.restore();
}

export function releaseLines() { LAYERS.clear(); }
