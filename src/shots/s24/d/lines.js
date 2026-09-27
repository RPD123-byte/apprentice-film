import { rng } from "../../../lib/rng.js";
// s24 speed lines: drawing of the measured line sets (lineData.js). Statistics measured on the source (k30–k53,
// lines away from the owl and scissors, frame px), used to check the render:
//   angle ≈ 32° (median principal axis of thin components, 5 frames: 32.0–32.7°; per-set projection fit 31.7–33.4°)
//   cross-section density ≈ 2.8 lines per 100 px; FWHM widths 4–18 px (median 6); wider lines are brighter
//   closed segment lengths: 10/25/50/75/90 % = 76 / 189 / 293 / 438 / 674 px
export const LINE_OPTS = {
  blur: 1.0,                                         // the bars are drawn crisp and softened as a layer
  soft: true,                                        // fix pass 1: tapered, smeared bars + hairlines (drawMeasuredSetSoft)
  smear: 3,                                          // fix pass 1: extra smear along the lines (px each way)
  streaks: 4,                                        // fix pass 1: faint hairline streaks per 100 px across
  measured: { gain: 1.09, wAdd: 0, wMul: 1.0 },      // value gain / width tweak fitted on k25–45 line statistics
};

// draw a measured set (lineData.js): soft round-capped bars with a three-stop value ramp along each
export function drawMeasuredSet(ctx, set, { gain = 1, wAdd = 0, wMul = 1 } = {}) {
  const a = set.ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  ctx.save();
  ctx.setTransform(c, s, -s, c, 0, 0);
  ctx.lineCap = "round";
  for (const [u0, u1, v, w, a0, a1, a2] of set.bars) {
    const lw = Math.max(0.8, w * wMul + wAdd);
    const g = ctx.createLinearGradient(u0, 0, u1, 0);
    const f = (x) => { const q = Math.max(0, Math.min(255, Math.round(x * gain))); return `rgb(${q},${q},${q})`; };
    g.addColorStop(0, f(a0)); g.addColorStop(0.5, f(a1)); g.addColorStop(1, f(a2));
    ctx.strokeStyle = g; ctx.lineWidth = lw;
    // round caps extend past the ends: pull the ends in by half the width
    const e = Math.min(lw / 2, (u1 - u0) / 2);
    ctx.beginPath(); ctx.moveTo(u0 + e, v); ctx.lineTo(Math.max(u0 + e, u1 - e), v); ctx.stroke();
  }
  ctx.restore();
}

// fix pass 1: the bars as tapered strokes (≈27 % of the width at both ends, full width after 15 % of the length),
// drawn in a rotated buffer (u along the lines) and smeared along u, plus a seeded layer of faint hairline streaks
// (values 35–60, ≈4 per 100 px across, 150–600 px long), then rotated back into the frame. Returns a frame canvas.
export function drawMeasuredSetSoft(set, { gain = 1, wMul = 1, wAdd = 0, smear = 3, streaks = 4, seed = 1 } = {}, W = 2206, H = 946) {
  const a = set.ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  // u/v extents of the frame
  const us = [0, W * c, H * s, W * c + H * s], vs = [0, -W * s, H * c, -W * s + H * c];
  const u0 = Math.floor(Math.min(...us)) - 8, u1 = Math.ceil(Math.max(...us)) + 8, v0 = Math.floor(Math.min(...vs)) - 8, v1 = Math.ceil(Math.max(...vs)) + 8;
  const bw = u1 - u0, bh = v1 - v0;
  const mk = (w, h) => { const q = document.createElement("canvas"); q.width = w; q.height = h; return q; };
  const R = mk(bw, bh), g = R.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, bw, bh);
  const f = (x) => { const q = Math.max(0, Math.min(255, Math.round(x * gain))); return `rgb(${q},${q},${q})`; };
  // faint hairlines first (under the bars)
  const r = rng(seed * 7919 + 13);
  const n = Math.round((bh / 100) * streaks * (bw / 1200));
  for (let i = 0; i < n; i++) {
    const v = r() * bh, L = 150 + r() * 450, u = r() * (bw + L) - L, w = 1 + r() * 0.5, val = 35 + r() * 25;
    const gr = g.createLinearGradient(u, 0, u + L, 0);
    gr.addColorStop(0, f(0)); gr.addColorStop(0.3, f(val)); gr.addColorStop(0.7, f(val)); gr.addColorStop(1, f(0));
    g.fillStyle = gr; g.fillRect(u, v - w / 2, L, w);
  }
  for (const [b0, b1, v, w, a0, a1, a2] of set.bars) {
    const lw = Math.max(0.8, w * wMul + wAdd), L = b1 - b0, x0 = b0 - u0, y = v - v0;
    if (L <= 0) continue;
    const e = Math.min(L * 0.15, lw * 3), hw = lw / 2, tip = hw * 0.27;
    const gr = g.createLinearGradient(x0, 0, x0 + L, 0);
    gr.addColorStop(0, f(a0)); gr.addColorStop(0.5, f(a1)); gr.addColorStop(1, f(a2));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x0, y - tip); g.quadraticCurveTo(x0 + e * 0.35, y - hw, x0 + e, y - hw); g.lineTo(x0 + L - e, y - hw); g.quadraticCurveTo(x0 + L - e * 0.35, y - hw, x0 + L, y - tip);
    g.lineTo(x0 + L, y + tip); g.quadraticCurveTo(x0 + L - e * 0.35, y + hw, x0 + L - e, y + hw); g.lineTo(x0 + e, y + hw); g.quadraticCurveTo(x0 + e * 0.35, y + hw, x0, y + tip);
    g.closePath(); g.fill();
  }
  // smear along u: average of 2·smear + 1 shifted copies
  let src = R;
  if (smear > 0) {
    const M = mk(bw, bh), m = M.getContext("2d"), k = 2 * smear + 1;
    m.fillStyle = "#000"; m.fillRect(0, 0, bw, bh); m.globalCompositeOperation = "lighter"; m.globalAlpha = 1 / k;
    for (let i = -smear; i <= smear; i++) m.drawImage(R, i, 0);
    src = M;
  }
  const out = mk(W, H), o = out.getContext("2d");
  o.fillStyle = "#000"; o.fillRect(0, 0, W, H);
  o.setTransform(c, s, -s, c, 0, 0);          // (u, v) → frame
  o.drawImage(src, u0, v0);
  o.setTransform(1, 0, 0, 1, 0, 0);
  return out;
}
