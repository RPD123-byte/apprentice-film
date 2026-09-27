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
// the source's dark shelves / book rows (fix pass 1): not a dot halftone but a woven grid of thin white lines, verticals
// and horizontals ~5.7 px apart (measured on a 5x crop), hand-irregular: jittered spacing, a slight slope and wobble per
// line, runs of columns sharing a brightness (spines), dark voids. Line width follows the value (coverage
// 1-(1-w/p)^2 = 0.95 v: the source's lit weave is bright lines round small dark holes); ROOM_TONE was refitted for it
// yfade: world y above which (smaller y) the weave keeps only half its coverage (the panels of the stare room continue
// above the frame, into the pan world, where the source is darker than the tone-corrected stare view)
// fix pass 2 (review medium: a sparse regular tartan of thin white lines with bright columns): the lines are now grey
// (`grey`) and as wide as the value needs, so the weave reads as a dense grid of light lines round small dark cells; the
// runs of brighter columns are capped at 1.15x the mean
export function mesh(g, clip, rect, { v = 0.25, pitch = 5.7, seed = 1, val = null, alpha = 0.85, jit = 0.2, cols = true, yfade = null, grey = 0.46, strips = true } = {}) {
  const [x0, y0, x1, y1] = rect, r = rng(seed), p = pitch;
  g.save(); g.beginPath(); clip(g); g.clip();
  g.lineCap = "butt";
  const col = gv(grey, 1);
  // dark voids: a few soft-edged rectangles per panel where the weave drops out
  const voids = [];
  const nv = Math.round(((x1 - x0) * (y1 - y0)) / 90000);
  for (let i = 0; i < nv; i++) { const w = 20 + r() * 70, h = 30 + r() * 140; voids.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), w, h, 0.25 + r() * 0.5]); }
  // tall dark strips (gaps between spines / posts behind the weave), 5-14 px half-width
  if (strips) for (let i = 0; i < Math.round((x1 - x0) / 70); i++) voids.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 5 + r() * 9, 120 + r() * 400, 0.1 + r() * 0.3]);
  const vd = (x, y) => { let k = 1; for (const [vx, vy, w, h, a] of voids) if (Math.abs(x - vx) < w && Math.abs(y - vy) < h) k *= a; return k; };
  const colF = (ci) => { const run = Math.floor(ci / (3 + Math.floor(hashc(ci >> 2, seed) * 4))); return !cols ? 1 : hashc(run, seed + 7) < 0.14 ? 0.55 : 0.86 + 0.29 * hashc(run, seed + 11); };
  const value = (x, y, cf) => (val ? val(x, y) : v) * cf * (1 + noise2(x * 0.018, y * 0.018, seed) * 0.6) * vd(x, y) * (yfade === null ? 1 : 0.5 + 0.5 * Math.max(0, Math.min(1, (y - yfade + 60) / 60)));
  const seg = 9;
  // family: 0 = vertical lines (stepping x), 1 = horizontal lines (stepping y); verticals carry ~60% of the tone
  for (const fam of [0, 1]) {
    const A0 = fam ? y0 : x0, A1 = fam ? y1 : x1, B0 = fam ? x0 : y0, B1 = fam ? x1 : y1, share = fam ? 0.75 : 1.25;
    let ci = 0;
    for (let a = A0 + r() * p; a < A1; a += p * (1 + (r() - 0.5) * jit * 1.5), ci++) {
      const cf = fam ? 0.85 + 0.3 * hashc(ci, seed + 3) : colF(ci), slope = (r() - 0.5) * 0.012, ph = r() * 50;
      for (let b = B0; b < B1; b += seg) {
        const bm = b + seg / 2, am = a + slope * (bm - B0) + noise1(bm * 0.02 + ph, seed + fam) * 0.7;
        const x = fam ? bm : am, y = fam ? am : bm;
        const vv = value(x, y, cf) * (1 + (r() - 0.5) * jit);
        if (vv <= 0.02) continue;
        const c = Math.min(0.92, 0.95 * vv * share * 0.86 / grey), w = p * (1 - Math.sqrt(1 - c));
        const wd = Math.max(1.2, w), al = alpha * Math.min(1, w / 1.2);
        const a0 = a + slope * (b - B0) + noise1(b * 0.02 + ph, seed + fam) * 0.7, a1 = a + slope * (b + seg - B0) + noise1((b + seg) * 0.02 + ph, seed + fam) * 0.7;
        g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = wd;
        g.beginPath();
        if (fam) { g.moveTo(b, a0); g.lineTo(b + seg + 0.3, a1); } else { g.moveTo(a0, b); g.lineTo(a1, b + seg + 0.3); }
        g.stroke();
      }
    }
  }
  g.globalAlpha = 1;
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
// a ribbed cable (fix pass 1: the source's cables are solid, not dashed): a tapered pale stroke with dark ticks across it
export function cable(g, pts, { w = 5, a = 0.85, pitch = 4.2, seed = 1 } = {}) {
  const q = sampleCurve(pts, 14);
  ribbon(g, q, P_SWELL(w, 0.6), gv(0.82, a));
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], d = Math.hypot(dx, dy); acc += d;
    if (acc < pitch || d < 1e-6) continue;
    acc = 0;
    const nx = -dy / d, ny = dx / d, h = w * 0.55, p = q[i];
    ribbon(g, [[p[0] - nx * h - dx / d, p[1] - ny * h - dy / d], [p[0] + nx * h + dx / d, p[1] + ny * h + dy / d]], 1.2, gv(0.03, 0.75));
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
