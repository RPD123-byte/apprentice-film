// s17 coffee steam: in the source the two strands over the mug curl and drift upward, redrawn on twos.
// The page (sokoIll.js) has them static, so this covers that patch with the wall's own tone and draws them again.
// Page coordinates (drawn under the shot's camera transform). Deterministic in t.
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

export const STEAM_BOX = [812, 356, 868, 467];
const MUG_TOP = 466;

export function drawSteam(ctx, t, bg = "#030303") {
  const [x0, y0, x1, y1] = STEAM_BOX;
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const td = t;   // the caller passes the drawing time (s17/owl.js drawTick: on twos, then on ones)
  // two strands twisting round each other (half a wave apart), waves drifting upward, wider toward the top
  for (let i = 0; i < 2; i++) {
    const top = 100 - 10 * i, lam = 50 + 4 * i, ph = i * 1.7 + 0.4;
    const pts = [];
    for (let h = 4; h <= top; h += 2) {
      const f = Math.min(1, h / top);
      const A = 3 + 8 * Math.pow(f, 0.8);
      const x = 838 + 8 * i + A * Math.sin((2 * Math.PI * h) / lam - 3.4 * td + ph) + 3 * Math.sin(0.7 * td + 1.3 * i) * f;
      pts.push([x, MUG_TOP - h]);
    }
    const q = sampleCurve(pts, 2);
    // one short gap that rises along the strand
    const g0 = ((0.35 * td + 0.5 * i) % 1 + 1) % 1;
    let seg = [];
    const flush = () => {
      if (seg.length > 3) taper(ctx, seg, (u) => 1.9 * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 0.4), "rgba(228,228,228,0.85)");
      seg = [];
    };
    for (let k = 0; k < q.length; k++) {
      const u = k / (q.length - 1);
      const d = Math.abs(u - (0.3 + 0.6 * g0));
      if (d < 0.035) flush(); else seg.push(q[k]);
    }
    flush();
  }
  ctx.restore();
}
