// s15 scene building: boxes, props and floor tiles -> engraved faces for the GL renderer.
// World: x right, y up, z forward down the corridor, floor at y = 0. Units: the owl stands ~0.35 tall.
import { rng } from "../../lib/rng.js";
import { rect } from "./atlas.js";

const CARDS = ["card0", "card1", "card2", "card3", "card4", "card5"];
const SIDES = ["side0", "side1", "card2", "card4"];
const TOPS = ["top0", "top1"];

// rotate (x,z) about a centre by yaw
function rot(p, cx, cz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw), dx = p[0] - cx, dz = p[2] - cz;
  return [cx + dx * c + dz * s, p[1], cz - dx * s + dz * c];
}
function rotN(n, yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); return [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c]; }

// A box: x, z = centre on the floor plan, y = bottom; w (x), h (y), d (z); yaw; albedo; textures; seed.
// Emits front (-z), left (-x), right (+x) and top faces (the back and bottom are never seen).
export function boxFaces(b, out) {
  const { x, y = 0, z, w, h, d, yaw = 0, alb = 0.9, seed = 1 } = b;
  const r = rng(seed * 7 + 3);
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h;
  const P = (px, py, pz) => rot([px, py, pz], x, z, yaw);
  const tf = b.front ?? CARDS[Math.floor(r() * CARDS.length)];
  const ts = b.side ?? SIDES[Math.floor(r() * SIDES.length)];
  const tt = b.top ?? TOPS[Math.floor(r() * TOPS.length)];
  const sp = b.sp ?? 0.0055;
  const common = { sp, ink: b.ink ?? 1.2, seed: seed % 97, style: b.style ?? 0 };
  const sideAlb = alb * (b.sideK ?? 0.92);
  const tv = b.tv || null;   // measured face values [front, left, right, top] (keyed boxes), -1 = lit normally
  // front, facing the camera (-z)
  if (b.noFront !== true) out.push({ q: [P(x0, y, z0), P(x1, y, z0), P(x1, y1, z0), P(x0, y1, z0)], n: rotN([0, 0, -1], yaw), su: w, sv: h, at: rect(tf), alb, ang: Math.PI / 2, ...common, style: b.frontStyle ?? common.style, fk: 0, tv: tv ? tv[0] : -1 });
  // left face (-x): seen from the corridor when the box stands on the right wall; u runs toward +z
  if (b.noLeft !== true) out.push({ q: [P(x0, y, z0), P(x0, y, z1), P(x0, y1, z1), P(x0, y1, z0)].reverse().reverse(), n: rotN([-1, 0, 0], yaw), su: d, sv: h, at: rect(b.left ?? ts), alb: sideAlb, ang: 0, ...common, style: b.leftStyle ?? common.style, uo: 0, fk: 1, tv: tv ? tv[1] : -1 });
  // right face (+x): seen when the box stands on the left wall; u runs toward -z (reads left-to-right from the corridor)
  if (b.noRight !== true) out.push({ q: [P(x1, y, z1), P(x1, y, z0), P(x1, y1, z0), P(x1, y1, z1)], n: rotN([1, 0, 0], yaw), su: d, sv: h, at: rect(b.right ?? ts), alb: sideAlb, ang: 0, ...common, style: b.rightStyle ?? common.style, fk: 2, tv: tv ? tv[2] : -1 });
  // top
  if (b.noTop !== true) out.push({ q: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], n: [0, 1, 0], su: w, sv: d, at: rect(tt), alb: alb * (b.topK ?? 0.95), ang: 0, ...common, style: b.topStyle ?? common.style, fk: 3, tv: tv ? tv[3] : -1 });
}

// A flat panel (keyboard leaning on the wall, a shelf front, the speaker front): centre c, width along its u axis,
// height along v; ux = unit vector of u, vy = unit vector of v; picture shown flat (style 1) by default.
export function panel(c, ux, vy, w, h, tex, o, out) {
  const hw = w / 2, hh = h / 2;
  const p = (a, b) => [c[0] + ux[0] * a + vy[0] * b, c[1] + ux[1] * a + vy[1] * b, c[2] + ux[2] * a + vy[2] * b];
  const n = [ux[1] * vy[2] - ux[2] * vy[1], ux[2] * vy[0] - ux[0] * vy[2], ux[0] * vy[1] - ux[1] * vy[0]];
  out.push({ q: [p(-hw, -hh), p(hw, -hh), p(hw, hh), p(-hw, hh)], n, su: w, sv: h, at: rect(tex), alb: o.alb ?? 1, ang: o.ang ?? 0, sp: o.sp ?? 0.005, ink: o.ink ?? 0.6, seed: o.seed ?? 5, style: o.style ?? 1 });
}

// A keyboard leaning against a wall: foot on the floor at (x, z), leaning back toward the wall by `lean` (rad),
// facing the corridor (side = -1 on the left wall -> faces +x; +1 on the right wall -> faces -x), long axis along z.
// len = length along z, tall = how far up the wall it reaches (it stands on its end, keys facing out).
export function keyboard(o, out) {
  const { x, z, len = 1.0, deep = 0.3, side = -1, lean = 0.25, twist = 0, y0 = 0 } = o;
  // u along the length (vertical-ish, up the wall), v across the keys
  const up = [Math.sin(lean) * side * -1, Math.cos(lean), 0];
  // the keyboard stands on end: its long axis goes up and back
  const ax = [up[0] * Math.cos(twist), up[1], Math.sin(twist)];
  const across = [0, 0, 1];
  const c = [x + ax[0] * len / 2, y0 + ax[1] * len / 2, z + ax[2] * len / 2];
  const n = side < 0 ? [1, 0, 0] : [-1, 0, 0];
  // picture u = along the keys (the keyboard's length), v = across (key length): u runs up the wall
  const uvec = ax, vvec = side < 0 ? [0, 0, -1] : [0, 0, 1];
  panel(c, uvec, vvec, len, deep, "keys", { alb: 1, seed: 9 }, out);
  // a slab behind it so it has thickness
  const back = [c[0] - n[0] * 0.03, c[1], c[2]];
  panel(back, uvec, vvec, len * 1.01, deep * 1.02, "kbbody", { alb: 0.5, seed: 10 }, out);
}

// Floor: tiles of `tile` units from x0..x1, z0..z1
export function floor(x0, x1, z0, z1, out, o = {}) {
  const t = o.tile ?? 0.8;
  for (let x = x0; x < x1 - 1e-6; x += t) for (let z = z0; z < z1 - 1e-6; z += t) {
    const xa = x, xb = Math.min(x1, x + t), za = z, zb = Math.min(z1, z + t);
    out.push({ q: [[xa, 0, za], [xb, 0, za], [xb, 0, zb], [xa, 0, zb]], n: [0, 1, 0], su: xb - xa, sv: zb - za, at: rect("floor"), alb: o.alb ?? 0.85, ang: o.ang ?? 0, sp: o.sp ?? 0.006, ink: 0, seed: 3, style: 0 });
  }
}

// A wall of stacked boxes along z on one side of the corridor.
// side: -1 left (boxes' inner faces at x = inner), +1 right. cols: [{ z0, z1, jut, rows: [h,...], alb, ... }]
// Unspecified: a column of random boxes. Everything is seeded.
export function wall(side, inner, cols, out, seed = 1, o = {}) {
  const r = rng(seed);
  for (const col of cols) {
    const d = col.z1 - col.z0;
    let y = 0;
    const rows = col.rows ?? [0.3 + r() * 0.12, 0.28 + r() * 0.14, 0.3 + r() * 0.1, 0.32 + r() * 0.1, 0.3, 0.3, 0.3];
    const top = col.top ?? (o.top ?? 2.6);
    let i = 0;
    while (y < top && i < rows.length + 10) {
      const h = rows[i] ?? (0.26 + r() * 0.12);
      const jut = (col.jut ?? 0) + (col.juts ? col.juts[i] ?? 0 : (r() - 0.5) * 0.05);
      const w = col.w ?? 0.45;
      const xin = inner - side * jut;             // inner face x (toward the corridor)
      const cx = xin + side * w / 2;
      const dd = d * (col.shrink ? col.shrink[i] ?? 1 : 1 - r() * 0.08);
      const cz = col.z0 + d / 2 + (col.dz ? col.dz[i] ?? 0 : (r() - 0.5) * 0.04);
      const alb = (col.alb ?? 0.92) * (col.albs ? col.albs[i] ?? 1 : 0.88 + r() * 0.14);
      const b = { x: cx, y, z: cz, w, h: h * 0.995, d: dd, yaw: (col.yaw ?? 0) + (r() - 0.5) * (col.wob ?? 0.05), alb, seed: Math.floor(r() * 1e6), sideK: col.sideK ?? 0.95 };
      if (side < 0) b.noLeft = true; else b.noRight = true;
      if (col.tex) Object.assign(b, col.tex);
      boxFaces(b, out);
      y += h; i++;
    }
  }
}

// Evenly spaced default columns between z0..z1 with random depths.
export function autoCols(z0, z1, seed, o = {}) {
  const r = rng(seed);
  const cols = [];
  let z = z0;
  while (z < z1) {
    const d = (o.dmin ?? 0.32) + r() * ((o.dmax ?? 0.55) - (o.dmin ?? 0.32));
    cols.push({ z0: z, z1: z + d, jut: (o.jut ?? 0) + (r() - 0.5) * (o.jutVar ?? 0.12), alb: o.alb ?? 0.92 });
    z += d;
  }
  return cols;
}

// A keyboard as a slab given by three world corners: BL (panel side, bottom), BR (keys side, bottom) and TL (top of
// the panel side). The keys picture runs up the slab (u) and across it (v, panel -> keys); a dark casing sits behind.
export function kbQuad(BL, BR, TL, out, o = {}) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const across = sub(BR, BL), up = sub(TL, BL);
  const TR = add(TL, across);
  const len = Math.hypot(...up), w = Math.hypot(...across);
  let n = [up[1] * across[2] - up[2] * across[1], up[2] * across[0] - up[0] * across[2], up[0] * across[1] - up[1] * across[0]];
  const nl = Math.hypot(...n); n = n.map((x) => x / nl);
  // make the normal face the camera side (-z / toward the corridor centre)
  if (n[2] > 0) n = n.map((x) => -x);
  // picture: u = along the slab (BL -> TL), v = across (BL -> BR)
  out.push({ q: [BL, TL, TR, BR], n, su: len, sv: w, at: rect("keys"), alb: o.alb ?? 1, ang: 0, sp: 0.005, ink: 0.4, seed: 9, style: 1 });
  // casing: the same slab pushed back a little, plus a lit edge along the keys side
  const back = n.map((x) => -x * (o.thick ?? 0.05));
  const b = (p) => add(p, back);
  out.push({ q: [b(BL), b(TL), b(TR), b(BR)], n, su: len, sv: w, at: rect("kbbody"), alb: 0.5, ang: 0, sp: 0.005, ink: 0.4, seed: 10, style: 1 });
  out.push({ q: [BR, TR, b(TR), b(BR)], n: across.map((x) => x / w), su: len, sv: o.thick ?? 0.05, at: rect("kbbody"), alb: 0.55, ang: 0, sp: 0.005, ink: 0.8, seed: 11, style: 1 });
  out.push({ q: [BL, TL, b(TL), b(BL)], n: across.map((x) => -x / w), su: len, sv: o.thick ?? 0.05, at: rect("kbbody"), alb: 0.4, ang: 0, sp: 0.005, ink: 0.8, seed: 12, style: 1 });
}

// Fix pass 3: the continuous floor. Tiles only split the geometry: their surface coordinates are world x/z (the board
// grain and hatching run on unbroken across tile edges) and their value is the shader's one smooth floor field (the
// marker value -2: a pool of light round the owl over a dark base, fading out ahead), not a value per tile.
export function floorC(x0, x1, z0, z1, out, o = {}) {
  const t = o.tile ?? 1.0;
  for (let x = x0; x < x1 - 1e-6; x += t) for (let z = z0; z < z1 - 1e-6; z += t) {
    const xa = x, xb = Math.min(x1, x + t), za = z, zb = Math.min(z1, z + t);
    out.push({ q: [[xa, 0, za], [xb, 0, za], [xb, 0, zb], [xa, 0, zb]], n: [0, 1, 0], su: xb - xa, sv: zb - za, uo: xa, vo: za, at: rect("plain"), alb: 1, ang: 0, sp: o.sp ?? 0.006, ink: 0, seed: 3, style: 0, tv: [-2, -2, -2, -2] });
  }
  return out;
}
