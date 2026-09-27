// s23 cel renderer: decodes the traced foreground cels (cels.js) into Path2D level fills and paints them.
// A cel is a stack of nested regions, each filled with one flat pre-grade colour (darkest first), so the drawing is
// rebuilt from outlines only, plus (96.0–97.08) the bright cut lines as stroked centre lines with widths. Decoded
// paths are cached per source frame.
import { CELS } from "./cels.js";

const ALPH = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LUT = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPH.length; i++) LUT[ALPH.charCodeAt(i)] = i;

// varint reader over a string: 5 data bits per char, values >= 32 carry on; zigzag for signed values
function reader(s, i0 = 0) {
  let i = i0;
  const u = () => {
    let v = 0, shift = 0;
    for (;;) {
      const c = LUT[s.charCodeAt(i++)];
      if (c >= 32) { v += (c - 32) << shift; shift += 5; } else { v += c << shift; break; }
    }
    return v;
  };
  const z = () => { const v = u(); return v & 1 ? -((v + 1) >> 1) : v >> 1; };
  return { u, z, more: () => i < s.length };
}
// one ring: zigzag varints of half-pixel x, y, then deltas
function ringInto(path, s) {
  const r = reader(s), next = r.z;
  let x = next(), y = next();
  path.moveTo(x / 2, y / 2);
  while (r.more()) { x += next(); y += next(); path.lineTo(x / 2, y / 2); }
  path.closePath();
}
// one cut-line stroke: RRGGBB + per point x, y (zigzag half px, then deltas) and width (quarter px)
function strokeOf(s) {
  const color = "#" + s.slice(0, 6), r = reader(s, 6), pts = [];
  let x = r.z(), y = r.z();
  pts.push([x / 2, y / 2, r.u() / 4]);
  while (r.more()) { x += r.z(); y += r.z(); pts.push([x / 2, y / 2, r.u() / 4]); }
  return { color, pts };
}

const CACHE = new Map();
function resolve(k) {
  let v = CELS[k];
  while (typeof v === "number") { k = v; v = CELS[k]; }
  return v === undefined ? null : { k, s: v };
}
export function celOf(k) {
  const r = resolve(k);
  if (!r || !r.s) return null;
  if (CACHE.has(r.k)) return CACHE.get(r.k);
  const [head, body, lines] = r.s.split("#");
  const bbox = head.split(",").map(Number);
  const levels = (body ? body.split("!") : []).map((lv) => {
    // "RRGGBB" opaque, or "*RRGGBBAA" translucent (light / shadow laid over the page)
    const tr = lv[0] === "*", o = tr ? 1 : 0, path = new Path2D();
    const hex = lv.slice(o, o + 6), a = tr ? parseInt(lv.slice(o + 6, o + 8), 16) / 255 : 1;
    const color = tr ? `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${a.toFixed(3)})` : "#" + hex;
    for (const ring of lv.slice(o + (tr ? 8 : 6)).split("~")) if (ring) ringInto(path, ring);
    return { color, path };
  });
  const strokes = lines ? lines.split("!").filter(Boolean).map(strokeOf) : [];
  const cel = { bbox, levels, strokes };
  CACHE.set(r.k, cel);
  return cel;
}
export function hasCel(k) { return !!resolve(k)?.s; }
// paint the cel of source frame k (frame coordinates, unshaken)
export function drawCel(ctx, k, alpha = 1) {
  const c = celOf(k);
  if (!c) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (const L of c.levels) { ctx.fillStyle = L.color; ctx.fill(L.path, "evenodd"); }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const S of c.strokes) {
    ctx.strokeStyle = S.color;
    const p = S.pts;
    for (let j = 0; j + 1 < p.length; j++) {
      ctx.lineWidth = (p[j][2] + p[j + 1][2]) / 2;
      ctx.beginPath(); ctx.moveTo(p[j][0], p[j][1]); ctx.lineTo(p[j + 1][0], p[j + 1][1]); ctx.stroke();
    }
  }
  ctx.restore();
}
export function releaseCels() { CACHE.clear(); }
