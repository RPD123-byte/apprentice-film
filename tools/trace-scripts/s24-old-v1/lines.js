// Speed lines for s24 (frame px): long soft streaks running down-right, tapering at both ends. Measured on the source
// (Hough + structure tensor over line-only regions): 32.1° (F, k 24–53), 32.8° (H, k 58–66), 33.3° (J, k 67–91);
// ≈ 1.9–3.8 lines per 100 px across, widths median 3–6 px (90th pct 8–14), graded brightness median ≈ 100–125,
// 90th pct 160–210, and a faint haze of thin dim streaks between them. The source cycles a few line layers frame to
// frame (frames two apart correlate ~0.8 with a small up-left drift); a layer here is a seeded set of streaks that
// drifts by `drift` px along the line direction.
//
// Each streak is one stretched sprite: a white spindle (alpha ramps up over the first ~30 % of its length, holds, and
// fades over the last ~45 %) with a Gaussian cross-profile, so the ends taper and the edges are soft (the source's
// motion blur) without a per-frame canvas filter.
import { rng } from "../../lib/rng.js";

export const LINE_ANG = 32.4 * Math.PI / 180;
const W = 2206, H = 946;
const SW = 256, SH = 32, SIG = 5;           // sprite size; cross-profile sigma (px) -> FWHM ≈ 11.8 px
const FW = 2.3548 * SIG;

let SPRITE = null;
function sprite() {
  if (SPRITE) return SPRITE;
  const c = document.createElement("canvas"); c.width = SW; c.height = SH;
  const g = c.getContext("2d");
  const img = g.createImageData(SW, SH), d = img.data;
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let x = 0; x < SW; x++) {
    const u = (x + 0.5) / SW;
    const ax = sm(0, 0.3, u) * (1 - sm(0.55, 1, u));
    for (let y = 0; y < SH; y++) {
      const dy = y + 0.5 - SH / 2;
      const ay = Math.exp(-0.5 * (dy / SIG) ** 2);
      const o = (y * SW + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = Math.round(255 * ax * ay);
    }
  }
  g.putImageData(img, 0, 0);
  SPRITE = c;
  return c;
}

const LAYERS = new Map();
function layer(seed, density, ang) {
  const key = seed + ":" + density + ":" + ang.toFixed(4);
  if (LAYERS.has(key)) return LAYERS.get(key);
  const r = rng(seed * 7919 + 13);
  const CA = Math.cos(ang), SA = Math.sin(ang);
  // rotated frame: u along the lines, v across. Cover the frame with margin (and room for the drift).
  const vMin = -W * SA - 60, vMax = H * CA + 60, uMin = -900, uMax = W * CA + H * SA + 300;
  const out = [];
  const n = Math.round(330 * density);
  for (let i = 0; i < n; i++) {
    const v = vMin + r() * (vMax - vMin);
    const len = 260 + Math.pow(r(), 1.4) * 1000;
    const u = uMin + r() * (uMax - uMin - len * 0.5);
    const w = 1.6 + Math.pow(r(), 2.2) * 10.5;
    const q = r();
    const val = q < 0.35 ? 0.3 + r() * 0.18 : q < 0.8 ? 0.46 + r() * 0.22 : 0.68 + r() * 0.26;
    out.push([u, v, len, w, val]);
  }
  // the dim haze between the streaks
  const m = Math.round(260 * density);
  for (let i = 0; i < m; i++) {
    const v = vMin + r() * (vMax - vMin);
    const len = 300 + r() * 900;
    const u = uMin + r() * (uMax - uMin - len * 0.5);
    out.push([u, v, len, 1.1 + r() * 1.8, 0.1 + r() * 0.14]);
  }
  LAYERS.set(key, out);
  return out;
}

// Paint one layer. drift: px along the line direction (+ = down-right). alpha multiplies every line; gain scales the
// brightness; wash (0..1) lays a flat grey under the lines first; ang overrides the line angle.
export function drawSpeedLines(g, { seed = 1, drift = 0, density = 1, alpha = 1, gain = 1, wash = 0, ang = LINE_ANG } = {}) {
  const L = layer(seed, density, ang);
  const sp = sprite();
  const CA = Math.cos(ang), SA = Math.sin(ang);
  g.save();
  if (wash > 0) { const c = Math.round(wash * 255); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(0, 0, W, H); }
  // rotated coordinates: x' = u*CA - v*SA, y' = u*SA + v*CA
  g.setTransform(CA, SA, -SA, CA, 0, 0);
  for (const [u, v, len, w, val] of L) {
    const a = Math.min(1, val * gain) * alpha;
    if (a <= 0.01) continue;
    g.globalAlpha = a;
    const h = SH * w / FW;
    g.drawImage(sp, u + drift, v - h / 2, len, h);
  }
  g.restore();
}

export function releaseLines() { LAYERS.clear(); }
