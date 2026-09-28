// s18 ink-drawing renderer. A drawing (measured by trace2/inktrace.py, encoded by trace2/tojs.py) is made of
//   base   - silhouettes filled with their own dark value (an owl's black, under everything)
//   m      - lit masses: outline + holes (even-odd), each with a smooth value field (constant, plane or quadratic)
//   s      - specks: small filled marks
//   d, b   - dark and bright strokes: centre-lines with a width per point, one tone each, drawn as tapered polygons
//   o      - dots
// Everything is redrawn with Canvas2D paths; nothing is an image. Deterministic.
const AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LUT = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) LUT[AL.charCodeAt(i)] = i;

function decodeSeq(s, k, scale) {
  const out = []; let i = 0, j = 0; const acc = new Array(k).fill(0);
  while (i < s.length) {
    let z = 0, sh = 0, c;
    do { c = LUT[s.charCodeAt(i++)]; z += (c & 31) * 2 ** sh; sh += 5; } while (c >= 32);
    const n = z % 2 ? -(z + 1) / 2 : z / 2;
    acc[j] += n; out.push(acc[j] / scale[j]); j = (j + 1) % k;
  }
  return out;
}
const decRing = (s) => decodeSeq(s, 2, [4, 4]);
const decStroke = ([tone, s]) => { const a = decodeSeq(s, 3, [4, 4, 8]), n = a.length / 3, x = new Float32Array(n), y = new Float32Array(n), w = new Float32Array(n);
  for (let i = 0; i < n; i++) { x[i] = a[3 * i]; y[i] = a[3 * i + 1]; w[i] = a[3 * i + 2]; } return { tone, x, y, w }; };

export function decodeInk(raw) {
  const dm = (list) => (list || []).map(([f, rs]) => ({ f, rings: rs.map(decRing) }));
  return { base: dm(raw.base), m: dm(raw.m), s: dm(raw.s), d: (raw.d || []).map(decStroke), b: (raw.b || []).map(decStroke), o: raw.o || [] };
}

export const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
// fields are measured in pixel-index coordinates (pixel i centred on i); canvas coordinates are half a pixel further
const fieldAt = (f, cx, cy) => { const x = cx - 0.5, y = cy - 0.5; return f[0] === "p" ? f[1] + f[2] * x + f[3] * y : f[1] + f[2] * x + f[3] * y + f[4] * x * x + f[5] * x * y + f[6] * y * y; };
// a quadratic + soft shading blobs ('qb') over a pixel grid (index coords X0.., Y0..) into out (w*h floats, 0..1)
function gridQB(f, X0, Y0, w, h, out) {
  for (let j = 0; j < h; j++) { const y = Y0 + j; for (let i = 0; i < w; i++) { const x = X0 + i; out[j * w + i] = f[1] + f[2] * x + f[3] * y + f[4] * x * x + f[5] * x * y + f[6] * y * y; } }
  if (f[0] !== "qb") return out;
  for (let b = 7; b < f.length; b += 4) {
    const bx = f[b], by = f[b + 1], s = f[b + 2], a = f[b + 3], R = Math.ceil(3.2 * s), k = -1 / (2 * s * s);
    const i0 = Math.max(0, Math.floor(bx - R) - X0), i1 = Math.min(w - 1, Math.ceil(bx + R) - X0);
    const j0 = Math.max(0, Math.floor(by - R) - Y0), j1 = Math.min(h - 1, Math.ceil(by + R) - Y0);
    for (let j = j0; j <= j1; j++) { const dy = Y0 + j - by, ey = dy * dy; for (let i = i0; i <= i1; i++) { const dx = X0 + i - bx; out[j * w + i] += a * Math.exp(k * (dx * dx + ey)); } }
  }
  return out;
}
// depth inside a ring set (even-odd) per pixel: chamfer distance (3-4) of its coverage mask, px
function depthGrid(rings, X0, Y0, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff"; g.beginPath();
  for (const r of rings) { g.moveTo(r[0] - X0, r[1] - Y0); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i] - X0, r[i + 1] - Y0); g.closePath(); }
  g.fill("evenodd");
  const a = g.getImageData(0, 0, w, h).data, D = new Float32Array(w * h), BIG = 1e6;
  for (let p = 0; p < w * h; p++) D[p] = a[4 * p + 3] >= 128 ? BIG : 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = j * w + i; if (!D[p]) continue;
    let v = D[p];
    if (i > 0) v = Math.min(v, D[p - 1] + 3); else v = Math.min(v, 3);
    if (j > 0) { v = Math.min(v, D[p - w] + 3); if (i > 0) v = Math.min(v, D[p - w - 1] + 4); if (i < w - 1) v = Math.min(v, D[p - w + 1] + 4); } else v = Math.min(v, 3);
    D[p] = v;
  }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
    const p = j * w + i; if (!D[p]) continue;
    let v = D[p];
    if (i < w - 1) v = Math.min(v, D[p + 1] + 3);
    if (j < h - 1) { v = Math.min(v, D[p + w] + 3); if (i < w - 1) v = Math.min(v, D[p + w + 1] + 4); if (i > 0) v = Math.min(v, D[p + w - 1] + 4); }
    D[p] = v;
  }
  for (let p = 0; p < w * h; p++) D[p] = D[p] / 3;
  return D;
}

// fill style for a field over a ring set's bounds. Quadratic fields are painted into a small canvas (pattern).
function fillFor(g, f, rings) {
  if (typeof f === "number") return grey(f);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1]; }
  if (f[0] === "p") {
    // plane: a linear gradient along its steepest direction across the bounds
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, gx = f[2], gy = f[3], gl = Math.hypot(gx, gy);
    if (gl < 1e-7) return grey(255 * fieldAt(f, cx, cy));
    const ux = gx / gl, uy = gy / gl, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
    const ax = cx - ux * R, ay = cy - uy * R, bx = cx + ux * R, by = cy + uy * R;
    const va = 255 * fieldAt(f, ax, ay), vb = 255 * fieldAt(f, bx, by);
    const gr = g.createLinearGradient(ax, ay, bx, by);
    const st = [[0, va]];
    for (const lim of [0, 255]) { const u = (lim - va) / (vb - va); if (u > 0 && u < 1) st.push([u, lim]); }
    st.push([1, vb]); st.sort((a, b) => a[0] - b[0]);
    for (const [u, v] of st) gr.addColorStop(u, grey(v));
    return gr;
  }
  const X0 = Math.floor(x0) - 1, Y0 = Math.floor(y0) - 1, w = Math.ceil(x1) - X0 + 2, h = Math.ceil(y1) - Y0 + 2;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const cg = c.getContext("2d"), id = cg.createImageData(w, h), d = id.data;
  // pixel (i, j) of the grid is canvas pixel X0+i, whose index coordinate is X0+i (canvas centre X0+i+0.5)
  const inner = f[0] === "r" ? f[3] : f, V = new Float32Array(w * h);
  if (typeof inner === "number") V.fill(inner / 255); else gridQB(inner, X0, Y0, w, h, V);
  if (f[0] === "r") { const Dp = depthGrid(rings, X0, Y0, w, h), k = f[1], lam = f[2]; for (let p = 0; p < w * h; p++) V[p] -= k * Math.exp(-Dp[p] / lam); }
  for (let p = 0; p < w * h; p++) { const v = Math.max(0, Math.min(255, Math.round(255 * V[p]))); d[4 * p] = d[4 * p + 1] = d[4 * p + 2] = v; d[4 * p + 3] = 255; }
  cg.putImageData(id, 0, 0);
  const pat = g.createPattern(c, "no-repeat");
  pat.setTransform(new DOMMatrix([1, 0, 0, 1, X0, Y0]));
  return pat;
}

function ringsBBox(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1]; }
  return [x0, y0, x1, y1];
}
// a field's value at the centre of a box (the flat stand-in for small shaded marks)
function fieldMid(f, bb) {
  const inner = f[0] === "r" ? f[3] : f, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  if (typeof inner === "number") return inner / 255 - (f[0] === "r" ? f[1] * 0.3 : 0);
  let v = fieldAt(inner, cx, cy);
  if (inner[0] === "qb") for (let b = 7; b < inner.length; b += 4) { const dx = cx - 0.5 - inner[b], dy = cy - 0.5 - inner[b + 1], s = inner[b + 2]; v += inner[b + 3] * Math.exp(-(dx * dx + dy * dy) / (2 * s * s)); }
  return v - (f[0] === "r" ? f[1] * 0.3 : 0);
}
function ringsPathAdd(g, rings, map) {
  for (const r of rings) {
    if (map) { let p = map(r[0], r[1]); g.moveTo(p[0], p[1]); for (let i = 2; i < r.length; i += 2) { p = map(r[i], r[i + 1]); g.lineTo(p[0], p[1]); } }
    else { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); }
    g.closePath();
  }
}
function ringsPath(g, rings, map) {
  g.beginPath();
  for (const r of rings) {
    if (map) { let p = map(r[0], r[1]); g.moveTo(p[0], p[1]); for (let i = 2; i < r.length; i += 2) { p = map(r[i], r[i + 1]); g.lineTo(p[0], p[1]); } }
    else { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); }
    g.closePath();
  }
}
// a stroke as one polygon: both edges offset by half the width along the local normal (added to the current path
// unless begin is true)
function strokePath(g, st, map, wk = 1, begin = true) {
  const n = st.x.length; if (n < 2) return false;
  const X = new Float32Array(n), Y = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (map) { const p = map(st.x[i], st.y[i]); X[i] = p[0]; Y[i] = p[1]; } else { X[i] = st.x[i]; Y[i] = st.y[i]; } }
  const L = new Float32Array(2 * n), R = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let dx = X[b] - X[a], dy = Y[b] - Y[a]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = st.w[i] * wk / 2;
    L[2 * i] = X[i] - dy * hw; L[2 * i + 1] = Y[i] + dx * hw; R[2 * i] = X[i] + dy * hw; R[2 * i + 1] = Y[i] - dx * hw;
  }
  if (begin) g.beginPath();
  g.moveTo(L[0], L[1]);
  for (let i = 1; i < n; i++) g.lineTo(L[2 * i], L[2 * i + 1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[2 * i], R[2 * i + 1]);
  g.closePath();
  return true;
}

// Draw a decoded drawing. opts: map(x,y)->[x,y] (a warp; the fill fields are not warped), wk (dark-stroke width gain,
// or [dark, bright]; a plain number leaves the bright strokes at 1),
// tone(i, kind, tone) -> tone (per-stroke adjustment), gain (value gain), cache: false for drawings shown on one frame
// only (their value-field canvases are not kept), low: "grad" for per-frame drawings (flat and small marks batched by
// grey level, the large shaded masses as the linear gradients of their fields' tangent planes: images that change
// every frame are what is slow in the renderer), fills / strokes: false to skip the filled marks (base, masses,
// specks) / the strokes and dots.
export function drawInk(g, D, opts = {}) {
  const { map = null, wk = 1, tone = null, gain = 1, cache = true, low = 0, fills = true, strokes = true } = opts;
  const fillMasses = (list) => {
    if (low === "grad") {
      // per-frame drawings: each shaded mass as the linear gradient of its field's tangent plane at its centre
      for (const M of list) {
        let fs;
        if (typeof M.f === "number") fs = grey(M.f * gain);
        else {
          const bb = M._bb || (M._bb = ringsBBox(M.rings)), cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
          const e = 2, v0 = fieldMid(M.f, bb), vx = fieldMid(M.f, [bb[0] + e, bb[1], bb[2] + e, bb[3]]) - v0, vy = fieldMid(M.f, [bb[0], bb[1] + e, bb[2], bb[3] + e]) - v0;
          const ix = cx - 0.5, iy = cy - 0.5, p = ["p", v0 - (vx / e) * ix - (vy / e) * iy, vx / e, vy / e];
          fs = fillFor(g, p, M.rings);
        }
        g.fillStyle = fs; ringsPath(g, M.rings, map); g.fill("evenodd");
      }
      return;
    }
    for (const M of list) {
      let fs = M._g === g ? M._fill : null;
      if (!fs) { fs = fillFor(g, typeof M.f === "number" ? M.f * gain : M.f, M.rings); if (cache) { M._fill = fs; M._g = g; } }
      g.fillStyle = fs; ringsPath(g, M.rings, map); g.fill("evenodd");
    }
  };
  // per-frame drawings: the flat marks and the small shaded ones are batched by grey level (one path, one fill each:
  // the marks of one list do not overlap)
  const batched = (list, lowMin) => {
    const groups = new Map(), rest = [];
    for (const M of list) {
      let v = null;
      if (typeof M.f === "number") v = Math.round(M.f * gain);
      else {
        const bb = M._bb || (M._bb = ringsBBox(M.rings));
        if ((bb[2] - bb[0]) * (bb[3] - bb[1]) < lowMin) v = Math.round(255 * Math.max(0, Math.min(1, fieldMid(M.f, bb))) * gain);
      }
      if (v === null) { rest.push(M); continue; }
      let G = groups.get(v); if (!G) groups.set(v, (G = [])); G.push(M);
    }
    for (const [v, G] of groups) { g.fillStyle = grey(v); g.beginPath(); for (const M of G) ringsPathAdd(g, M.rings, map); g.fill("evenodd"); }
    fillMasses(rest);
  };
  if (fills) {
    if (low) {
      // the silhouette pieces come first (all with the owl's dark value), then the dark parts inside them
      let n = 1; while (n < D.base.length && D.base[n].f === D.base[0].f) n++;
      batched(D.base.slice(0, n), 1e9); batched(D.base.slice(n), 2500); batched(D.m, 2500); batched(D.s, 1e9);
    }
    else { fillMasses(D.base); fillMasses(D.m); fillMasses(D.s); }
  }
  if (!strokes) return;
  const wkd = Array.isArray(wk) ? wk[0] : wk, wkb = Array.isArray(wk) ? wk[1] : 1;
  // strokes are batched by tone (one path and one fill per grey level): each fill is a draw call, and hundreds of
  // them per frame are what costs; the dark strokes are drawn first, then the bright ones, as before
  for (let k = 0; k < 2; k++) {
    const list = k ? D.b : D.d, groups = new Map();
    for (let i = 0; i < list.length; i++) {
      // the boil's tone jitter is quantised (6 grey levels) so strokes still share fills
      const st = list[i], t0 = (tone ? tone(i, k, st.tone) : st.tone) * gain;
      const v = Math.max(0, Math.min(255, tone ? 6 * Math.round(t0 / 6) : Math.round(t0)));
      let G = groups.get(v); if (!G) groups.set(v, (G = []));
      G.push(st);
    }
    for (const [v, G] of groups) {
      g.fillStyle = grey(v);
      g.beginPath(); for (const st of G) strokePath(g, st, map, k ? wkb : wkd, false); g.fill();
    }
  }
  for (const [x, y, r, v] of D.o) { const p = map ? map(x, y) : [x, y]; g.fillStyle = grey(v * gain); g.beginPath(); g.arc(p[0], p[1], r, 0, 2 * Math.PI); g.fill(); }
}

// Fast deterministic softening: two half-pixel bilinear redraws give the separable kernel [1/4, 1/2, 1/4] on both
// axes (sigma ~0.71 px). amount < 1 mixes it with the sharp original. In place; returns the canvas.
let _tmp = null, _tmp2 = null;
function scratch(w, h, second) {
  let c = second ? _tmp2 : _tmp;
  if (!c || c.width < w || c.height < h) { c = document.createElement("canvas"); c.width = Math.max(w, c ? c.width : 0); c.height = Math.max(h, c ? c.height : 0); if (second) _tmp2 = c; else _tmp = c; }
  return c;
}
export function softHalf(c, amount = 1, passes = 1, rect = null) {
  if (!(amount > 0)) return c;
  // rect [x, y, w, h]: soften only that part (integer px; the rest of the canvas is left as it is)
  const X = rect ? Math.max(0, Math.floor(rect[0]) - 2) : 0, Y = rect ? Math.max(0, Math.floor(rect[1]) - 2) : 0;
  const w = rect ? Math.min(c.width - X, Math.ceil(rect[2]) + 4) : c.width, h = rect ? Math.min(c.height - Y, Math.ceil(rect[3]) + 4) : c.height;
  if (w <= 0 || h <= 0) return c;
  const t = scratch(w + 2, h + 2, false), tg = t.getContext("2d");
  const g = c.getContext("2d");
  for (let p = 0; p < passes; p++) {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "copy"; tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = "low";
    tg.drawImage(c, X, Y, w, h, 0.5, 0.5, w, h);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low";
    if (amount >= 1) {
      if (rect) { g.beginPath(); g.rect(X, Y, w, h); g.clip(); g.clearRect(X, Y, w, h); g.globalCompositeOperation = "source-over"; }
      else g.globalCompositeOperation = "copy";
      g.drawImage(t, 0, 0, w + 1, h + 1, X - 0.5, Y - 0.5, w + 1, h + 1);
    } else { g.globalCompositeOperation = "source-over"; g.globalAlpha = amount; g.drawImage(t, 0, 0, w + 1, h + 1, X - 0.5, Y - 0.5, w + 1, h + 1); }
    g.restore();
  }
  return c;
}
export { ringsBBox };

// The filled marks of a rigid drawing (base, masses, specks), painted once into a canvas over the drawing's bounds
// (pad px), for drawings whose strokes are redrawn every frame (boil) but whose fills stay put.
export function fillCanvas(D, pad = 4, soft = 0) {
  if (D._fc) return D._fc;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const L of [D.base, D.m, D.s]) for (const M of L) for (const r of M.rings) for (let i = 0; i < r.length; i += 2) {
    if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1];
  }
  if (!(x1 > x0)) return (D._fc = null);
  const X0 = Math.floor(x0) - pad, Y0 = Math.floor(y0) - pad, w = Math.ceil(x1) - X0 + pad, h = Math.ceil(y1) - Y0 + pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.translate(-X0, -Y0);
  drawInk(g, D, { strokes: false });
  if (soft) softHalf(c, soft);
  for (const L of [D.base, D.m, D.s]) for (const M of L) { M._fill = null; M._g = null; }   // the pattern canvases are no longer needed
  return (D._fc = { c, x: X0, y: Y0 });
}

// A rigid drawing fully painted (fills + strokes) into a cached canvas over its bounds, softened once. With opts.map /
// opts.tone this is one BOIL VARIANT of the drawing: the film cycles a few such variants over the content frames (a
// hand-redrawn figure changes a little on every drawing), because redrawing hundreds of strokes every frame is too
// slow in the renderer. key: the variant's cache key.
export function drawnCanvas(D, key, opts = {}, soft = 1, pad = 6) {
  const cache = D._dc || (D._dc = new Map());
  if (cache.has(key)) return cache.get(key);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (const L of [D.base, D.m, D.s]) for (const M of L) for (const r of M.rings) for (let i = 0; i < r.length; i += 2) grow(r[i], r[i + 1]);
  for (const L of [D.d, D.b]) for (const st of L) for (let i = 0; i < st.x.length; i++) grow(st.x[i], st.y[i]);
  if (!(x1 > x0)) { cache.set(key, null); return null; }
  const X0 = Math.floor(x0) - pad, Y0 = Math.floor(y0) - pad, w = Math.ceil(x1) - X0 + pad, h = Math.ceil(y1) - Y0 + pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.translate(-X0, -Y0);
  drawInk(g, D, opts);
  if (soft) softHalf(c, soft);
  const out = { c, x: X0, y: Y0 };
  cache.set(key, out);
  return out;
}
