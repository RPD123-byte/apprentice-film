// s27 polygon codec: the traced polygons are stored as strings (delta-coded, zigzag, 5-bit varint chunks, chars 63..126;
// written by snapshots/s27-k-tools/codec.py). poly(p) returns the flat int array [x0,y0,x1,y1,...] for a string (or passes
// an array through).
const CACHE = new Map();
export function poly(p) {
  if (typeof p !== "string") return p;
  const out = []; let z = 0, sh = 0, px = 0, py = 0, odd = false;
  for (let i = 0; i < p.length; i++) {
    const b = p.charCodeAt(i) - 63; z |= (b & 31) << sh; sh += 5;
    if (b < 32) {
      const v = z & 1 ? -((z + 1) >> 1) : z >> 1; z = 0; sh = 0;
      if (!odd) { px += v; out.push(px); } else { py += v; out.push(py); }
      odd = !odd;
    }
  }
  return out;
}
export { CACHE };
