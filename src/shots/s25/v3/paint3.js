// s25 v3 (end targeted fix) — a painter for the measured owl drawings (same data format as s25/v2/data, same contract as
// v2/draw.js paintDrawing) in the source's manner: a white bird drawn with thinner grey ink and soft shading, without v2's
// dark ring round the silhouette:
//   - the hull filled in the drawing's line value, then the light areas grown 3 px in an outer band (≤ 10 px from the
//     outline) so the dark gap at the silhouette closes; internal gaps (the drawing's own lines) stay;
//   - ink lines at 0.85 x the measured width (1.6–4.2 px); lines that run along the silhouette thin (2.3 px) and lighter;
//   - a soft volume shade inward from the silhouette and a tight edge; the hull pared back 5.5 px (the measured hull holds
//     the old dark contour, ~4 px outside the source's light silhouette);
//   - an optional `body(g, hullPath)` hook for hand-placed shading.
// Used for the standing owl's head layer (head3.js supplies the face and headphones). Tried on the standing bodies too:
// softer and fluffier at 1:1, but 0.16–0.2 worse σ4 over the standing phase than v2's painter, so not used there.
// Values are pre-grade (0 black … 1 white).
import { rng } from "../../../lib/rng.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { gray, bboxOf } from "../v2/draw.js";

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

export function traceSmooth(g, polys) {
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

let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 128, c = mk(N, N), g = c.getContext("2d"), id = g.createImageData(N, N), d = id.data, r = rng(2527);
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

// darken the inside of a path by its blurred outside (alpha k, blur s px): the soft edge of a rounded white form
function shadeIn(g, c, setT, pathFn, k, s, col = "#000") {
  const t = mk(c.width, c.height), q = t.getContext("2d");
  q.fillStyle = col; q.fillRect(0, 0, t.width, t.height);
  setT(q); q.globalCompositeOperation = "destination-out"; q.beginPath(); pathFn(q); q.fill("nonzero");
  g.save(); g.beginPath(); pathFn(g); g.clip("nonzero");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = k; g.filter = `blur(${s}px)`;
  g.drawImage(t, 0, 0);
  g.restore(); setT(g);
}

// distance from (x, y) to the hull outline (min over sampled edge points; coarse, only used to classify lines)
function edgeDist(hull, x, y) {
  let m = 1e9;
  for (const p of hull) for (let i = 0; i < p.length; i += 2) { const d = Math.hypot(p[i] - x, p[i + 1] - y); if (d < m) m = d; }
  return m;
}

function penPts(flat) { const pts = []; for (let i = 0; i + 1 < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]); return pts; }

// paint a standing-owl drawing D; returns { canvas, x, y, w, h } in page px (same contract as v2 paintDrawing)
export function paintOwl3(D, { bb = null, grain = 0.04, pre = null, post = null, body = null, fade = null, fill = 0.8, grow = 3, band = 10, erode = 5.5,
  lineK = 0.85, lineMax = 4.2, lineV = 0.14, silV = 0.2, silW = 2.3, rim = [0.1, 10], edge = [0.3, 2.2] } = {}) {
  bb = bb || bboxOf(D);
  const [x0, y0, x1, y1] = bb, w = x1 - x0, h = y1 - y0;
  const c = mk(Math.ceil(w), Math.ceil(h)), g = c.getContext("2d");
  const setT = (ctx) => ctx.setTransform(1, 0, 0, 1, -x0, -y0);
  setT(g);
  if (pre) { g.save(); pre(g); g.restore(); }
  const hullP = (x) => traceSmooth(x, D.hull);
  // the hull in the drawing's line value, then every light area grown by `grow` px in a light grey: the dark gaps of
  // v2 (a 5–8 px ring round the owl, 4–8 px between areas) close to the source's 2–3 px contour
  g.fillStyle = gray(D.base); g.beginPath(); hullP(g); g.fill("nonzero");
  if (grow > 0) {
    // only in an outer band of the hull (≤ band px from the outline): the internal gaps are the drawing's own lines
    const t = mk(c.width, c.height), q = t.getContext("2d");
    setT(q); q.lineJoin = "round"; q.strokeStyle = gray(fill); q.lineWidth = 2 * grow;
    q.beginPath(); for (const p of D.parts) if (p.tier === 1) traceSmooth(q, p.p);
    q.stroke();
    q.globalCompositeOperation = "destination-in"; q.lineWidth = 2 * band; q.strokeStyle = "#000"; q.beginPath(); hullP(q); q.stroke();
    q.beginPath(); hullP(q); q.fill("nonzero");   // ∩ the hull: the inner half of the band
    g.save(); g.beginPath(); hullP(g); g.clip("nonzero"); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(t, 0, 0); g.restore(); setT(g);
  }
  const dark = [];
  for (const q of D.parts) {
    const [a, bx, by, cx, cy] = q.t;
    if (q.tier === 0) { dark.push(q); continue; }
    g.save(); g.beginPath(); traceSmooth(g, q.p); g.clip("evenodd");
    const bm = Math.hypot(bx, by);
    if (bm > 1e-4) {
      const ux = bx / bm, uy = by / bm, L = 600, gr = g.createLinearGradient(cx - ux * L, cy - uy * L, cx + ux * L, cy + uy * L);
      for (let i = 0; i <= 12; i++) { const s = -L + (2 * L * i) / 12; gr.addColorStop(i / 12, gray(a + (bm * s) / 100)); }
      g.fillStyle = gr;
    } else g.fillStyle = gray(a);
    g.fillRect(x0, y0, w, h);
    g.restore();
  }
  for (const q of dark) { g.fillStyle = gray(q.t[0]); g.beginPath(); traceSmooth(g, q.p); g.fill("evenodd"); }
  // volume: a wide soft shade and a tight edge inward from the silhouette
  if (rim[0] > 0) shadeIn(g, c, setT, hullP, rim[0], rim[1]);
  if (edge[0] > 0) shadeIn(g, c, setT, hullP, edge[0], edge[1]);
  // hand-placed shading and feather texture for this pose (s25/v3/body3.js)
  if (body) { g.save(); body(g, hullP); g.restore(); }
  if (grain > 0) {
    g.save(); g.beginPath(); hullP(g); g.clip("nonzero");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "overlay"; g.globalAlpha = Math.min(1, grain * 4);
    g.fillStyle = g.createPattern(grainTile(), "repeat"); g.fillRect(0, 0, c.width, c.height);
    g.restore(); setT(g);
  }
  // the ink: thin grey lines; the ones that run along the silhouette thinner and lighter
  for (const l of D.lines || []) {
    const pts = penPts(l.p);
    if (pts.length < 2) continue;
    let near = 0; for (const [x, y] of pts) if (edgeDist(D.hull, x, y) < 7) near++;
    const sil = near / pts.length > 0.6;
    const W = sil ? silW : Math.max(1.6, Math.min(lineMax, l.w * lineK)), V = sil ? Math.max(l.v, silV) : Math.max(l.v, lineV);
    const q = pts.length > 2 ? sampleCurve(pts, 4) : pts;
    taper(g, q, (u) => W * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * u), 0.5)), gray(V, 0.92));
  }
  for (const [x, y, a, b, ang, v] of D.dots || []) { g.fillStyle = gray(Math.max(v, 0.12)); g.beginPath(); g.ellipse(x, y, a * 0.85, b * 0.85, ang, 0, Math.PI * 2); g.fill(); }
  // the measured hull runs ~4 px outside the source's light silhouette (it holds the dark contour): pare it back so
  // the owl is not fatter than the source and the contour is a thin line
  if (erode > 0) {
    g.save(); g.globalCompositeOperation = "destination-out"; g.lineJoin = "round"; g.lineWidth = 2 * erode; g.strokeStyle = "#000";
    g.filter = "blur(0.6px)"; g.beginPath(); hullP(g); g.stroke(); g.restore();
  }
  if (post) { g.save(); post(g); g.restore(); }
  if (fade) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, fade[0] - y0, 0, fade[1] - y0);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in"; g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over";
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: c, x: x0, y: y0, w, h };
}
