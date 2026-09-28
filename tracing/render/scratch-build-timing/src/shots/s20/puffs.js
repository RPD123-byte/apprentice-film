// Dust puffs (s20, 64.44–66.84): the owl flapping at the scissors kicks up a cloud of soft grey puffs round the
// speaker foot (x ≈ 700–1100); they swell and drift, then thin out and fade by ≈ 66.8. Each puff is a cluster of
// soft discs with a few darker speckles, deterministic per puff id.
import { rng, clamp, smooth } from "../../lib/rng.js";

const TAU = Math.PI * 2;
// [id, birth, x, y, radius, drift x, drift y]
const PUFFS = [];
{
  // the cloud builds round the scissors' blades and the owl's wing: x 690–900, y 480–830 (measured at 65.0–65.6)
  const r = rng(404);
  for (let i = 0; i < 22; i++) {
    const birth = 64.44 + i * 0.045 + r() * 0.04;
    const x = 630 + r() * 270, y = 440 + Math.pow(r(), 0.55) * 390;
    PUFFS.push([i, birth, x, y, 52 + r() * 36, (r() - 0.7) * 50, -10 - r() * 40, "back"]);
  }
}
let SPR = null;
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
  const gr = g.createLinearGradient(0, 24, 0, 110); gr.addColorStop(0, "rgb(228,226,220)"); gr.addColorStop(0.6, "rgb(184,182,178)"); gr.addColorStop(1, "rgb(136,134,130)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.filter = "blur(5px)"; g.strokeStyle = "rgba(60,58,56,0.35)"; g.lineWidth = 6; shape(); g.stroke(); g.filter = "none";
  g.fillStyle = "rgba(25,25,25,0.55)";
  for (let k = 0; k < 36; k++) { const a = r() * TAU, d = r() * 38; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 0.8 + r() * 1.4, 0, TAU); g.fill(); }
  g.restore();
  return SPR;
}

export function drawPuffs(ctx, t, layer) {
  if (t < 64.44 || t > 66.9) return;
  const S = sprite();
  const fade = 1 - smooth((t - 65.7) / 1.1);          // the cloud thins out after the owl leaves
  for (const [id, b, x, y, R, dx, dy, lay] of PUFFS) {
    if (lay !== layer || t < b) continue;
    const age = t - b, grow = 0.55 + 0.45 * clamp(age / 0.5) + age * 0.15;
    const a = clamp(age / 0.12) * fade * 0.92;
    if (a <= 0.01) continue;
    const rr = R * grow * 1.9, px = x + dx * Math.min(age, 1.5), py = y + dy * Math.min(age, 1.5);
    ctx.save(); ctx.globalAlpha = a;
    ctx.drawImage(S, px - rr / 2, py - rr / 2, rr, rr);
    ctx.restore();
  }
}
