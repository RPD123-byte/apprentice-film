// s25 v2 — the page's light in this shot: a coarse gain grid (nx × ny nodes over the screen, frame px, bilinear), fitted
// by least squares on 10 ungraded frames (source ≈ gain · render, page pixels only; snapshots/s25-tools/lightfit.py).
export const LIGHT = {"nx":13,"ny":7,"x0":144,"y0":128,"x1":2023,"y1":912,"g":[0.968,1.065,1.082,1.088,1.09,1.088,1.045,1.068,1.069,1.058,1.011,0.983,0.892,0.988,1.086,0.975,1.059,1.082,1.02,0.992,0.935,1.054,1.132,0.977,1.066,0.881,0.964,1.107,1.088,1.06,1.011,0.949,1.008,0.755,0.883,0.99,1.077,1.098,0.667,0.962,1.065,1.546,1.159,0.887,0.809,0.985,0.849,0.838,0.898,0.894,0.914,0.765,0.942,1.053,1.533,1.085,0.773,0.771,0.883,0.859,0.841,0.886,0.875,0.879,0.78,0.898,0.951,0.997,1.054,0.897,0.905,0.892,0.881,0.892,0.865,0.903,0.86,0.768,0.879,0.86,0.755,0.978,0.928,0.927,0.912,0.899,0.908,0.9,0.907,0.855,0.774]};
// fix pass 1: a correction of the grid (same nodes), fitted on 4 standing frames of the current build (median source ÷
// render per node cell, page pixels outside the owl, damped ^0.8), and the page's slight green cast (source G is 3–4
// levels over R/B relative to the render): per-channel multipliers
export const LIGHT_FIX = [1.022, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.999, 1.057, 1.003, 1.009, 1.0, 1.0, 1.0, 1.0, 1.0, 1.006, 1.042, 0.987, 0.965, 0.94, 1.027, 0.949, 1.005, 1.0, 1.0, 1.0, 1.0, 1.0, 0.977, 1.001, 1.04, 0.965, 0.94, 0.949, 0.847, 0.868, 1.0, 1.0, 1.0, 1.0, 1.0, 1.042, 1.085, 1.011, 0.986, 0.981, 1.041, 1.12, 1.001, 1.0, 1.0, 1.0, 1.0, 1.0, 1.141, 1.095, 1.042, 1.04, 0.981, 1.027, 1.042, 0.978, 1.0, 1.0, 1.0, 1.0, 1.0, 1.04, 1.136, 1.25, 1.016, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.018];
export const PAGE_TINT = [0.985, 1.035, 0.985];
// fix pass 2 (measured on 105.00 / 109.52, page pixels outside the owl, post-grade): the floor under the owl (x 800–1400,
// y > 800) is still 5–7 levels short, the lower right (x 1400–2000, y 480–946) 4–6 short, (400–600, 320–480) 6 over;
// and the source's darks carry a green cast (bottom centre render (40,40,40) vs source (45,49,45)) that a multiplier
// cannot give: a flat offset (0–255 page levels, pre-grade) is added to every page pixel.
export const LIGHT_FIX2 = (() => {
  const nx = 13, ny = 7, a = new Array(nx * ny).fill(1);
  for (let i = 4; i <= 8; i++) a[6 * nx + i] *= 1.12;                                   // bottom row, x 770–1397
  for (let i = 8; i <= 12; i++) for (let j = 3; j <= 6; j++) a[j * nx + i] *= 1.08;    // lower right
  for (const i of [2, 3]) a[2 * nx + i] *= 0.93;                                       // (400–600, 320–480)
  return a;
})();
export const PAGE_OFFSET = [0, 0, 0];
