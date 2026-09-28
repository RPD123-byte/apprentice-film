// Dust puffs (s20, 64.44–66.84): the owl beating at the scissors kicks up a cloud of cartoon puffs round the blade
// foot. Measured on the source (grey, non-white pixels lifted > 20 levels over the clean frame 66.80): the cloud
// covers x 680–1030, y 410–830 (centre ≈ (845,650)) and grows until 65.60; then it rises (centre y 645 → 558 by
// 66.40, x only +15) and melts into a soft featureless haze (blur ramps 65.70–66.10), its lift falling 85 → 64
// (65.80) → 46 (66.00) → 34 (66.20) → 25 (66.40), gone by ≈ 66.7.
import { rng, clamp, smooth } from "../../lib/rng.js";

const TAU = Math.PI * 2;
// [id, birth, x, y, radius, drift x, drift y]
const PUFFS = [];
{
  const r = rng(404);
  for (let i = 0; i < 22; i++) {
    const birth = 64.44 + i * 0.045 + r() * 0.04;
    const x = 650 + r() * 340, y = 410 + Math.pow(r(), 0.85) * 400;
    PUFFS.push([i, birth, x, y, 56 + r() * 36, (r() - 0.5) * 40, -10 - r() * 30, (r() - 0.3) * 60, -50 - r() * 110]);
  }
}
let SPR = null, SOFT = null;
// a cartoon dust cloud: a lumpy union of discs, pale on top and grey underneath, a soft darker rim, speckles
function sprite() {
  if (SPR) return SPR;
  SPR = document.createElement("canvas"); SPR.width = SPR.height = 128;
  const g = SPR.getContext("2d");
  const r = rng(9), discs = [];
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + r() * 0.5, d = 14 + r() * 10; discs.push([64 + Math.cos(a) * d, 64 + Math.sin(a) * d * 0.8, 16 + r() * 8]); }
  discs.push([64, 64, 24]);
  const shape = () => { g.beginPath(); for (const [x, y, rr] of discs) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); } };
  g.filter = "blur(2px)"; g.fillStyle = "rgba(70,68,66,0.45)"; shape(); g.fill(); g.filter = "none";
  g.save(); shape(); g.clip();
  const gr = g.createLinearGradient(0, 24, 0, 110); gr.addColorStop(0, "rgb(214,212,206)"); gr.addColorStop(0.6, "rgb(176,174,170)"); gr.addColorStop(1, "rgb(130,128,124)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.filter = "blur(5px)"; g.strokeStyle = "rgba(60,58,56,0.35)"; g.lineWidth = 6; shape(); g.stroke(); g.filter = "none";
  g.fillStyle = "rgba(25,25,25,0.5)";
  for (let k = 0; k < 30; k++) { const a = r() * TAU, d = r() * 38; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 0.8 + r() * 1.3, 0, TAU); g.fill(); }
  g.restore();
  // the haze version: the same lumps, no rim or speckles, heavily blurred (drawn with a 256 px canvas so the blur fits)
  SOFT = document.createElement("canvas"); SOFT.width = SOFT.height = 256;
  const h = SOFT.getContext("2d");
  h.translate(64, 64);
  h.filter = "blur(14px)"; h.fillStyle = "rgb(150,148,144)";
  h.beginPath(); for (const [x, y, rr] of discs) { h.moveTo(x + rr * 1.1, y); h.arc(x, y, rr * 1.1, 0, TAU); } h.fill();
  h.filter = "none";
  return SPR;
}

// t: frame time. Returns nothing; draws the puffs (setup A frame).
export function drawPuffs(ctx, t) {
  if (t < 64.44 || t > 66.82) return;
  const S = sprite();
  const k = smooth(clamp((t - 65.74) / 0.42));          // 0 sharp puffs … 1 soft haze
  const drift = clamp((t - 65.6) / 0.8);
  // overall fade (measured lift, relative to 65.60)
  const FADE = [[65.6, 1], [65.8, 0.75], [66.0, 0.55], [66.2, 0.4], [66.4, 0.28], [66.56, 0.12], [66.7, 0]];
  let fade = t < 65.6 ? 1 : 0;
  for (let i = 1; i < FADE.length; i++) if (t >= FADE[i - 1][0] && t <= FADE[i][0]) { const [a, fa] = FADE[i - 1], [b, fb] = FADE[i]; fade = fa + (fb - fa) * (t - a) / (b - a); }
  for (const [id, b, x, y, R, dx, dy, ex, ey] of PUFFS) {
    if (t < b) continue;
    const age = t - b, grow = 0.55 + 0.45 * clamp(age / 0.5) + Math.min(age, 1.2) * 0.15 + 0.35 * k;
    const a = clamp(age / 0.12) * fade * 0.66;
    if (a <= 0.01) continue;
    const rr = R * grow * 1.9;
    const px = x + dx * Math.min(age, 1.2) + ex * drift, py = y + dy * Math.min(age, 1.2) + ey * drift;
    ctx.save();
    if (k < 1) { ctx.globalAlpha = a * (1 - k); ctx.drawImage(S, px - rr / 2, py - rr / 2, rr, rr); }
    if (k > 0) { ctx.globalAlpha = a * k * 0.5; const r2 = rr * 2; ctx.drawImage(SOFT, px - r2 / 2, py - r2 / 2, r2, r2); }
    ctx.restore();
  }
}
export function releasePuffs() { SPR = SOFT = null; }
