// s06 fix pass 2 (2026-09-26): repairs from the second review, each MEASURED on the source (numbers only; no pixels are
// stored or loaded). See fidelity/s06.md "Fix pass 2" and snapshots/s06-fix2-tools/ for the measuring scripts.
import { W, H } from "../../config.js";
import { ZA } from "./data/fix2_za.js";
import { drawInk } from "./ink.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

const mkc = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };

// ---------------------------------------------------------------------------------------------------------------------
// Frame edges. Every layer is drawn half a pixel down-right (pixel-centre data) and stops at the frame, so row 0 and
// the outer columns came out nearly black (row 0 mean 5 against the source's 44). The neighbouring row / column is
// copied onto them (s05 and s07 match the source there; the cut no longer flashes a border).
export function edges(ctx) {
  const c = ctx.canvas;
  // (source-over: the frame is opaque, so this is a plain copy; "copy" would clear the rest of the canvas)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
  // (the source's outer columns are darker than their neighbours: col 0 = 0.71 x col 1, col 2205 = 0.7 x col 2204)
  ctx.drawImage(c, 0, 1, W, 1, 0, 0, W, 1);
  ctx.globalAlpha = 0.83; ctx.drawImage(c, 1, 0, 1, H, 0, 0, 1, H);
  ctx.globalAlpha = 0.7; ctx.drawImage(c, W - 2, 0, 1, H, W - 1, 0, 1, H);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The hair above the left brow's inner end (defect 1 of review 2).
// (a) The hair layer has small enclosed holes there (x 791-810, y 192-213): in the neutral they show the neutral face
// (dark), but as the smile fades in they showed the smile face (grey ~120) as a hard-edged lozenge inside the black hair.
// The holes are found in `over` (enclosed pixels with alpha < 250, dilated 1 px) and `under` is laid into them just
// before `over`, so they always show the dark neutral drawing.
export const HOLE_BOX = [770, 175, 822, 222];
export function holePatch(over, under, B = HOLE_BOX) {
  const [x0, y0, x1, y1] = B, w = x1 - x0, h = y1 - y0;
  const a = over.getContext("2d").getImageData(x0, y0, w, h).data;
  const T = new Uint8Array(w * h), seen = new Uint8Array(w * h), st = [];
  for (let i = 0; i < w * h; i++) T[i] = a[i * 4 + 3] < 250 ? 1 : 0;
  const push = (i) => { if (T[i] && !seen[i]) { seen[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { if (a[x * 4 + 3] < 10) push(x); const j = (h - 1) * w + x; if (a[j * 4 + 3] < 10) push(j); }
  for (let y = 0; y < h; y++) { const i = y * w, j = y * w + w - 1; if (a[i * 4 + 3] < 10) push(i); if (a[j * 4 + 3] < 10) push(j); }
  while (st.length) {
    const i = st.pop(), x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  const [mc, mg] = mkc(w, h), img = mg.createImageData(w, h), d = img.data;
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let hole = 0;
    for (let dy = -1; dy <= 1 && !hole; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx; if (T[j] && !seen[j]) { hole = 1; break; }
    }
    if (hole) { d[(y * w + x) * 4 + 3] = 255; n++; }
  }
  mg.putImageData(img, 0, 0);
  const [pc, pg] = mkc(w, h);
  pg.drawImage(under, x0, y0, w, h, 0, 0, w, h);
  pg.globalCompositeOperation = "destination-in"; pg.drawImage(mc, 0, 0);
  return { canvas: pc, x: x0, y: y0, n };
}

// (b) In the source the hair there slides up along its strands with the smile (and lags the mouth): the pale band that
// runs down-left from (792,224) moves up by up to 18 px, so new pale strands run from the brow's inner end (801,202),
// and the two pale strands of the neutral at (803-819, 180-200) go dark. HK = the amount of that change per source
// frame: least-squares projection of each frame onto (held smile - neutral) inside the patch (patchA.py ramp). The
// frame's own hair there (under + holes + over, static) is remapped per pixel by HK x the measured slide (data/fix2_za.js)
// and laid back inside the patch polygon, feathered.
const HK_T = { 679: 0.06, 680: 0.065, 681: 0.075, 682: 0.10, 683: 0.14, 684: 0.195, 685: 0.27, 686: 0.29, 687: 0.34, 688: 0.47,
  689: 0.555, 690: 0.565, 691: 0.63, 692: 0.675, 693: 0.74, 694: 0.80, 695: 0.81, 696: 0.865, 697: 0.905, 698: 0.91, 699: 0.935,
  700: 0.945, 701: 0.955, 702: 0.98, 703: 0.99 };
export const hk = (n) => (n < 679 ? 0 : n > 703 ? 1 : HK_T[n]);
const PATCH_A = [[806, 178], [800, 188], [794, 197], [788, 205], [782, 212], [776, 220], [771, 228], [767, 236], [765, 243],
  [784, 243], [792, 233], [798, 223], [804, 213], [810, 203], [816, 193], [821, 183], [818, 175]];
// the static hair of the box as the frame shows it in the neutral (under, the holes' fill, over), premultiplied
export function zoneA(under, hole, over, F = ZA) {
  const [x0, y0] = F.box, w = (F.nx - 1) * F.step + 1, h = (F.ny - 1) * F.step + 1;
  const [c, g] = mkc(w, h);
  g.drawImage(under, x0, y0, w, h, 0, 0, w, h);
  g.drawImage(hole.canvas, hole.x - x0, hole.y - y0);
  g.drawImage(over, x0, y0, w, h, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data, pm = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { pm[i * 3] = px[i * 4]; pm[i * 3 + 1] = px[i * 4 + 1]; pm[i * 3 + 2] = px[i * 4 + 2]; }
  // the patch mask: polygon, feathered
  const [mc, mg] = mkc(w, h);
  mg.filter = `blur(${1.5}px)`; mg.fillStyle = "#fff"; mg.translate(-x0, -y0);
  mg.beginPath(); PATCH_A.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill();
  const ma = mg.getImageData(0, 0, w, h).data, mask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = ma[i * 4 + 3] / 255;
  return { x0, y0, w, h, pm, mask, canvas: c, g, img: g.createImageData(w, h), F };
}
export function hairPatchA(ctx, Z, s) {
  if (s <= 0.001) return;
  const { w, h, pm, mask, img, F } = Z, out = img.data, st = F.step, nx = F.nx, d = F.d;
  for (let y = 0; y < h; y++) {
    const gv = Math.min(F.ny - 1.0001, y / st), j = Math.floor(gv), b = gv - j;
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 4, mv = mask[y * w + x];
      if (mv < 0.002) { out[q + 3] = 0; continue; }
      const gu = Math.min(nx - 1.0001, x / st), i = Math.floor(gu), a = gu - i;
      const o00 = (j * nx + i) * 2, o10 = o00 + 2, o01 = o00 + nx * 2, o11 = o01 + 2;
      const dx = (d[o00] * (1 - a) + d[o10] * a) * (1 - b) + (d[o01] * (1 - a) + d[o11] * a) * b;
      const dy = (d[o00 + 1] * (1 - a) + d[o10 + 1] * a) * (1 - b) + (d[o01 + 1] * (1 - a) + d[o11 + 1] * a) * b;
      const sx = Math.max(0, Math.min(w - 1.0001, x - s * dx)), sy = Math.max(0, Math.min(h - 1.0001, y - s * dy));
      const xi = Math.floor(sx), yi = Math.floor(sy), fx = sx - xi, fy = sy - yi;
      const p00 = (yi * w + xi) * 3, p10 = p00 + 3, p01 = p00 + w * 3, p11 = p01 + 3;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      for (let c = 0; c < 3; c++) out[q + c] = pm[p00 + c] * w00 + pm[p10 + c] * w10 + pm[p01 + c] * w01 + pm[p11 + c] * w11;
      out[q + 3] = mv * 255;
    }
  }
  Z.g.putImageData(img, 0, 0);
  ctx.drawImage(Z.canvas, Z.x0, Z.y0);
}

// (c) the strands that the slide does not bring: the smile's dark ground over the vanished neutral strands, and the
// smile's pale strands (ridges traced on the held-smile mean, patchA.py export: x, y, perpendicular FWHM, ungraded
// peak, ungraded ground per point), drawn as pale ink at HK
const DARK_A = [[806, 177], [800, 188], [794, 197], [788, 205], [783, 211], [789, 215], [797, 214], [804, 210], [810, 202],
  [816, 193], [821, 183], [818, 175]];
const STRANDS_A = [[811.7, 177, 2.8, 0.825, 0.038, 810.3, 179, 3.14, 0.757, 0.08, 808.5, 181, 2.86, 0.481, 0.191, 807.1, 183, 2.15, 0.435, 0.185, 805.9, 185, 2.44, 0.495, 0.087, 805.6, 186, 2.69, 0.408, 0.062],
  [794.5, 201, 2.68, 0.355, 0.086, 793.1, 203, 2.34, 0.385, 0.105, 791.3, 205, 2.24, 0.349, 0.2],
  [787.8, 210, 1.48, 0.38, 0.179, 785.8, 212, 1.85, 0.451, 0.144, 783.8, 214, 2.01, 0.523, 0.196, 782.2, 216, 1.92, 0.531, 0.205, 780.9, 218, 1.69, 0.49, 0.189, 780.3, 219, 1.72, 0.442, 0.295],
  [801.7, 201, 2.04, 0.416, 0.136, 800.2, 203, 2.39, 0.804, 0.264, 798.2, 205, 3.16, 0.827, 0.224, 797.2, 207, 2.5, 0.505, 0.151, 795.1, 209, 3.02, 0.684, 0.183, 793.8, 211, 4.24, 0.885, 0.222, 792.7, 213, 4.45, 0.895, 0.346, 791.4, 215, 3.58, 0.93, 0.371, 788.0, 217, 2.55, 0.853, 0.521, 785.7, 219, 2.06, 0.804, 0.522, 783.0, 221, 1.28, 0.7, 0.553, 780.8, 223, 1.69, 0.595, 0.462, 779.1, 225, 1.04, 0.605, 0.493],
  [806.3, 202, 1.86, 0.691, 0.299, 805.1, 204, 1.83, 0.62, 0.246, 803.9, 206, 2.27, 0.793, 0.187, 802.9, 208, 2.3, 0.458, 0.093, 801.4, 210, 2.51, 0.61, 0.144, 800.2, 212, 2.54, 0.686, 0.283, 798.8, 214, 2.29, 0.688, 0.304, 797.4, 216, 2.22, 0.672, 0.281, 796.1, 218, 2.28, 0.635, 0.25, 794.5, 220, 2.27, 0.62, 0.251, 793.1, 222, 2.22, 0.689, 0.334, 791.9, 224, 2.06, 0.702, 0.343, 790.4, 226, 2.08, 0.67, 0.351, 789.0, 228, 1.95, 0.693, 0.383]];
const STRAND_OPTS = { bright: true, soft: 0.45, end: 3, endMin: 0.3, wMin: 0.5, gain: 1.0, dv: 0 };
export function strandsA(ctx, a) {
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.filter = "blur(1.2px)";
  const c = Math.round(0.09 * 255); ctx.fillStyle = `rgb(${c},${c},${c})`;
  ctx.beginPath(); DARK_A.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.filter = "none";
  ctx.translate(0.5, 0.5);
  drawInk(ctx, STRANDS_A, STRAND_OPTS);
  ctx.restore();
}

// (d) The hair's lower-right edge at the left brow's inner end (x 820-845, y 198-224) retreats 2-3 px up-left in the
// smile (the skin under it is bright in the held smile: 150-235 where the static hair layer draws 40-60). A band of the
// hair layer along that edge (pixels of `over` within 2.5 px of its transparent side, in EDGE_BOX) is built once, and
// the frame's smile face (the `mix` canvas) is laid back into it at the smile amount.
const EDGE_BOX = [818, 196, 848, 226];
export function edgeBand(over, B = EDGE_BOX, r = 2.5) {
  const [x0, y0, x1, y1] = B, w = x1 - x0, h = y1 - y0, R = Math.ceil(r);
  const a = over.getContext("2d").getImageData(x0 - R, y0 - R, w + 2 * R, h + 2 * R).data, W2 = w + 2 * R;
  const al = (x, y) => a[((y + R) * W2 + x + R) * 4 + 3] / 255;
  const [mc, mg] = mkc(w, h), img = mg.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = al(x, y); if (v < 0.3) continue;
    let near = 0;
    for (let dy = -R; dy <= R && !near; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r && al(x + dx, y + dy) < 0.3) { near = 1; break; }
    if (near) d[(y * w + x) * 4 + 3] = 255;
  }
  mg.putImageData(img, 0, 0);
  const [bc, bg] = mkc(w, h);
  bg.filter = `blur(${0.6}px)`; bg.drawImage(mc, 0, 0);
  const [sc, sg] = mkc(w, h);
  return { x0, y0, w, h, mask: bc, sc, sg };
}
export function drawEdgeBand(ctx, E, mix, mx, my, a) {
  if (a <= 0.001) return;
  const { sg, sc, mask, x0, y0, w, h } = E;
  sg.globalCompositeOperation = "copy"; sg.drawImage(mix, x0 - mx, y0 - my, w, h, 0, 0, w, h);
  sg.globalCompositeOperation = "destination-in"; sg.drawImage(mask, 0, 0);
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(sc, x0, y0); ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The right brow's outer end under the hair strand (defect 2 of review 2): the hair layer (traced on the neutral, where
// a bright skin gap shows between the strands at x 1229-1240, y 175-182) stays bright there, while in the smile the
// brow's hairs fill the gap (graded 85-160) and the thin dark strand on its left edge (x 1226 -> 1232, y 170 -> 185,
// graded 15-35) runs unbroken. Measured on the held-smile mean; laid over the hair at the smile amount: the grey fill
// (feathered 0.8 px), then the strand.
const NOTCH_P = [[1229.5, 174], [1234, 173.8], [1235.8, 175.5], [1237.3, 177.5], [1239, 180], [1238, 181.2], [1231, 181.5], [1229, 180], [1228.5, 177]];
const NOTCH_V = 0.47;
const NOTCH_B = [[1231, 182.3], [1234.5, 182.2], [1238.5, 181.4]];
const NOTCH_S = [[1226, 170], [1227, 174], [1228, 176.5], [1229, 178.5], [1230, 180.5], [1231, 182.5], [1232.5, 184.5]];
export function notchR(ctx, k) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(0.5, 0.5);
  ctx.globalAlpha = Math.min(1, k); ctx.filter = "blur(0.8px)";
  let c = Math.round(NOTCH_V * 255); ctx.fillStyle = `rgb(${c},${c},${c})`;
  for (const P of [NOTCH_P]) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
  // the brow's shadow under the gap (graded 45-75 at y 181-183 in the smile)
  c = Math.round(0.2 * 255);
  ctx.filter = "blur(0.6px)";
  taper(ctx, sampleCurve(NOTCH_B, 4), (u) => 2.4 * Math.min(1, 0.3 + u * 4, 0.3 + (1 - u) * 4), `rgb(${c},${c},${c})`);
  // the strand is static in the source: the warp breaks it at any smile amount, so it is laid back at 4 k
  ctx.globalAlpha = Math.min(1, 4 * k); ctx.filter = "blur(0.4px)";
  c = Math.round(0.06 * 255);
  taper(ctx, sampleCurve(NOTCH_S, 4), (u) => 2.6 * Math.min(1, 0.4 + u * 5, 0.4 + (1 - u) * 5), `rgb(${c},${c},${c})`);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// Hair ink (defect 3 of review 2). The traced hair layer is lighter in its darks than the source (graded percentiles
// p5/p10/p25 2-7 levels high in the hair and beanie) and 25-30 % softer (high-pass std at sigma 2). Inside the hair and
// nape coverage only (not the beanie, fist, pencil or lid drawn over them; s06.js passes those as `above`), the cached
// layer's darks are deepened (value x DK below T0, easing back to x1 at T1) and it is sharpened (unsharp mask, radius
// SR, amount SA). Done once on the cached `over` canvas. (The same on the beanie, and a local-contrast / darkening pass on
// the brows, were tried and scored worse; see fidelity/s06.md.)
export function inkHair(over, hairOnly, above, o = {}) {
  const DK = o.DK ?? 1, SA = o.SA ?? 0, SR = o.SR ?? 1.5, T0 = o.T0 ?? 0.2, T1 = o.T1 ?? 0.45;
  if (DK === 1 && SA === 0) return;
  const g = over.getContext("2d"), im = g.getImageData(0, 0, W, H), d = im.data;
  const A = hairOnly.getContext("2d").getImageData(0, 0, W, H).data, B = above.getContext("2d").getImageData(0, 0, W, H).data;
  let bl = null;
  if (SA) { const [bc, bg] = mkc(W, H); bg.filter = `blur(${SR}px)`; bg.drawImage(over, 0, 0); bl = bg.getImageData(0, 0, W, H).data; }
  const EX = o.skip || null;   // [x0, y0, x1, y1, feather]: a box left alone
  for (let i = 0; i < W * H; i++) {
    let m = (A[i * 4 + 3] / 255) * (1 - B[i * 4 + 3] / 255);
    if (EX) { const x = i % W, y = (i / W) | 0, f = EX[4]; const dx = Math.max(EX[0] - x, x - EX[2], 0), dy = Math.max(EX[1] - y, y - EX[3], 0); m *= Math.min(1, Math.hypot(dx, dy) / f); }
    if (m < 0.004 || d[i * 4 + 3] < 250) continue;
    for (let c = 0; c < 3; c++) {
      let v = d[i * 4 + c] / 255;
      if (SA) v += SA * (v - bl[i * 4 + c] / 255);
      if (DK !== 1) { const t = Math.max(0, Math.min(1, (v - T0) / (T1 - T0))), f = DK + (1 - DK) * t * t * (3 - 2 * t); v *= f; }
      d[i * 4 + c] = Math.round(255 * Math.max(0, Math.min(1, (d[i * 4 + c] / 255) * (1 - m) + v * m)));
    }
  }
  g.putImageData(im, 0, 0);
}

// ---------------------------------------------------------------------------------------------------------------------
// The owl's right earcup: the cushion's dark left rim (the edge between the white face and the dark cushion) is 14-29
// levels too light in a 2-3 px band right of the edge on every frame (column error on the still owl). A dark stroke
// follows the measured edge (still-owl coordinates; during the blink it is drawn inside the cup's transform).
const CUP_RIM = [[1785.2, 270], [1785.6, 284], [1786.8, 296], [1788, 308], [1788.8, 320], [1789.4, 332], [1790, 344], [1790.5, 356], [1790.6, 368]];
export function cupRim(ctx) {
  ctx.save(); ctx.translate(0.5, 0.5); ctx.filter = `blur(${0.6}px)`;
  const c = Math.round(0.04 * 255);
  taper(ctx, sampleCurve(CUP_RIM.map(([x, y]) => [x + 0.3, y]), 4), (u) => 2.4 * Math.min(1, 0.3 + u * 6, 0.3 + (1 - u) * 6), `rgb(${c},${c},${c})`);
  ctx.restore();
}

// Under the owl's right foot a 15 px pale dash remained (+55 levels, x 1698-1706, y 619-620): the source's dark crease
// there runs on from (1694,617.5) to (1714,622.3) (graded 85-130), the render's only from x 1706. A grey stroke along
// the measured crease.
const FOOT = [[1693.5, 617.4], [1697.5, 618.6], [1701.5, 619.7], [1705.5, 620.7], [1709.5, 621.5], [1713.5, 622.2]];
export function footCrease(ctx) {
  ctx.save(); ctx.translate(0.5, 0.5); ctx.filter = "blur(0.5px)";
  const c = Math.round(0.35 * 255);
  taper(ctx, sampleCurve(FOOT, 4), (u) => 1.6 * Math.min(1, 0.3 + u * 5, 0.3 + (1 - u) * 5), `rgb(${c},${c},${c})`);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The laptop lid's rim (x 300-1860): the lower bevel highlight (rows 830-833) is at the source's height (peak rows
// measured per 100 px: 831.1-831.7) but 10-25 levels too dim, and the black band just under it (rows 835-837) is
// 4-6 levels too light (row profiles over 4 frames). A crisp pale line along the measured highlight peaks and a faint
// dark line along the band.
const RIM_HL = [[300, 831.3], [600, 831.25], [900, 831.2], [1100, 831.45], [1400, 831.6], [1550, 831.35], [1700, 831.35], [1860, 831.4]];
export function rimLow(ctx) {
  const path = (P, dy) => { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.5, y + dy + 0.5) : ctx.moveTo(x + 0.5, y + dy + 0.5))); };
  ctx.save(); ctx.lineCap = "butt";
  ctx.globalAlpha = 0.25; ctx.lineWidth = 1.2; const c = 200; ctx.strokeStyle = `rgb(${c},${c},${c})`;
  path(RIM_HL, 0); ctx.stroke();
  ctx.globalAlpha = 0.3; ctx.lineWidth = 2.5; ctx.strokeStyle = "rgb(0,0,0)";
  path(RIM_HL, 4.8); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The outer contour of the wrist and fist, (560,640) -> (688,788): the traced line is lighter than the source's (its
// darkest graded value 88-144 against 72-92) and sits 1-3 px outside along its normal at y 655-730. A tapered dark
// stroke through the source's measured centres (darkest point of each cross profile, neutral and smile agree within
// 1 px), baked into the cached `over` so it lifts with the fist.
const WRIST = [[560, 640], [561, 655], [567, 670], [579, 685], [595, 700], [613, 715], [628, 730], [645, 745], [659, 760], [674, 775], [688, 788]];
export function wristLine(o) {
  o.save(); o.translate(0.5, 0.5); o.filter = `blur(${0.7}px)`;
  const c = Math.round(0.08 * 255), W0 = 2.8;
  taper(o, sampleCurve(WRIST, 6), (u) => { const e = Math.min(1, u / 0.15, (1 - u) / 0.15); return 2 + (W0 - 2) * e; }, `rgb(${c},${c},${c})`);
  o.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The upper-lid seams (review 2, low): after fix pass 1's blur band a row-wise residual remains where the brow layer's
// straight cut meets the face layer. Mean row error (graded levels, render - source) over the neutral (668-677) and the
// held smile (712-725), measured across each lid's span: [row, neutral, smile, mean level]. Each row is pulled back by
// (1 - k) neutral + k smile, feathered 12 px at the span's ends.
const LID_ROWS = {
  // (the left lid takes 1.5 x its measured error: at 1 x only two thirds of it came off, measured)
  L: { x0: 808, x1: 943, g: 1.5, rows: [[282, 3.6, 3.2, 192], [283, 4.6, 3.9, 194], [284, 5.3, 2.1, 195], [285, 4.2, -0.2, 197], [287, -3.3, -4.4, 197]] },
  R: { x0: 1129, x1: 1183, g: 1, rows: [[276, 2.7, 6.7, 152], [277, 0.5, 5.0, 150], [280, -5.3, -4.7, 140], [281, -7.5, -3.9, 137], [285, -2.7, -5.0, 140], [286, -2.6, -5.0, 141], [287, -3.3, -3.1, 140]] },
};
export function lidRows(ctx, k) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const s of Object.values(LID_ROWS)) {
    for (const [y, eN, eS, v] of s.rows) {
      const e = s.g * ((1 - k) * eN + k * eS); if (Math.abs(e) < 0.5) continue;
      const a = e > 0 ? e / v : -e / (255 - v), col = e > 0 ? "0,0,0" : "255,255,255";
      const gr = ctx.createLinearGradient(s.x0, 0, s.x1, 0), f = 12 / (s.x1 - s.x0);
      gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(f, `rgba(${col},${a})`); gr.addColorStop(1 - f, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.fillRect(s.x0, y, s.x1 - s.x0, 1);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// Colour (review 2, low). The source's blacks are green (graded darks < 12: R/G/B 2.7/4.1/2.3 against the render's
// 3.9/3.9/3.8): R and B are pulled down in the cached layers' darks (pre-grade luminance < 16 fully, easing out by 48).
// The face and the fist are left out (their darks are not green in the source: face darks R/G/B -1.4/0/-0.6 against
// the source already; with them included the eyes' error rose 0.04).
export function darkCast(canvases, skip = [], dR = 4, dG = 0, dB = 4) {
  if (!dR && !dB && !dG) return;
  const [mc, mg] = mkc(W, H);
  mg.fillStyle = "#fff"; mg.fillRect(0, 0, W, H); mg.globalCompositeOperation = "destination-out"; mg.filter = "blur(6px)";
  for (const P of skip) { mg.beginPath(); P.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill(); }
  const M = mg.getImageData(0, 0, W, H).data;
  for (const c of canvases) {
    const g = c.getContext("2d"), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3] || !M[i + 3]) continue;
      const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (L >= 48) continue;
      const w = (L <= 16 ? 1 : 1 - (L - 16) / 32) * (M[i + 3] / 255);
      d[i] = Math.max(0, Math.round(d[i] - dR * w)); d[i + 1] = Math.max(0, Math.round(d[i + 1] - dG * w)); d[i + 2] = Math.max(0, Math.round(d[i + 2] - dB * w));
    }
    g.putImageData(im, 0, 0);
  }
}

// The owl is warm in the render (R/G/B 226.1/225.1/223.3 over its body) where the source is faintly green
// (224.7/226.3/223.6): inside the owl's own coverage (the still owl's alpha, blurred 3 px) R is scaled by 0.994, per
// frame after the owl is drawn. (Adding green as well matched the channel means but raised the owl's error: its darks
// are not green in the source.)
export function owlTintBuild(owl) {
  const [c, x, y] = owl, w = c.width, h = c.height;
  const [mc, mg] = mkc(w, h); mg.filter = "blur(3px)"; mg.drawImage(c, 0, 0);
  const [uc, ug] = mkc(w, h); ug.fillStyle = `rgb(${Math.round(255 * 0.994)},255,255)`; ug.fillRect(0, 0, w, h);
  ug.globalCompositeOperation = "destination-in"; ug.drawImage(mc, 0, 0);
  return { mul: uc, x, y };
}
export function owlTint(ctx, T) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply"; ctx.drawImage(T.mul, T.x, T.y);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The room's two beaded cables at the left (diagonal (285,282) -> (470,125), vertical x 420-441, y 130-345): the traced
// room draws their beads soft and 25-30 % dim (brightest 2 %: 72 against 101 on the diagonal, 92 against 128 on the
// vertical). Each bead measured on the source's static room (beads.py: centre, the cable's direction, graded peak) is
// stamped as a small bright bar across the cable, once, into the cached room.
const BEADS = [[420.4, 132.0, 1.44, 95], [421.1, 136.9, 1.43, 96], [421.8, 141.9, 1.42, 53], [423.0, 146.2, 1.42, 66], [422.7, 150.8, 1.41, 107], [424.0, 155.7, 1.41, 86], [423.9, 161.3, 1.4, 74], [424.8, 166.7, 1.4, 67], [425.8, 172.2, 1.4, 104], [426.9, 178.1, 1.39, 100], [427.9, 184.0, 1.39, 101], [429.0, 190.0, 1.39, 98], [430.2, 193.8, 1.4, 44], [431.3, 200.3, 1.4, 105], [431.9, 206.8, 1.4, 109], [434.0, 213.0, 1.41, 151], [434.1, 220.1, 1.42, 138], [435.2, 227.1, 1.43, 131], [436.0, 233.0, 1.43, 136], [437.0, 241.0, 1.45, 127], [437.8, 247.9, 1.46, 128], [440.1, 255.2, 1.48, 109], [441.1, 262.1, 1.5, 106], [440.0, 267.2, 1.51, 106], [439.7, 272.2, 1.53, 84], [440.9, 277.2, 1.54, 105], [440.0, 282.2, 1.56, 80], [440.0, 288.1, 1.58, 101], [439.9, 293.1, 1.6, 87], [439.8, 298.1, 1.62, 80], [439.0, 303.0, 1.64, 91], [438.1, 308.0, 1.66, 100], [437.9, 315.0, 1.69, 51], [437.0, 321.4, 1.72, 90], [434.1, 341.6, 1.81, 103], [287.1, 277.3, -0.49, 86], [293.0, 275.8, -0.49, 121], [298.3, 273.1, -0.49, 77], [307.0, 268.4, -0.49, 67], [312.1, 265.1, -0.49, 113], [317.6, 262.7, -0.5, 101], [323.1, 260.2, -0.5, 107], [328.2, 258.0, -0.51, 73], [333.0, 255.3, -0.51, 72], [338.0, 251.9, -0.52, 70], [342.1, 249.0, -0.52, 43], [346.1, 247.8, -0.53, 53], [350.9, 245.0, -0.54, 83], [355.9, 242.6, -0.54, 100], [360.0, 239.5, -0.55, 69], [365.0, 238.1, -0.56, 87], [370.0, 233.8, -0.58, 73], [374.8, 230.0, -0.59, 86], [378.9, 227.2, -0.6, 74], [382.8, 224.0, -0.61, 59], [386.2, 221.0, -0.62, 77], [390.1, 218.7, -0.63, 102], [394.2, 215.0, -0.65, 92], [398.1, 212.0, -0.67, 70], [402.7, 209.0, -0.68, 93], [405.9, 204.4, -0.7, 67], [410.0, 200.8, -0.72, 58], [414.0, 197.9, -0.74, 86], [428.9, 189.8, -0.8, 96], [428.1, 184.2, -0.81, 97], [436.2, 178.9, -0.86, 41], [439.0, 174.1, -0.88, 100], [443.0, 169.1, -0.91, 109], [446.0, 165.1, -0.94, 104], [449.2, 160.7, -0.96, 66], [451.8, 155.9, -0.99, 135], [454.4, 151.0, -1.02, 169], [458.0, 146.8, -1.05, 71], [460.0, 143.2, -1.07, 77], [462.9, 137.8, -1.1, 128], [465.8, 133.0, -1.13, 123], [468.2, 129.0, -1.16, 107]];
export function beads(g) {
  const gain = 0.9, ax = 0.8, cx = 1.8;
  g.save(); g.filter = `blur(${0.45}px)`;
  for (const [x, y, a, pk] of BEADS) {
    // graded peak -> ungraded tone (vignette ~0.8 here, S-curve slope ~0.75 at these levels)
    const v = Math.min(1, gain * (pk / 255) / 0.8 / 0.95), c = Math.round(255 * v);
    g.fillStyle = `rgb(${c},${c},${c})`;
    g.beginPath(); g.ellipse(x + 0.5, y + 0.5, ax, cx, a, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
