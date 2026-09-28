// s20 (build 3): the dust the owl beats out of the scissors (64.52–66.84). Cauliflower puffs (clusters of soft
// grey lobes with dark speckles) appear one by one where the source shows them (positions and onset frames read
// off 0.04–0.16 s strips of the source), then, once the owl backs off (65.56), they swell, drift up, soften and
// melt away (gone by 66.84). Drawn at half resolution into a scratch canvas (softness for free), seeded.
import { rng, clamp, smooth } from "../../../lib/rng.js";

// [x, y, r, onset time]
const PUFFS = [
  [760, 700, 46, 64.52], [732, 758, 40, 64.6], [802, 742, 38, 64.64], [700, 682, 44, 64.72], [842, 792, 36, 64.76],
  [662, 722, 42, 64.84], [898, 440, 34, 64.96], [868, 474, 30, 65.0], [942, 790, 38, 65.08], [640, 782, 46, 65.12],
  [618, 690, 42, 65.24], [962, 760, 34, 65.28], [880, 402, 34, 65.36], [702, 806, 44, 65.4], [842, 700, 40, 65.44],
  [920, 522, 32, 65.48], [792, 640, 36, 65.2], [612, 620, 34, 65.32],
];
const LOBES = PUFFS.map((p, i) => {
  const r = rng(300 + i), n = 4 + Math.floor(r() * 2), L = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.8, d = 0.3 + r() * 0.25; L.push([Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.1, 0.55 + r() * 0.2]); }
  L.push([0, 0.05, 0.7]);
  const dots = []; for (let k = 0; k < 5; k++) dots.push([(r() - 0.5) * 1.1, (r() - 0.5) * 0.9, 0.025 + r() * 0.03]);
  return { L, dots, vx: (r() - 0.5) * 30, vy: -20 - r() * 45 };
});

let C = null;
const HS = 0.5;                     // scratch scale
const X0 = 480, Y0 = 280, CW = 640, CH = 640;
export function drawDust(g, t) {
  if (t < 64.5 || t > 66.86) return;
  if (!C) { C = document.createElement("canvas"); C.width = CW * HS; C.height = CH * HS; }
  const c = C.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, C.width, C.height);
  c.setTransform(HS, 0, 0, HS, -X0 * HS, -Y0 * HS);
  const after = clamp((t - 65.56) / 1.2);          // 0 while beating, 1 at 66.76
  const fade = t < 65.6 ? 1 : Math.max(0, 1 - smooth((t - 65.6) / 1.2)) * 0.9 + (t < 66.84 ? 0.02 : 0);
  const soft = after;
  PUFFS.forEach(([x, y, r, t0], i) => {
    if (t < t0) return;
    const P = LOBES[i];
    const grow = smooth((t - t0) / 0.16);
    const R = r * (0.35 + 0.65 * grow) * (1 + 0.6 * after);
    const px = x + P.vx * after, py = y + P.vy * after;
    for (const [dx, dy, lr] of P.L) {
      const lx = px + dx * R, ly = py + dy * R, rr = lr * R;
      const gr = c.createRadialGradient(lx - rr * 0.25, ly - rr * 0.3, rr * 0.1, lx, ly, rr);
      const a = 0.9;
      gr.addColorStop(0, `rgba(196,193,187,${a * 0.9})`); gr.addColorStop(0.6, `rgba(160,158,152,${a * 0.85})`);
      gr.addColorStop(0.88, `rgba(118,116,112,${a * (0.7 - 0.4 * soft)})`); gr.addColorStop(1, "rgba(90,90,88,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(lx, ly, rr, 0, Math.PI * 2); c.fill();
    }
    if (soft < 0.5) for (const [dx, dy, dr] of P.dots) { c.fillStyle = `rgba(40,38,36,${0.7 * (1 - soft * 2)})`; c.beginPath(); c.arc(px + dx * R, py + dy * R, Math.max(1.2, dr * R), 0, Math.PI * 2); c.fill(); }
  });
  g.save();
  g.globalAlpha *= fade;
  if (soft > 0.05) g.filter = `blur(${(2 + soft * 12).toFixed(1)}px)`;
  g.drawImage(C, X0, Y0, CW, CH);
  g.restore();
}
export function releaseDust() { C = null; }
