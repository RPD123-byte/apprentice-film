// Vector data decoders + painters for s24's measured drawings (see trace/README.md). Everything here is geometry
// and grey values measured on the source and drawn with Canvas2D paths — no pixels of the source are stored.
//   tone data: [[v, "path path ..."], ...] — stacked iso-value regions; each level is filled even-odd with grey v
//     (pre-grade 0..255) on top of the previous one. Paths are zigzag base-32 varints (1/4 px), first point absolute.
//   line data: one varint string per frame: per bar x0 y0 dx dy (1/2 px) w (1/2 px) n v1..vn — a straight bar with
//     square ends whose grey runs through v1..vn along its length; bars are max-composited ("lighten").
import { blurCanvas } from "../../lib/sokoIll.js";

const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const IDX = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPH.length; i++) IDX[ALPH.charCodeAt(i)] = i;

export function readInts(s) {
  const out = [];
  let z = 0, sh = 0;
  for (let i = 0; i < s.length; i++) {
    const d = IDX[s.charCodeAt(i)];
    if (d < 0) continue;
    if (d >= 32) { z += (d - 32) * 2 ** sh; sh += 5; }
    else { z += d * 2 ** sh; out.push(z % 2 === 1 ? -(z + 1) / 2 : z / 2); z = 0; sh = 0; }
  }
  return out;
}
export function tonePath(enc, q = 4, bb = null) {
  const p = new Path2D();
  for (const s of enc.split(" ")) {
    if (!s) continue;
    const a = readInts(s);
    let x = a[0], y = a[1];
    p.moveTo(x / q, y / q);
    if (bb) { bb[0] = Math.min(bb[0], x / q); bb[1] = Math.min(bb[1], y / q); bb[2] = Math.max(bb[2], x / q); bb[3] = Math.max(bb[3], y / q); }
    for (let i = 2; i + 1 < a.length; i += 2) {
      x += a[i]; y += a[i + 1]; p.lineTo(x / q, y / q);
      if (bb) { if (x / q < bb[0]) bb[0] = x / q; if (y / q < bb[1]) bb[1] = y / q; if (x / q > bb[2]) bb[2] = x / q; if (y / q > bb[3]) bb[3] = y / q; }
    }
    p.closePath();
  }
  return p;
}
// tone data {q, L: [[v, enc], ...]} -> {levels: [{v, path}], bbox} (cached per data object)
let PATHS = new WeakMap();
export function tonePaths(data) {
  let r = PATHS.get(data);
  if (!r) {
    const bb = [1e9, 1e9, -1e9, -1e9];
    r = { levels: data.L.map(([v, enc]) => ({ v, path: tonePath(enc, data.q, bb) })), bbox: bb };
    PATHS.set(data, r);
  }
  return r;
}
export function drawTone(g, data, { gain = 1, lift = 0 } = {}) {
  for (const { v, path } of tonePaths(data).levels) {
    const c = Math.max(0, Math.min(255, Math.round(v * gain + lift)));
    g.fillStyle = `rgb(${c},${c},${c})`;
    g.fill(path, "evenodd");
  }
}
// A cached layer: box [x0, y0, x1, y1] in the data's coordinates (default: the data's bbox + margin), painted once
// (tone levels, then `extra(g)`), softened by `soft` px (exact gaussian).
export function toneLayer(levels, box = null, { soft = 0.6, extra = null, gain = 1, lift = 0, margin = 6 } = {}) {
  if (!box) { const b = tonePaths(levels).bbox; box = [Math.floor(b[0]) - margin, Math.floor(b[1]) - margin, Math.ceil(b[2]) + margin, Math.ceil(b[3]) + margin]; }
  const [x0, y0, x1, y1] = box;
  const c = document.createElement("canvas");
  c.width = Math.ceil(x1 - x0); c.height = Math.ceil(y1 - y0);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.translate(-x0, -y0);
  drawTone(g, levels, { gain, lift });
  if (extra) extra(g);
  if (soft > 0) blurCanvas(c, soft);
  return { canvas: c, x: x0, y: y0, w: c.width, h: c.height };
}
const LINES = new Map();
export function decodeLines(enc, q = 2) {
  let r = LINES.get(enc);
  if (r) return r;
  const a = readInts(enc); r = [];
  for (let i = 0; i < a.length;) {
    const x0 = a[i] / q, y0 = a[i + 1] / q, dx = a[i + 2] / q, dy = a[i + 3] / q, w = a[i + 4] / q, n = a[i + 5];
    const v = a.slice(i + 6, i + 6 + n); i += 6 + n;
    r.push({ x0, y0, dx, dy, w, v });
  }
  LINES.set(enc, r);
  return r;
}
// Paint one frame's bars (frame px, offset by dx, dy), max-composited like the source's line layer, then softened:
// the bars go to a scratch layer that is blurred onto g (σ = soft px; 1.1 measured best against the source's
// soft-edged lines). g must be black under the lines (they are drawn first in every beat).
let LAYER = null;
export function drawLines(g, enc, { dx = 0, dy = 0, gain = 1.03, alpha = 1, soft = 1 } = {}) {
  if (soft > 0) {
    // cheap softening: the bars are rasterised at half resolution and scaled back up with bilinear smoothing
    // (≈ a 1 px gaussian, the measured best is 1.1; a canvas blur filter here cost ~1 s per frame in software)
    const W = g.canvas.width, H = g.canvas.height, w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2);
    if (!LAYER || LAYER.width !== w2 || LAYER.height !== h2) { LAYER = document.createElement("canvas"); LAYER.width = w2; LAYER.height = h2; }
    const q = LAYER.getContext("2d", { willReadFrequently: true });   // a CPU canvas (a GPU one read back per frame is far slower)
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalAlpha = 1; q.globalCompositeOperation = "source-over";
    // the faint haze of sub-threshold streaks between the traced lines: measured as a ≈ 2/255 mean lift
    q.fillStyle = "rgb(2,2,2)"; q.fillRect(0, 0, w2, h2);
    q.setTransform(0.5, 0, 0, 0.5, 0, 0);
    drawLines(q, enc, { dx, dy, gain, alpha, soft: 0 });
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "lighten";
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low";
    g.drawImage(LAYER, 0, 0, w2 * 2, h2 * 2); g.restore();
    return;
  }
  const bars = decodeLines(enc);
  g.save();
  g.globalCompositeOperation = "lighten";
  g.globalAlpha = alpha;
  const gv = (v) => { const c = Math.max(0, Math.min(255, Math.round(v * gain))); return `rgb(${c},${c},${c})`; };
  for (const b of bars) {
    const L = Math.hypot(b.dx, b.dy);
    if (L < 0.5) continue;
    const nx = -b.dy / L * b.w / 2, ny = b.dx / L * b.w / 2;
    const x0 = b.x0 + dx, y0 = b.y0 + dy, x1 = x0 + b.dx, y1 = y0 + b.dy;
    if (b.v.length === 1) g.fillStyle = gv(b.v[0]);
    else {
      const gr = g.createLinearGradient(x0, y0, x1, y1), n = b.v.length;
      for (let j = 0; j < n; j++) gr.addColorStop((j + 0.5) / n, gv(b.v[j]));
      g.fillStyle = gr;
    }
    g.beginPath(); g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1 + nx, y1 + ny); g.lineTo(x1 - nx, y1 - ny); g.lineTo(x0 - nx, y0 - ny); g.closePath(); g.fill();
  }
  g.restore();
}

// drop the decoded paths and bars (the data modules stay loaded)
export function releaseVec() { PATHS = new WeakMap(); LINES.clear(); LAYER = null; }
