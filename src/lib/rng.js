// Deterministic randomness. Math.random is never used: every mark comes from a seeded stream.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable hash of integers to [0,1).
export function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// 1D/2D value noise, smooth, in [-1,1].
const fade = (t) => t * t * (3 - 2 * t);
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * fade(f);
}
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  const u = fade(fx), v = fade(fy);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t, p = 3) => 1 - Math.pow(1 - clamp(t), p);
export const easeIn = (t, p = 3) => Math.pow(clamp(t), p);
// Map t from [a,b] to [0,1], clamped.
export const span = (t, a, b) => clamp((t - a) / (b - a));
