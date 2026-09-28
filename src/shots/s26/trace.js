// s26 traced-frame painter. A traced frame is [regions, inks, zone?]:
//   regions [colour, outer, hole, ...]  filled even-odd, large first, each also stroked 0.9 px in its own colour so
//                                       neighbouring regions meet without anti-aliasing seams
//   inks    [colour, [outer, hole...], ...]  thin lines, filled on top
//   zone    [outline, ...]               the traced area (used to feather the edge where the trace meets the background)
// Polygons are codec.js strings in frame px x2. Everything here is a pure function of its inputs.
import { dec } from "./codec.js";

function addPoly(P, a, k = 0.5, dx = 0, dy = 0) {
  const p = dec(a);
  P.moveTo(p[0] * k + dx, p[1] * k + dy);
  for (let i = 2; i < p.length; i += 2) P.lineTo(p[i] * k + dx, p[i + 1] * k + dy);
  P.closePath();
}
// o.col: a colour map (hex -> css colour; see toneMap), o.inkAlpha: opacity of the ink lines (1 = as traced)
export function paintTrace(g, fr, o = {}) {
  const [R, I] = fr, k = o.k ?? 0.5, dx = o.dx ?? 0, dy = o.dy ?? 0, sw = o.seam ?? 0.9, col = o.col || ((c) => c);
  g.save(); g.lineJoin = "round";
  for (const r of R) {
    const P = new Path2D(), c = col(r[0]);
    for (let j = 1; j < r.length; j++) addPoly(P, r[j], k, dx, dy);
    g.fillStyle = c; g.fill(P, "evenodd");
    if (sw) { g.lineWidth = sw; g.strokeStyle = c; g.stroke(P); }
  }
  if (o.ink !== false) {
    g.globalAlpha = o.inkAlpha ?? 1;
    for (const grp of I) {
      const P = new Path2D();
      for (let j = 1; j < grp.length; j++) for (const p of grp[j]) addPoly(P, p, k, dx, dy);
      g.fillStyle = col(grp[0]); g.fill(P, "evenodd");
    }
  }
  g.restore();
}
// a per-channel tone LUT as a colour map: offs = [R, G, B] strings of 256 digits (the offset added to each code, see
// s26/tone.js). Each colour is mapped once (memoised); a pure function of its inputs.
export function toneMap(offs) {
  const m = new Map();
  const f = (hex) => {
    let v = m.get(hex);
    if (v === undefined) {
      const n = parseInt(hex.slice(1, 7), 16), q = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      v = "#" + q.map((x, c) => Math.min(255, x + (offs[c].charCodeAt(x) - 48)).toString(16).padStart(2, "0")).join("");
      m.set(hex, v);
    }
    return v;
  };
  // the same LUT on a canvas's pixels (in place)
  f.canvas = (cv) => {
    const g = cv.getContext("2d"), id = g.getImageData(0, 0, cv.width, cv.height), d = id.data;
    const L = offs.map((s) => Uint8Array.from({ length: 256 }, (_, x) => Math.min(255, x + s.charCodeAt(x) - 48)));
    for (let i = 0; i < d.length; i += 4) { d[i] = L[0][d[i]]; d[i + 1] = L[1][d[i + 1]]; d[i + 2] = L[2][d[i + 2]]; }
    g.putImageData(id, 0, 0);
    return cv;
  };
  return f;
}
export function zonePath(fr, k = 0.5) {
  const P = new Path2D();
  for (const z of fr[2] || []) addPoly(P, z, k);
  return P;
}
export function zoneBox(fr) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const z of fr[2] || []) { const p = dec(z); for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i] / 2); x1 = Math.max(x1, p[i] / 2); y0 = Math.min(y0, p[i + 1] / 2); y1 = Math.max(y1, p[i + 1] / 2); } }
  return [Math.floor(x0) - 8, Math.floor(y0) - 8, Math.ceil(x1) + 8, Math.ceil(y1) + 8];
}
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// paint a traced frame onto a canvas of the frame's size (transparent outside the zone), its zone edge feathered by
// `feather` px (a blurred zone mask). cache: an object this function keeps its scratch canvas in.
export function tracedLayer(fr, W, H, cache, feather = 3, po = {}) {
  if (!cache.c) { cache.c = mk(W, H); cache.m = mk(W, H); }
  const c = cache.c, g = c.getContext("2d"), m = cache.m, gm = m.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (!fr) return c;
  const [x0, y0, x1, y1] = zoneBox(fr);
  paintTrace(g, fr, po);
  if (feather > 0 && fr[2]) {
    gm.setTransform(1, 0, 0, 1, 0, 0); gm.clearRect(0, 0, W, H);
    gm.filter = `blur(${feather}px)`; gm.fillStyle = "#fff";
    gm.fill(zonePath(fr)); gm.filter = "none";
    g.globalCompositeOperation = "destination-in";
    g.drawImage(m, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, W, Math.max(0, y0)); g.clearRect(0, y1, W, H); g.clearRect(0, 0, Math.max(0, x0), H); g.clearRect(x1, 0, W, H);
  }
  return c;
}
