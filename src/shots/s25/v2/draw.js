// s25 v2 — the painter for the measured owl drawings (s25/v2/data/*.js). A drawing, in 104.60 page px, is:
//   hull  : the figure's outline rings — filled with the darkest ink value (base)
//   parts : closed regions (polygons with holes) — tier 2 = mid-grey pieces (headphones, shaded metal), tier 1 = the
//           white paper areas between the ink lines; each filled with a linear value plane t = [a, bx, by, cx, cy,
//           rim, rimw] (value a at (cx, cy), slopes per 100 px, darkened by rim·e^(−d/rimw) toward the region's edge)
//   ink   : grey line shapes (feather strokes, fine detail), one value each
//   edge  : [k, σ] the silhouette's soft shade: value ·= 1 − k·blur_σ(outside)
// plus a seeded paper grain in the whites. Values are pre-grade (0 black … 1 white).
import { rng } from "../../../lib/rng.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";

// a tapered pen along a measured line (flat [x, y, …]); thin ends
function penLine(g, flat, w, v) {
  const pts = []; for (let i = 0; i + 1 < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  if (pts.length < 2) return;
  const q = pts.length > 2 ? sampleCurve(pts, 4) : pts;
  taper(g, q, (u) => w * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.5)), gray(v));
}
// seeded feather strokes inside a region: short soft grey flicks along a downward flow that fans out from the centre
function featherStrokes(g, polys, bb, seed, density, v) {
  const [x0, y0, x1, y1] = bb, r = rng(seed), n = Math.round(((x1 - x0) * (y1 - y0) * density) / 1000);
  const cx = (x0 + x1) / 2;
  g.save(); g.beginPath(); traceSmooth(g, polys); g.clip("evenodd");
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), L = 8 + r() * 16;
    const a = Math.PI / 2 + ((x - cx) / Math.max(40, x1 - x0)) * 0.9 + (r() - 0.5) * 0.5;
    for (let k = 0; k < 2 + (r() < 0.4 ? 1 : 0); k++) {
      const ox = Math.cos(a + Math.PI / 2) * k * 3, oy = Math.sin(a + Math.PI / 2) * k * 3;
      g.strokeStyle = gray(v, 0.28 + r() * 0.25); g.lineWidth = 0.7 + r() * 0.5;
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(a + 0.25) * L * 0.5, y + oy + Math.sin(a + 0.25) * L * 0.5, x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L);
      g.stroke();
    }
  }
  g.restore();
}

export const gray = (v, a = 1) => {
  const c = Math.round(255 * Math.max(0, Math.min(1, v)));
  return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
};
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

// closed path through polygon vertices, softened: quadratic curves through the edge midpoints
function traceSmooth(g, polys) {
  for (const p of polys) {
    const n = p.length / 2;
    if (n < 3) continue;
    if (n < 5) { g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); continue; }
    const mx = (i) => (p[2 * (i % n)] + p[2 * ((i + 1) % n)]) / 2, my = (i) => (p[2 * (i % n) + 1] + p[2 * ((i + 1) % n) + 1]) / 2;
    g.moveTo(mx(0), my(0));
    for (let i = 1; i <= n; i++) g.quadraticCurveTo(p[2 * (i % n)], p[2 * (i % n) + 1], mx(i), my(i));
    g.closePath();
  }
}
function tracePolys(g, polys) {
  for (const p of polys) {
    if (p.length < 6) continue;
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
  }
}

export function bboxOf(D, pad = 14) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of D.hull) for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
}

// seeded paper grain tile (0.5 = neutral), built once
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 128, c = mk(N, N), g = c.getContext("2d"), id = g.createImageData(N, N), d = id.data, r = rng(2525);
  let a = new Float32Array(N * N);
  for (let i = 0; i < a.length; i++) a[i] = r() - 0.5;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(a.length);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += a[((y + j + N) % N) * N + ((x + i + N) % N)];
      b[y * N + x] = s / 9;
    }
    a = b;
  }
  let sd = 0; for (const v of a) sd += v * v; sd = Math.sqrt(sd / a.length);
  for (let i = 0; i < a.length; i++) { const v = Math.max(0, Math.min(255, 128 + (a[i] / sd) * 40)); d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v; d[4 * i + 3] = 255; }
  g.putImageData(id, 0, 0);
  GRAIN = c;
  return c;
}

function shadeOutside(g, tmp, tg, setT, pathFn, rule, alpha, blurPx) {
  // lay the blurred outside of a path over its inside (edge darkening)
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "source-over"; tg.filter = "none"; tg.clearRect(0, 0, tmp.width, tmp.height);
  tg.fillStyle = "#000"; tg.fillRect(0, 0, tmp.width, tmp.height);
  setT(tg); tg.globalCompositeOperation = "destination-out"; tg.beginPath(); pathFn(tg); tg.fill(rule); tg.globalCompositeOperation = "source-over";
  g.save(); g.beginPath(); pathFn(g); g.clip(rule);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = alpha; g.filter = `blur(${blurPx}px)`;
  g.drawImage(tmp, 0, 0);
  g.restore(); setT(g);
}

// paint drawing D; returns { canvas, x, y, w, h } in page px. o.res supersamples; o.grain = grain strength
export function paintDrawing(D, { res = 1, bb = null, grain = 0.045, pre = null, post = null, inserts = null, feathers = 0.9, fade = null, holes0 = false } = {}) {
  bb = bb || bboxOf(D);
  const [x0, y0, x1, y1] = bb, w = x1 - x0, h = y1 - y0;
  const c = mk(Math.ceil(w * res), Math.ceil(h * res)), g = c.getContext("2d");
  const setT = (ctx) => ctx.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  setT(g);
  if (pre) { g.save(); pre(g); g.restore(); }
  // the hull, filled with the figure's mean line-work value; with holes0 the dark pieces are holes (the page shows)
  const holes = holes0 ? D.parts.filter((q) => q.tier === 0).flatMap((q) => q.p) : [];
  if (holes.length) {
    const hc = mk(c.width, c.height), hg = hc.getContext("2d");
    setT(hg); hg.fillStyle = gray(D.base); hg.beginPath(); traceSmooth(hg, D.hull); hg.fill("nonzero");
    hg.globalCompositeOperation = "destination-out"; hg.beginPath(); traceSmooth(hg, holes); hg.fill("nonzero");
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(hc, 0, 0); g.restore();
  } else { g.fillStyle = gray(D.base); g.beginPath(); traceSmooth(g, D.hull); g.fill("nonzero"); }
  const tmp = mk(c.width, c.height), tg = tmp.getContext("2d");
  let k0 = 0;
  for (const q of D.parts) {
    if (inserts && q.n && inserts[q.n]) { g.save(); inserts[q.n](g); g.restore(); }
    const [a, bx, by, cx, cy, rim, rimw] = q.t;
    if (q.tier === 0) { if (!holes0) { g.fillStyle = gray(a); g.beginPath(); traceSmooth(g, q.p); g.fill("evenodd"); } continue; }
    g.save();
    g.beginPath(); traceSmooth(g, q.p); g.clip("evenodd");
    const bm = Math.hypot(bx, by);
    if (bm > 1e-4) {
      const ux = bx / bm, uy = by / bm, L = 600;
      const gr = g.createLinearGradient(cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L);
      for (let i = 0; i <= 12; i++) { const s = -L + (2 * L * i) / 12; gr.addColorStop(i / 12, gray(a + (bm * s) / 100)); }
      g.fillStyle = gr;
    } else g.fillStyle = gray(a);
    g.fillRect(x0, y0, w, h);
    g.restore();
    if (q.tier === 1 && feathers > 0 && q.area > 1500) {
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      for (const p of q.p) for (let i = 0; i < p.length; i += 2) { bx0 = Math.min(bx0, p[i]); bx1 = Math.max(bx1, p[i]); by0 = Math.min(by0, p[i + 1]); by1 = Math.max(by1, p[i + 1]); }
      featherStrokes(g, q.p, [bx0, by0, bx1, by1], 7 + k0, feathers, 0.5);
    }
    k0++;
    if (rim > 0.005) shadeOutside(g, tmp, tg, setT, (x) => traceSmooth(x, q.p), "evenodd", Math.min(1, rim / Math.max(0.15, a)), Math.max(0.6, rimw * 0.8 * res));
  }
  if (grain > 0) {
    g.save(); g.beginPath(); traceSmooth(g, D.hull); g.clip("nonzero");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "overlay"; g.globalAlpha = Math.min(1, grain * 4);
    g.fillStyle = g.createPattern(grainTile(), "repeat"); g.fillRect(0, 0, c.width, c.height);
    g.restore(); setT(g);
  }
  for (const s of D.ink || []) { g.fillStyle = gray(s.v); g.beginPath(); tracePolys(g, s.p); g.fill("evenodd"); }
  for (const l of D.lines || []) penLine(g, l.p, l.w, l.v);
  for (const [x, y, a, b, ang, v] of D.dots || []) { g.fillStyle = gray(v); g.beginPath(); g.ellipse(x, y, a, b, ang, 0, Math.PI * 2); g.fill(); }
  if (D.edge && D.edge[0] > 0) shadeOutside(g, tmp, tg, setT, (x) => traceSmooth(x, D.hull), "nonzero", Math.min(1, D.edge[0]), D.edge[1] * res);
  if (holes.length) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-out"; setT(g); g.beginPath(); traceSmooth(g, holes); g.fill("nonzero"); g.restore(); }
  if (post) { g.save(); post(g); g.restore(); }
  if (fade) {
    // soft bottom edge (the head layer fades into the body below the neck): [yStart, yEnd] page px
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, (fade[0] - y0) * res, 0, (fade[1] - y0) * res);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in"; g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over";
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: c, x: x0, y: y0, w, h };
}

// draw a painted layer L through the affine m ([a,b,c,d,e,f], page px of the drawing -> page px now)
export function blitLayer(g, L, m = null, alpha = 1) {
  g.save();
  if (m) g.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  if (alpha < 1) g.globalAlpha *= alpha;
  g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  g.restore();
}
