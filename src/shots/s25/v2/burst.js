// s25 v2 — fix pass 2: the burst (102.64–102.96). On the source the four converging echo owls meet at the centre and
// shoot through each other: a huge motion-smeared X of wings (x ≈ 450–1850), and a vertical ghost column of the rising
// owl (x ≈ 850–1300, from the top of the frame down to ~800) with a streaky, grating-like texture; inside it the owl
// stays readable (face ≈ (975–1100, 280–490), beak open) until 102.96. Built here from the painted owl layers (no fog):
//   column : copies of the central owl stepped up (and down) the column, clipped to it, multiplied by a seeded texture
//            of vertical streaks 3–6 px wide
//   arms   : per arm, soft copies of the dive drawing strung along the arm, aligned with it (the smeared owls)
//   owl    : the central owl, head at the positions read off 0.8x grid crops of 2568–2574
// Arm end points (0.42x grid sheet of 2566–2575): from the centre (1030, 420) to (570, 230), (1830, 600), (480, 680),
// (1520, 260).
import { rng } from "../../../lib/rng.js";
import { echoAffine } from "./echo2.js";

const W = 2206, H = 946, CX0 = 800, CX1 = 1330;
let STRIPE = null, TMP = null;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// seeded vertical streak texture over the column: white with alpha 0.35–1 in stripes 3–6 px wide, blurred vertically
function stripes() {
  if (STRIPE) return STRIPE;
  const w = CX1 - CX0, c = mk(w, H), g = c.getContext("2d"), r = rng(2566);
  g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(0, 0, w, H);
  for (let x = 0; x < w;) {
    const sw = 3 + Math.floor(r() * 4), a = r();
    g.fillStyle = a > 0.5 ? `rgba(255,255,255,${(0.35 + 0.65 * r()).toFixed(3)})` : `rgba(0,0,0,${(0.3 * r()).toFixed(3)})`;
    // each streak broken into a few vertical runs
    for (let y = -40; y < H;) { const L = 60 + r() * 220; if (r() > 0.2) g.fillRect(x, y, sw, L); y += L + r() * 40; }
    x += sw;
  }
  const b = mk(w, H), bg = b.getContext("2d");
  bg.filter = "blur(1px)"; bg.drawImage(c, 0, 0); bg.filter = "none";
  // directional (vertical) smear: stacked shifted copies
  const out = mk(w, H), og = out.getContext("2d");
  for (let k = -6; k <= 6; k++) { og.globalAlpha = 1 / 13 * 1.6; og.drawImage(b, 0, k * 6); }
  og.globalAlpha = 1;
  STRIPE = out;
  return out;
}

// the central owl per frame: [head x, head y, scale, rotation, alpha] (the dive drawing, its head as anchor)
const OWL = {
  2568: [1050, 405, 1.0, -0.19, 0.85], 2569: [1040, 392, 1.0, -0.19, 0.85], 2570: [1030, 380, 1.0, -0.2, 0.85],
  2571: [1035, 372, 1.02, -0.2, 0.85], 2572: [1040, 362, 1.04, -0.2, 0.82], 2573: [1045, 356, 1.06, -0.2, 0.8], 2574: [1050, 350, 1.08, -0.2, 0.55],
};
// the smeared arms: [end x, end y] from the centre; per frame an overall alpha and reach (grows then fades)
const ARMS = [[570, 230], [1830, 600], [480, 680], [1520, 260]], C0 = [1030, 420];
const ARM_A = { 2568: 1, 2569: 1, 2570: 0.95, 2571: 0.9, 2572: 0.8, 2573: 0.7, 2574: 0.55 };
// reach of the left arms (UL, LL) and the right arms (UR, LR) per frame: the X closes in on the owl over 102.72–102.96
const REACH_L = { 2568: 1, 2569: 0.75, 2570: 0.65, 2571: 0.55, 2572: 0.45, 2573: 0.4, 2574: 0.35 };
const REACH_R = { 2568: 1, 2569: 0.95, 2570: 0.9, 2571: 0.8, 2572: 0.6, 2573: 0.5, 2574: 0.4 };
export const BP = { arm: 0.04, col: 1.2, up: 1.8 };
// (up: the copies high in the column are brighter; the source's column hides the headline: 139–156 post-grade at
// y 0–100 over 102.72–102.96)
// the column: copies stepped up/down (px per step), alpha per copy, per frame
const COL = { 2566: [70, 0.1], 2567: [70, 0.14], 2568: [60, 0.16], 2569: [60, 0.16], 2570: [60, 0.16], 2571: [60, 0.16], 2572: [60, 0.15], 2573: [60, 0.15], 2574: [60, 0.14] };

export function drawBurst(g, f, blit, hovM = null, { arms = true, owl = true, col: colK = 1 } = {}) {
  if (!TMP) TMP = mk(W, H);
  const tg = TMP.getContext("2d");
  // 1) the ghost column
  const col = COL[f];
  if (col) {
    const [step, al] = col;
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, W, H);
    const src = OWL[f] ? ["dive~s", echoAffine("dive", ...OWL[f].slice(0, 4))] : ["hov2~s", null];
    for (let k = -5; k <= 8; k++) {
      if (k === 0) continue;
      const m = (src[1] || hovM).slice();
      m[5] -= k * step;
      blit(tg, src[0], m, colK * BP.col * al * (k < 0 ? 0.7 : k >= 3 ? BP.up : 1));
    }
    tg.globalCompositeOperation = "destination-in";
    tg.drawImage(stripes(), CX0, 0);
    tg.globalCompositeOperation = "source-over";
    g.save(); g.beginPath(); g.rect(CX0, 0, CX1 - CX0, H); g.clip();
    g.drawImage(TMP, 0, 0);
    g.restore();
  }
  // 2) the smeared X of wings
  const aa = arms ? ARM_A[f] : 0;
  if (aa) {
    for (const [ex, ey] of ARMS) {
      const R = ex < C0[0] ? REACH_L[f] : REACH_R[f];
      const dx = (ex - C0[0]) * R, dy = (ey - C0[1]) * R, ang = Math.atan2(dy, dx);
      // the dive drawing's own head→tail axis points at 158°; turn it so its body lies along the arm, head outward
      const rot = ang + Math.PI - (158 * Math.PI) / 180;
      for (let k = 0; k < 9; k++) {
        const u = 0.18 + (k / 8) * 0.95, hx = C0[0] + dx * u, hy = C0[1] + dy * u, sc = 0.95 + 0.35 * (k / 8);
        blit(g, "dive~s", echoAffine("dive", hx, hy, sc, rot), BP.arm * aa);
      }
    }
  }
  // 3) the owl itself
  const o = owl ? OWL[f] : null;
  if (o) blit(g, "dive", echoAffine("dive", o[0], o[1], o[2], o[3]), o[4]);
}
export function releaseBurst() { STRIPE = null; TMP = null; }
