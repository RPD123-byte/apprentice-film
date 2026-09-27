// s06 r3 layers: a layer measured by trace3/ (see trace3/README.md) is drawn as
//   ground : nested value outlines over a base value, drawn crisp into a scratch layer that is composited blurred
//            (GBLUR) — so outlines that meet at a sharp edge do not compound;
//   solids : the thick darks (lash lines, pupils ...), the same way (SBLUR);
//   ink    : calibrated pen strokes (drawInk, one tone per stroke, width per point, soft);
//   light  : pale strokes on dark.
// A layer may be clipped to a polygon, and displaced point by point (`map`) for the moving brows.
import { drawInk } from "./ink.js";

const clampv = (v) => Math.max(0, Math.min(1, v));
const grey = (v) => { const c = Math.round(clampv(v) * 255); return `rgb(${c},${c},${c})`; };
const SL = {};
const mkc = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
function scratch(slot, w, h) {
  let c = SL[slot];
  if (!c || c.width < w || c.height < h) c = SL[slot] = mkc(Math.max(w, c ? c.width : 0), Math.max(h, c ? c.height : 0));
  const o = c.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.filter = "none"; o.globalAlpha = 1;
  o.clearRect(0, 0, c.width, c.height);
  return [c, o];
}
export function release3() { for (const k in SL) delete SL[k]; }

function itemsBox(items, map, pad) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [, ...rings] of items) for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    const p = map ? map([r[i], r[i + 1]]) : [r[i], r[i + 1]];
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
}
function fillItems(o, items, map) {
  for (const [v, ...rings] of items) {
    o.beginPath();
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) { const p = map ? map([r[i], r[i + 1]]) : [r[i], r[i + 1]]; i ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1]); }
      o.closePath();
    }
    o.fillStyle = grey(v); o.fill("evenodd");
  }
}
// nested outlines drawn crisp into a layer (over `base` if given), composited blurred by `blur`
export function massLayer(g, items, blur, { base = null, map = null, box = null } = {}) {
  if (!items || (!items.length && base === null)) return;
  const pad = Math.ceil(3 * blur) + 2;
  const [x0, y0, x1, y1] = box || itemsBox(items, map, pad);
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const [c, o] = scratch("mass", w, h);
  o.translate(-x0, -y0);
  if (base !== null) { o.fillStyle = grey(base); o.fillRect(x0, y0, w, h); }
  fillItems(o, items, map);
  g.save(); if (blur) g.filter = `blur(${blur}px)`; g.drawImage(c, 0, 0, w, h, x0, y0, w, h); g.restore();
}
export function clipPoly(g, P) { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip(); }
// a whole r3 layer
export function drawLayer3(g, L, { clip = null, base = null, box = null, gblur = 1, sblur = 0.6, opts, map = null } = {}) {
  g.save();
  if (clip) clipPoly(g, clip);
  if (L.ground) massLayer(g, L.ground, gblur, { base, map, box });
  if (L.solids && L.solids.length) massLayer(g, L.solids, sblur, { map });
  if (L.ink && L.ink.length) drawInk(g, L.ink, { ...opts, map });
  if (L.light && L.light.length) drawInk(g, L.light, { ...opts, bright: true, map });
  g.restore();
}

// clip to even-odd rings (flat x,y lists)
export function clipRings(g, R) {
  g.beginPath();
  for (const r of R) { for (let i = 0; i < r.length; i += 2) (i ? g.lineTo(r[i], r[i + 1]) : g.moveTo(r[i], r[i + 1])); g.closePath(); }
  g.clip("evenodd");
}
// enc 2 (trace3/layers_r3.py enc_items / enc_strokes): integer deltas, decoded once in place
function decItems(items) {
  return items.map(([v, ...rings]) => [v / 1000, ...rings.map((r) => { const o = new Array(r.length); let x = 0, y = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; o[i] = x / 2; o[i + 1] = y / 2; } return o; })]);
}
function decStrokes(st, bright) {
  return st.map((s) => {
    const v = s[0] / 1000, b = bright ? v - 1 : v + 1, n = (s.length - 1) / 3, o = new Array(n * 5);
    let x = 0, y = 0, w = 0;
    for (let i = 0; i < n; i++) { x += s[1 + i * 3]; y += s[2 + i * 3]; w += s[3 + i * 3]; o[i * 5] = x / 10; o[i * 5 + 1] = y / 10; o[i * 5 + 2] = w / 100; o[i * 5 + 3] = v; o[i * 5 + 4] = b; }
    return o;
  });
}
export function decodeR3(L) {
  if (L.enc === 2) {
    if (L.ground) L.ground = decItems(L.ground);
    L.solids = decItems(L.solids || []); L.ink = decStrokes(L.ink || [], false); L.light = decStrokes(L.light || [], true);
    L.enc = 0;
  }
  return L;
}
// an r3 layer module (data/r3_*.js: { opts, gblur, sblur, clip | clipRings, box, base, ground, solids, ink, light })
export function drawR3(g, L, map = null) {
  decodeR3(L);
  g.save();
  if (L.clip) clipPoly(g, L.clip); else if (L.clipRings) clipRings(g, L.clipRings);
  if (L.ground) massLayer(g, L.ground, L.gblur, { base: L.base, map, box: map ? null : L.box });
  if (L.solids && L.solids.length) massLayer(g, L.solids, L.sblur, { map });
  if (L.ink && L.ink.length) drawInk(g, L.ink, { ...L.opts, map });
  if (L.light && L.light.length) drawInk(g, L.light, { ...L.opts, bright: true, map });
  g.restore();
}
