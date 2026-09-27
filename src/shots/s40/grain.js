// Moving film grain for the end card. The source's grain is neutral (the same on R, G and B), isotropic and blotchy:
// its autocorrelation is 0.77 / 0.43 / 0.17 at 1 / 2 / 3 px in both x and y, and it boils every frame. post.js's
// grain is pixel-fine in y and streaks along x (0.43 / 0.01 in y against 0.59 / 0.40 in x), which reads as horizontal
// lines at 1:1. This shot therefore sets post.js's grain to 0 once the card is up and draws its own (pre-grade):
// gaussian white noise blurred with sigma 1.1 px, shifted to a new offset every frame, with its strength following
// the source's measured grain-vs-brightness curve (strongest in the mid-tones, about 40% of that on the letter faces).
// Neutral signed noise is added with an invert / add / invert / add sequence of full-frame composites, since canvas has
// no subtractive blend. Everything is seeded; the frame's offset comes from the frame index, so draw stays pure.
import { W, H } from "../../config.js";
import { rng, hash } from "../../lib/rng.js";

const PAD = 128, SIGMA = 1.1, GAIN = 16; // texture levels per unit of noise (clips at 255 / GAIN = 16 sigma)

// Source moving-grain std (levels, high-passed at sigma 4) against graded luminance (measured on 138.0-138.44).
// The source curve is 2.6 / 3.8 / 4.3 / 3.7 / 2.7 / 1.6 at 50 / 90 / 130 / 170 / 210 / 250; the table below is that
// curve corrected once by the measured render / source ratio (the grade's halation and the sigma-4 high-pass eat
// 25-40% of the analytic estimate), so the rendered grain lands on the source's.
const GRAIN_CURVE = [[0, 2.7], [50, 3.15], [70, 4.3], [90, 5.0], [110, 5.45], [130, 5.85], [150, 5.3], [170, 5.25], [190, 4.75], [210, 3.9], [230, 3.4], [255, 2.2]];

const curve = (L) => {
  const C = GRAIN_CURVE;
  if (L <= C[0][0]) return C[0][1];
  for (let i = 1; i < C.length; i++) if (L <= C[i][0]) {
    const u = (L - C[i - 1][0]) / (C[i][0] - C[i - 1][0]);
    return C[i - 1][1] + (C[i][1] - C[i - 1][1]) * u;
  }
  return C[C.length - 1][1];
};

// post.js's grain is not zero-mean: its hash is not uniform, so at 7.5/255 it darkens by 1.5-2.7 levels (graded; measured
// on flat greys, strongest in the mid-tones). Every colour on this card was matched to the source through that bias, so
// the card's own grain carries the same mean shift (and the colours stay matched).
const BIAS_CURVE = [[0, 1.55], [20, 1.55], [50, 1.6], [80, 1.95], [110, 2.3], [140, 2.4], [170, 2.1], [200, 1.9], [230, 1.5], [255, 1.5]];
const interp = (C, L) => {
  if (L <= C[0][0]) return C[0][1];
  for (let i = 1; i < C.length; i++) if (L <= C[i][0]) return C[i - 1][1] + (C[i][1] - C[i - 1][1]) * (L - C[i - 1][0]) / (C[i][0] - C[i - 1][0]);
  return C[C.length - 1][1];
};

let tex = null, amp = null, scr = null, biasC = null, ampMax = 1;
// fix pass 4 (final fade): the half-resolution card the faded gain maps are computed from, and their canvases
let half = null, fadeAmp = null, fadeBias = null, fadeKey = -1, fadeMax = 1;

function blobNoise(w, h, seed) {
  const r = rng(seed), a = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0; i < a.length; i += 2) {
    const u = Math.max(1e-9, r()), v = r(), m = Math.sqrt(-2 * Math.log(u));
    a[i] = m * Math.cos(6.283185307 * v);
    if (i + 1 < a.length) a[i + 1] = m * Math.sin(6.283185307 * v);
  }
  const R = Math.ceil(SIGMA * 3), k = [];
  let k2 = 0;
  for (let i = -R; i <= R; i++) { const q = Math.exp(-0.5 * i * i / (SIGMA * SIGMA)); k.push(q); k2 += q * q; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -R; i <= R; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); s += a[y * w + xx] * k[i + R]; }
    b[y * w + x] = s;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -R; i <= R; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); s += b[yy * w + x] * k[i + R]; }
    a[y * w + x] = s / k2; // unit std
  }
  return a;
}

function build(plate) {
  const w = W + PAD, h = H + PAD, n = blobNoise(w, h, 40771);
  const mk = (sign) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    for (let i = 0; i < n.length; i++) {
      const v = Math.min(255, Math.round(Math.max(0, sign * n[i]) * GAIN));
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  tex = { pos: mk(1), neg: mk(-1) };
  // gain map: the wanted graded std at this pixel's graded brightness, divided by the grade's local slope
  // (S-curve slope per channel, averaged, times the vignette), so the grain lands at the source's strength
  const pd = plate.getContext("2d").getImageData(0, 0, W, H).data;
  const want = new Float32Array(W * H), bias = new Float32Array(W * H);
  ampMax = 0;
  const S = (f) => f * 0.65 + 0.35 * f * f * (3 - 2 * f), dS = (f) => 0.65 + 2.1 * f * (1 - f);
  for (let y = 0; y < H; y++) {
    const qy = ((1 - (y + 0.5) / H) - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const qx = ((x + 0.5) / W - 0.5) * 2, rr = Math.min(1, (qx * qx + qy * qy) / 2), vig = 1 - 0.38 * Math.pow(rr, 1.15);
      const i = (y * W + x) * 4, r = pd[i] / 255, g = pd[i + 1] / 255, b = pd[i + 2] / 255;
      const Lpost = 255 * vig * (S(r) + S(g) + S(b)) / 3;
      const slope = vig * (dS(r) + dS(g) + dS(b)) / 3;
      const v = curve(Lpost) / Math.max(0.3, slope);
      want[y * W + x] = v; if (v > ampMax) ampMax = v;
      bias[y * W + x] = interp(BIAS_CURVE, Lpost) / Math.max(0.3, slope);
    }
  }
  amp = document.createElement("canvas"); amp.width = W; amp.height = H;
  const ag = amp.getContext("2d"), ai = ag.createImageData(W, H), ad = ai.data;
  for (let i = 0; i < want.length; i++) { const v = Math.round((255 * want[i]) / ampMax); ad[i * 4] = ad[i * 4 + 1] = ad[i * 4 + 2] = v; ad[i * 4 + 3] = 255; }
  ag.putImageData(ai, 0, 0);
  // the mean shift, in pre-grade levels, dithered to whole levels
  biasC = document.createElement("canvas"); biasC.width = W; biasC.height = H;
  const bgx = biasC.getContext("2d"), bi = bgx.createImageData(W, H), bd = bi.data, rr = rng(40772);
  for (let i = 0; i < bias.length; i++) { const v = Math.floor(bias[i] + rr()); bd[i * 4] = bd[i * 4 + 1] = bd[i * 4 + 2] = v; bd[i * 4 + 3] = 255; }
  bgx.putImageData(bi, 0, 0);
  scr = [0, 1].map(() => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; });
  // half-resolution copy of the card (2x2 means) and its vignette, for the final fade's gain maps
  const hw = W >> 1, hh = H >> 1, hr = new Float32Array(hw * hh * 3), hv = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const q = ((2 * y + j) * W + 2 * x + i) * 4; r += pd[q]; g += pd[q + 1]; b += pd[q + 2]; }
    const o = (y * hw + x) * 3; hr[o] = r / 1020; hr[o + 1] = g / 1020; hr[o + 2] = b / 1020;
    const qx = ((2 * x + 1) / W - 0.5) * 2, qy = ((1 - (2 * y + 1) / H) - 0.5) * 2, rr2 = Math.min(1, (qx * qx + qy * qy) / 2);
    hv[y * hw + x] = 1 - 0.38 * Math.pow(rr2, 1.15);
  }
  half = { w: hw, h: hh, c: hr, v: hv };
  fadeAmp = document.createElement("canvas"); fadeAmp.width = hw; fadeAmp.height = hh;
  fadeBias = document.createElement("canvas"); fadeBias.width = hw; fadeBias.height = hh;
  fadeKey = -1;
}

// Fix pass 4: the source's final fade happens before its grade and its grain after it -- the picture's colours go the way
// a pre-grade darkening goes through the S-curve (red holds, green and blue drop faster), and the grain keeps the strength
// the grain-vs-brightness curve gives at the darkened brightness (sky-top high-pass std 4.7 / 3.9 / 3.4 / 2.9 / 2.0 at
// 140.32 / .44 / .56 / .64 / .76, where scaling it with the picture gave 3.2 / 2.4 / 1.5 / 1.0 / 0.0). s40 darkens the card
// by kf before the grade, and the gain and mean-shift maps here are recomputed (at half resolution) for the card * kf.
function fadeMaps(kf) {
  const key = Math.round(kf * 2000);
  if (key === fadeKey) return;
  fadeKey = key;
  const { w, h, c, v } = half, n = w * h, want = new Float32Array(n), bias = new Float32Array(n);
  const S = (f) => f * 0.65 + 0.35 * f * f * (3 - 2 * f), dS = (f) => 0.65 + 2.1 * f * (1 - f);
  let mx = 1e-6;
  for (let i = 0; i < n; i++) {
    const r = c[i * 3] * kf, g = c[i * 3 + 1] * kf, b = c[i * 3 + 2] * kf, vig = v[i];
    const Lpost = 255 * vig * (S(r) + S(g) + S(b)) / 3, slope = Math.max(0.3, vig * (dS(r) + dS(g) + dS(b)) / 3);
    const a = curve(Lpost) / slope; want[i] = a; if (a > mx) mx = a;
    bias[i] = interp(BIAS_CURVE, Lpost) / slope;
  }
  fadeMax = mx;
  const ag = fadeAmp.getContext("2d"), ai = ag.createImageData(w, h), ad = ai.data;
  const bg = fadeBias.getContext("2d"), bi = bg.createImageData(w, h), bd = bi.data;
  for (let i = 0; i < n; i++) {
    const a = Math.round((255 * want[i]) / mx), b = Math.round(bias[i]);
    ad[i * 4] = ad[i * 4 + 1] = ad[i * 4 + 2] = a; ad[i * 4 + 3] = 255;
    bd[i * 4] = bd[i * 4 + 1] = bd[i * 4 + 2] = b; bd[i * 4 + 3] = 255;
  }
  ag.putImageData(ai, 0, 0); bg.putImageData(bi, 0, 0);
}

// The grain for a frame whose card has been darkened by kf (pre-grade) for the final fade.
export function drawGrainFaded(ctx, t, base, kf, gain = 1) {
  if (!tex) build(base());
  fadeMaps(kf);
  const f = Math.round(t * 25);
  const ox = Math.floor(hash(f, 9011) * PAD), oy = Math.floor(hash(f, 9012) * PAD);
  const k = gain * fadeMax / GAIN;
  for (const [c, tx] of [[scr[0], tex.neg], [scr[1], tex.pos]]) {
    const g = c.getContext("2d");
    g.globalCompositeOperation = "copy"; g.globalAlpha = 1;
    g.drawImage(tx, -ox, -oy);
    g.globalCompositeOperation = "multiply";
    g.drawImage(fadeAmp, 0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "difference"; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k); ctx.drawImage(scr[0], 0, 0);
  ctx.globalAlpha = 1; ctx.drawImage(fadeBias, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "difference"; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k); ctx.drawImage(scr[1], 0, 0);
  ctx.restore();
}

// Add this frame's grain to ctx (opaque, pre-grade). `base()` returns the static card (it sets the gain map, once);
// `alpha` scales the grain's variance (used during the dissolve).
export function drawGrain(ctx, t, base, alpha = 1) {
  if (alpha <= 0) return;
  if (!tex) build(base());
  const f = Math.round(t * 25);
  const ox = Math.floor(hash(f, 9011) * PAD), oy = Math.floor(hash(f, 9012) * PAD);
  const k = Math.sqrt(alpha) * ampMax / GAIN;
  const parts = [[scr[0], tex.neg], [scr[1], tex.pos]];
  for (const [c, tx] of parts) {
    const g = c.getContext("2d");
    g.globalCompositeOperation = "copy"; g.globalAlpha = 1;
    g.drawImage(tx, -ox, -oy);
    g.globalCompositeOperation = "multiply";
    g.drawImage(amp, 0, 0);
    g.globalCompositeOperation = "source-over";
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#fff";
  // invert, add the negative half, invert back (= subtract it), then add the positive half
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "difference"; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k; ctx.drawImage(scr[0], 0, 0);
  ctx.globalAlpha = alpha; ctx.drawImage(biasC, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "difference"; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k; ctx.drawImage(scr[1], 0, 0);
  ctx.restore();
}

export function releaseGrain() { tex = null; amp = null; scr = null; biasC = null; half = null; fadeAmp = null; fadeBias = null; fadeKey = -1; }
