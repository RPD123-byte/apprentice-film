// Redraws traced ink strokes (see trace/trace.py): each stroke is a flat list x, y, w, v, b per point — frame px,
// width px (ink mass / peak of the measured cross profile), ungraded ink value at the centre, ungraded local ground.
// A stroke is drawn in one tone (its darkest value) and its width is scaled so the ink mass (width x darkness against
// the ground) matches the measurement at every point; the pale ends of a stroke come out as a natural taper.
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const grey = (v) => { const c = Math.round(clamp(v) * 255); return `rgb(${c},${c},${c})`; };

// soft: draw the set into an offscreen layer and composite it blurred by `soft` px (the source's lines are soft)
let SCR = null;
const mkCanvas = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
// a scratch canvas of at least w x h (reused; cleared before every use, so no state survives between calls)
function scratch(slot, w, h) {
  const c = SLOTS[slot];
  if (!c || c.width < w || c.height < h) SLOTS[slot] = mkCanvas(Math.max(w, c ? c.width : 0), Math.max(h, c ? c.height : 0));
  const o = SLOTS[slot].getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.filter = "none"; o.clearRect(0, 0, SLOTS[slot].width, SLOTS[slot].height);
  return [SLOTS[slot], o];
}
const SLOTS = {};
// bounding box of a stroke set (flat x,y,... lists, `stride` values per point), after `map`
function setBox(set, stride, map, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const s of set) for (let i = 0; i < s.length; i += stride) { const p = map ? map([s[i], s[i + 1]]) : [s[i], s[i + 1]]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
}
function softLayer(g, soft, box, fn) {
  const [x0, y0, x1, y1] = box, w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const [c, o] = scratch("soft", w, h);
  o.translate(-x0, -y0);
  fn(o);
  g.save(); g.filter = `blur(${soft}px)`; g.drawImage(c, 0, 0, w, h, x0, y0, w, h); g.restore();
}
// opts: map(p, i, s) -> p (displace), dv (tone offset), gain (width gain), wMin, end (px of end taper), per (samples),
// stride (values per point, default 5), filter(s) -> bool
export function drawInk(g, set, opts = {}) {
  if (opts.soft) return softLayer(g, opts.soft, setBox(set, opts.stride || 5, opts.map, 20), (o) => drawInk(o, set, { ...opts, soft: 0 }));
  const { map = null, dv = 0, gain = 1, wMin = 0.6, end = 3, endMin = 0.35, per = 3, stride = 5, filter = null, vOf = null, sharpen = 1, bright = false } = opts;
  for (let si = 0; si < set.length; si++) {
    const s = set[si];
    if (filter && !filter(s, si)) continue;
    const n = s.length / stride;
    if (n < 2) continue;
    const pts = [], wm = [];
    let vm = 1;
    if (bright) vm = 0;
    for (let i = 0; i < n; i++) vm = bright ? Math.max(vm, s[i * stride + 3]) : Math.min(vm, s[i * stride + 3]);
    let vd = clamp((vOf ? vOf(vm, s, si) : vm) + dv);
    // sharpen: the source's lines are softened by scaling/compression; draw them darker and thinner at the same ink
    // mass (ground - value) x width
    if (sharpen !== 1) { let bm = 0; for (let i = 0; i < n; i++) bm += s[i * stride + 4] / n; vd = clamp(bm - (bm - vd) * sharpen); }
    for (let i = 0; i < n; i++) {
      const o = i * stride;
      pts.push(map ? map([s[o], s[o + 1]], i, s, si) : [s[o], s[o + 1]]);
      const b = s[o + 4], v = s[o + 3];
      wm.push(s[o + 2] * clamp(bright ? (v - b) / Math.max(0.04, vd - b) : (b - v) / Math.max(0.04, b - vd), 0, 1.5));
    }
    const q = sampleCurve(pts, per);
    const S = [0];
    for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1], eL = Math.max(0.5, Math.min(end, L * 0.3));
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a;
      const w = wm[a] + (wm[b] - wm[a]) * t;
      const e = Math.min(1, S[i] / eL, (L - S[i]) / eL);
      return Math.max(wMin, w * gain) * (endMin + (1 - endMin) * Math.sqrt(Math.max(0, e)));
    }, grey(vd));
  }
}

// Tonal masses (trace/masses.py): each item [v, ring, ring, ...] (ring = flat x,y list), filled even-odd in value v.
export function drawMasses(g, items, { blur = 0, dv = 0, map = null } = {}) {
  if (!items) return;
  g.save();
  if (blur) g.filter = `blur(${blur}px)`;
  for (const [v, ...rings] of items) {
    g.beginPath();
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) { const p = map ? map([r[i], r[i + 1]]) : [r[i], r[i + 1]]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.closePath();
    }
    g.fillStyle = grey(v + dv);
    g.fill("evenodd");
  }
  g.restore();
}

// clip to the outline of mass items (their rings, even-odd)
export function clipMasses(g, items, map = null) {
  g.beginPath();
  for (const [, ...rings] of items) for (const r of rings) {
    for (let i = 0; i < r.length; i += 2) { const p = map ? map([r[i], r[i + 1]]) : [r[i], r[i + 1]]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
    g.closePath();
  }
  g.clip("evenodd");
}

// Draw with fn() into a scratch layer and composite it through a feathered mask: the polygons (flat x,y lists or
// [x,y] arrays, mapped by `map`) shrunk by `px` and blurred by `px`, so the edge of a traced patch (where the stacked
// level outlines all meet) fades out instead of leaving an antialiasing seam.
export function feathered(g, polys, px, fn, map = null) {
  const P = polys.map((Q) => Q.map((p) => (map ? map(p) : p)));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const Q of P) for (const [x, y] of Q) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 = Math.floor(x0 - 4 * px); y0 = Math.floor(y0 - 4 * px); x1 = Math.ceil(x1 + 4 * px); y1 = Math.ceil(y1 + 4 * px);
  const w = x1 - x0, h = y1 - y0;
  const [ca, a] = scratch("feaA", w, h), [cm, m] = scratch("feaM", w, h);
  a.translate(-x0, -y0); fn(a); a.setTransform(1, 0, 0, 1, 0, 0);
  m.translate(-x0, -y0); m.filter = `blur(${px}px)`; m.fillStyle = "#fff";
  for (const Q of P) {
    m.beginPath(); Q.forEach((q, i) => (i ? m.lineTo(q[0], q[1]) : m.moveTo(q[0], q[1]))); m.closePath(); m.fill();
    // shrink: erase a band 2*px wide along the outline
    m.save(); m.globalCompositeOperation = "destination-out"; m.lineWidth = 2 * px; m.lineJoin = "round"; m.stroke(); m.restore();
  }
  m.setTransform(1, 0, 0, 1, 0, 0); m.filter = "none";
  a.globalCompositeOperation = "destination-in"; a.drawImage(cm, 0, 0); a.globalCompositeOperation = "source-over";
  g.drawImage(ca, 0, 0, w, h, x0, y0, w, h);
}
export function releaseScratch() { for (const k in SLOTS) delete SLOTS[k]; }
