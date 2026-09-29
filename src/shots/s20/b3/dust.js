// s20: the dust the owl beats out of the scissors (64.52–66.84). Fix pass 1: each puff is a cauliflower of 6–8
// overlapping lobes (80–100 px overall; lit upper left, grey lower right, a few dark specks), over a soft haze cone
// running from the blades down and left (about (760, 560) -> (650, 800)); each puff bursts in with 6–10 short radial
// lines for ~0.12 s; once the owl backs off (65.56) the cloud swells, rises (the column reaches y ~300 by 66.0),
// softens and melts away (gone by 66.84). Positions and onsets read off 0.04–0.16 s strips of the source. Drawn at half
// resolution into a scratch canvas, all seeded.
import { rng, clamp, smooth } from "../../../lib/rng.js";

// [x, y, r, onset time]
const PUFFS = [
  [760, 700, 46, 64.52], [732, 758, 40, 64.6], [802, 742, 38, 64.64], [700, 682, 44, 64.72], [842, 792, 36, 64.76],
  [662, 722, 42, 64.84], [898, 440, 34, 64.96], [868, 474, 30, 65.0], [942, 790, 38, 65.08], [640, 782, 46, 65.12],
  [618, 690, 42, 65.24], [962, 760, 34, 65.28], [880, 402, 34, 65.36], [702, 806, 44, 65.4], [842, 700, 40, 65.44],
  [920, 522, 32, 65.48], [792, 640, 36, 65.2], [612, 620, 34, 65.32],
];
const LOBES = PUFFS.map((p, i) => {
  const r = rng(300 + i), n = 6 + Math.floor(r() * 3), L = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.7, d = 0.34 + r() * 0.26; L.push([Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.05, 0.5 + r() * 0.24]); }
  L.push([0.05, 0.02, 0.62]);
  const dots = []; for (let k = 0; k < 3; k++) dots.push([(r() - 0.5) * 1.0, (r() - 0.5) * 0.8, 0.018 + r() * 0.015]);
  const burst = []; const nb = 6 + Math.floor(r() * 5); for (let k = 0; k < nb; k++) burst.push([(k / nb) * Math.PI * 2 + r() * 0.5, 0.9 + r() * 0.5, 0.35 + r() * 0.35]);
  // after the back-off the cloud drifts up and to the right, toward the gap between the blades and the owl (source
  // 65.76: the upper mass at (810–1000, 350–600))
  // fix pass 2: after the beating stops (65.48) the cloud drifts +100..150 px right toward the owl (source 65.64–65.80:
  // light added peaks at x 850–950 in y 560–840)
  return { L, dots, burst, vx: (p[1] < 560 ? -20 : i % 3 === 0 ? 0 : 45) + r() * 45, vy: -40 - r() * 80 - Math.max(0, 760 - p[1]) * 0.1 };
});
// fix pass 2: seeded grain tile (1–2 px speckle, light and dark) laid over the puffs (source-atop)
let GR = null;
function grain() {
  if (GR) return GR;
  const N = 96, c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d"), im = g.createImageData(N, N), r = rng(911);
  for (let i = 0; i < N * N; i++) {
    const v = r(), d = v < 0.5 ? 30 : 245, a = Math.abs(v - 0.5) * 2;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = d; im.data[i * 4 + 3] = Math.round(255 * a * a);
  }
  g.putImageData(im, 0, 0);
  GR = c;
  return c;
}

let C = null;
const HS = 0.5;                     // scratch scale
const X0 = 440, Y0 = 160, CW = 720, CH = 780;
export function drawDust(g, t) {
  if (t < 64.5 || t > 66.86) return;
  if (!C) { C = document.createElement("canvas"); C.width = CW * HS; C.height = CH * HS; }
  const c = C.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, C.width, C.height);
  c.setTransform(HS, 0, 0, HS, -X0 * HS, -Y0 * HS);
  // purity fix: the burst lines set lineCap "round" on this reused scratch context and nothing reset it, so the puff
  // outlines were stroked with whatever cap the previous frame left. Set it every frame, as the published render drew
  // it: butt (a fresh context's default) on the first dust frame (64.52), round from then on.
  c.lineCap = t < 64.54 ? "butt" : "round";
  const after = clamp((t - 65.56) / 1.0);          // 0 while beating, 1 at 66.56
  const lift = smooth(clamp((t - 65.5) / 0.5));   // the column rises over 65.5–66.0
  const fade = t < 65.6 ? 1 : Math.max(0, 1 - smooth((t - 65.6) / 1.0)) * 0.78 + (t < 66.84 ? 0.02 : 0);
  const soft = after;
  // haze cone from the blades down-left, growing with the number of puffs out
  const hz = clamp((t - 64.55) / 0.6) * (1 - 0.5 * after);
  if (hz > 0) {
    c.save(); c.filter = "blur(18px)";
    const q = c.createLinearGradient(760, 560 - 120 * lift, 650, 800);
    q.addColorStop(0, `rgba(170,168,162,${(0.18 * hz).toFixed(3)})`); q.addColorStop(0.6, `rgba(160,158,152,${(0.26 * hz).toFixed(3)})`); q.addColorStop(1, "rgba(150,148,142,0)");
    c.fillStyle = q; c.beginPath(); c.moveTo(740, 520 - 200 * lift); c.lineTo(840, 540 - 200 * lift); c.lineTo(900, 820); c.lineTo(600, 860); c.lineTo(620, 700); c.closePath(); c.fill();
    c.restore();
  }
  // the upper column rising beside the owl's face (source 65.60–66.40: x 800–950, y 250–560)
  const col = smooth(clamp((t - 65.56) / 0.16)) * (1 - smooth(clamp((t - 66.1) / 0.6)));
  if (col > 0) {
    c.save(); c.filter = "blur(22px)";
    const q = c.createLinearGradient(0, 250, 0, 600);
    q.addColorStop(0, "rgba(180,178,172,0)"); q.addColorStop(0.3, `rgba(186,184,178,${(0.4 * col).toFixed(3)})`); q.addColorStop(0.75, `rgba(190,188,182,${(0.5 * col).toFixed(3)})`); q.addColorStop(1, "rgba(180,178,172,0)");
    c.fillStyle = q; c.beginPath(); c.ellipse(838, 440, 72, 190, 0.06, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const drift = smooth(clamp((t - 65.48) / 0.32));
  PUFFS.forEach(([x, y, r, t0], i) => {
    if (t < t0) return;
    const P = LOBES[i];
    const grow = smooth((t - t0) / 0.16);
    const R = r * 1.08 * (0.35 + 0.65 * grow) * (1 + 0.55 * after);
    const px = x + P.vx * drift, py = y + P.vy * lift * (0.6 + 0.4 * after);
    // a fine outline round the lobes' union (stroked first, the fills cover the inner parts)
    if (soft < 0.6) {
      c.strokeStyle = `rgba(232,229,222,${(0.55 * (1 - soft / 0.6)).toFixed(3)})`; c.lineWidth = 3;
      for (const [dx, dy, lr] of P.L) { c.beginPath(); c.arc(px + dx * R, py + dy * R, lr * R * 0.97, 0, Math.PI * 2); c.stroke(); }
    }
    for (const [dx, dy, lr] of P.L) {
      const lx = px + dx * R, ly = py + dy * R, rr = lr * R;
      const gr = c.createRadialGradient(lx - rr * 0.35, ly - rr * 0.4, rr * 0.05, lx, ly, rr);
      gr.addColorStop(0, "rgba(212,209,202,0.9)"); gr.addColorStop(0.6, "rgba(176,173,167,0.86)");
      gr.addColorStop(0.9, `rgba(150,148,143,${(0.5 - 0.3 * soft).toFixed(3)})`); gr.addColorStop(1, "rgba(130,128,124,0)");
      c.fillStyle = gr; c.beginPath(); c.arc(lx, ly, rr, 0, Math.PI * 2); c.fill();
    }

    // burst lines at the strike
    const b = 1 - clamp((t - t0) / 0.12);
    if (b > 0) {
      c.strokeStyle = `rgba(225,222,215,${(0.7 * b).toFixed(3)})`; c.lineWidth = 3; c.lineCap = "round";
      for (const [a, d0, len] of P.burst) { c.beginPath(); c.moveTo(px + Math.cos(a) * R * d0, py + Math.sin(a) * R * d0); c.lineTo(px + Math.cos(a) * R * (d0 + len), py + Math.sin(a) * R * (d0 + len)); c.stroke(); }
    }
  });
  // grain inside the dust (1–2 px speckle, ~0.15–0.3), fading as the cloud melts
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-atop"; c.globalAlpha = 0.32 * (1 - 0.6 * soft);
  c.fillStyle = c.createPattern(grain(), "repeat"); c.fillRect(0, 0, C.width, C.height); c.restore();
  g.save();
  g.globalAlpha *= fade;
  // after ~66.0 the puffs merge into one soft column (a 40–60 px blur)
  const merge = smooth(clamp((t - 65.84) / 0.3));
  const bl = (soft > 0.05 ? 2 + soft * 10 : 0) + 42 * merge;
  if (bl > 0) g.filter = `blur(${bl.toFixed(1)}px)`;
  g.drawImage(C, X0, Y0, CW, CH);
  g.restore();
}
export function releaseDust() { C = null; GR = null; }
