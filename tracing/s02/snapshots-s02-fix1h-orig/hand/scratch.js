// s02 scratchboard helpers for the dark room: white marks cut into black (wood grain, print mesh, soft glows).
import { rng, noise1, noise2 } from "../../../lib/rng.js";
import { sampleCurve } from "../../../lib/paths.js";
import { gv, ribbon, P_SWELL, P_TIP2, PI, withClip, poly } from "./pen.js";

// wood grain: long white lines along a direction inside a clip, value v (0..1) sets line width/density
//   rect = [x0,y0,x1,y1]; dir 0 = vertical lines, 1 = horizontal lines
export function wood(g, clip, rect, { v = 0.4, sp = 6, dir = 0, seed = 1, wave = 1.5, len = [60, 400], alpha = 0.9, val = null, gap = 0.25 } = {}) {
  const [x0, y0, x1, y1] = rect, r = rng(seed);
  g.save(); g.beginPath(); clip(g); g.clip();
  const A = dir ? y0 : x0, B = dir ? y1 : x1, C = dir ? x0 : y0, D = dir ? x1 : y1;
  for (let a = A + r() * sp; a < B; a += sp * (0.7 + r() * 0.6)) {
    let c = C - 20 * r();
    while (c < D) {
      const L = len[0] + r() * (len[1] - len[0]);
      if (r() > gap) {
        const pts = [];
        for (let k = 0; k <= 8; k++) { const cc = c + (L * k) / 8, aa = a + noise1(cc * 0.01 + a * 0.3, seed) * wave; pts.push(dir ? [cc, aa] : [aa, cc]); }
        const mid = pts[4], vv = val ? val(mid[0], mid[1]) : v;
        const w = Math.max(0.3, sp * vv * (0.6 + r() * 0.7));
        ribbon(g, pts, P_TIP2(w, 0.15, 0.15), gv(0.9, alpha));
      }
      c += L + 4 + r() * 30;
    }
  }
  g.restore();
}
// print mesh (the source's dark shelves / book rows): a grid of soft white dots (pitch ~5.7 px, measured on a 5x crop)
// in columns, each column with its own brightness (spines) and some columns dark; dot size follows the value
export function mesh(g, clip, rect, { v = 0.25, pitch = 5.7, seed = 1, val = null, alpha = 0.85, jit = 0.2, cols = true } = {}) {
  const [x0, y0, x1, y1] = rect, r = rng(seed);
  g.save(); g.beginPath(); clip(g); g.clip();
  g.fillStyle = gv(0.86, alpha);
  const ox = x0 + r() * pitch, oy = y0 + r() * pitch;
  let ci = 0;
  for (let x = ox; x < x1; x += pitch, ci++) {
    // column factor: runs of 2-6 columns share a spine brightness, ~20% of runs dark
    const run = Math.floor(ci / (3 + Math.floor(hashc(ci >> 2, seed) * 4)));
    const cf = !cols ? 1 : hashc(run, seed + 7) < 0.1 ? 0.45 : 0.75 + 0.5 * hashc(run, seed + 11);
    for (let y = oy; y < y1; y += pitch) {
      const vv = (val ? val(x, y) : v) * cf * (1 + noise2(x * 0.018, y * 0.018, seed) * 0.6) * (1 + (r() - 0.5) * jit);
      if (vv <= 0.03) continue;
      const sz = pitch * Math.min(0.8, Math.sqrt(vv) * 0.72);
      g.beginPath(); g.ellipse(x, y, sz * 0.5, sz * 0.62, 0, 0, 2 * PI); g.fill();
    }
  }
  g.restore();
}
const hashc = (i, s) => { let h = (i * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// a white line (edge highlight, cable, board edge) through control points
export function wline(g, pts, w, a = 0.9, v = 0.9, end = 0.3) { ribbon(g, sampleCurve(pts, 8), P_SWELL(w, end), gv(v, a)); }
// a beaded (dotted) cable: dashes along a curve
export function beads(g, pts, { w = 5, len = 4, gapL = 3, a = 0.85, seed = 1 } = {}) {
  const q = sampleCurve(pts, 14); let acc = 0, on = true, run = [];
  for (let i = 1; i < q.length; i++) {
    const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); acc += d; run.push(q[i]);
    if (on && acc > len) { if (run.length > 1) ribbon(g, [run[0], run[run.length - 1]], w, gv(0.88, a)); acc = 0; on = false; run = [q[i]]; }
    else if (!on && acc > gapL) { acc = 0; on = true; run = [q[i]]; }
  }
}
// soft value glow (for light falling on things): radial gradient additive-ish
export function glow(g, x, y, rx, ry, v, a = 1) {
  g.save(); g.translate(x, y); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, gv(v, a)); gr.addColorStop(1, gv(v, 0));
  g.fillStyle = gr; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
}
export const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
