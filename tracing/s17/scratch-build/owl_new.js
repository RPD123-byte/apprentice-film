// s17 owl: the owl inside the sōko illustration (47.84–53.24). Key poses measured on the source (page pixels),
// interpolated, and sampled on the source's drawing times (it animates on twos from ~49.3 s, on ones for the dash).
// Keys are written in PAGE PIXELS (= frame pixels once the pull-back has settled) and converted to owl units here.
import { mergePose } from "../../lib/owlInk.js";

// ---------------------------------------------------------------- pose interpolation
// numbers lerp, arrays of equal length lerp element-wise, objects key by key; anything else switches at u = 0.5.
export function mixPose(a, b, u) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], u));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) o[k] = b[k]; else if (!(k in b)) o[k] = a[k]; else o[k] = mixPose(a[k], b[k], u);
    }
    return o;
  }
  return u < 0.5 ? a : b;
}

// eye look used here: the source's owl has round, thin-rimmed eyes with small pupils (no heavy lids)
const ROUND = { pupil: 0.26, lid: 0, curve: 0, slant: 0, lidW: 0.05, low: 0, ext: 0, ringW: 1.6 };

// ---------------------------------------------------------------- key poses in page px
// head {x,y,r (px), yaw,pitch,roll}, body {x,y,a,b (px), rot}, tail {base,dir,len(px),n,spread,w(px)} | null,
// wings [{S,Wr,T (px), trail, len (px), n, m, ...}] (0 = the owl's left = viewer-right wing, 1 = viewer-left),
// feet [{x,y (px), rot, size (px), spread, curl}], eyes {r (px), spread, el, look}, beak {..., w,l in px}
const A = {
  root: [735, 505], s: 0.4,
  head: { x: 707, y: 462, r: 38.4, yaw: 0.74, pitch: 0, roll: -0.3, square: 2.1 },
  body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
  tail: { base: [737, 530], dir: [0, 1], len: 2, n: 5, spread: 1.0, w: 6 },
  wings: [
    { S: [758, 452], Wr: [778, 440], T: [806, 487], trail: [1, 0.2], len: 16, n: 4, m: 2, bulge: 0.25, pin: 1.3, seed: 21 },
    { S: [703, 487], Wr: [669, 501], T: [625, 548], trail: [0.25, 1], len: 24, n: 4, m: 3, seed: 17 },
  ],
  feet: [
    { x: 768, y: 523, rot: 0.1, size: 16, fat: 0.28, toes: 3, spread: 0.9, curl: 0.2, seed: 2 },
    { x: 786, y: 523, rot: -1.97, size: 17.6, fat: 0.28, toes: 3, spread: 1.3, curl: 0.5, seed: 5 },
  ],
  order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
  eyes: { r: 11.2, spread: 0.38, el: -0.15, look: [0.6, -0.6] },
  beak: { az: 0.08, el: -0.5, lift: 1.05, w: 9.6, l: 11.2, open: 0 },
  plaster: { az: -0.2, el: 0.95, w: 14.4, h: 4.4 },
  headphones: { yaw: 0.74, dx: 0, dy: 0.05, lift: 1.0, r: 18, bandR: 1.0, bandH: 1.3, tilt: 0.1, open: 0.6, cupEl: 0.0, w: 5.2 },
};
const B = mergePose(A, {
  wings: [
    { S: [757, 447], Wr: [790, 422], T: [823, 432], trail: [0.3, 1], len: 25, n: 4, m: 2, bulge: 0.2, pin: 1.15, seed: 21 },
    { S: [695, 490], Wr: [650, 505], T: [598, 527], trail: [0.2, 1], len: 22, n: 4, m: 3, seed: 17 },
  ],
});
const C = mergePose(B, {
  head: { x: 710, y: 455 },
  body: { x: 740, y: 503, a: 56, b: 47, rot: 0.3 },
  tail: { base: [737, 538], dir: [0, 1], len: 10, n: 5, spread: 1.0, w: 7 },
  wings: [
    { S: [757, 457], Wr: [770, 420], T: [808, 382], trail: [1, 0.3], len: 25, n: 4, m: 2, bulge: 0.2, pin: 1.15, seed: 21 },
    { S: [703, 485], Wr: [650, 490], T: [575, 497], trail: [0.15, 1], len: 35, n: 5, m: 4, seed: 17 },
  ],
  eyes: { look: [0.6, -0.5] },
});
const D = mergePose(C, {
  head: { x: 713, y: 448, yaw: 0.62, roll: -0.3 },
  headphones: { yaw: 0.62 },
  body: { x: 740, y: 503, a: 55, b: 48, rot: 0.7 },
  tail: { base: [735, 540], dir: [0, 1], len: 22, n: 5, spread: 1.1, w: 8 },
  wings: [
    { S: [760, 450], Wr: [770, 400], T: [778, 355], trail: [1, 0.1], len: 22, n: 4, m: 2, bulge: 0.2, pin: 1.15, seed: 21 },
    { S: [703, 477], Wr: [640, 470], T: [572, 443], trail: [0.3, 1], len: 30, n: 5, m: 4, seed: 17 },
  ],
  feet: [{ x: 755, y: 525, rot: 0.1 }, { x: 795, y: 513 }],
  eyes: { look: [0.4, -0.3] },
});
const E = mergePose(D, {
  head: { x: 713, y: 437, r: 40, yaw: 0.35, roll: -0.3 },
  headphones: { yaw: 0.35 },
  body: { x: 737, y: 503, a: 50, b: 45, rot: 1.4 },
  tail: { base: [730, 538], dir: [0, 1], len: 24, n: 5, spread: 1.2, w: 9 },
  wings: [
    { S: [760, 455], Wr: [768, 400], T: [760, 342], trail: [1, 0.25], len: 25, n: 5, m: 2, bulge: 0.2, pin: 1.15, seed: 21 },
    { S: [690, 473], Wr: [630, 455], T: [578, 415], trail: [-0.2, 1], len: 32, n: 5, m: 4, seed: 17 },
  ],
  feet: [{ x: 750, y: 525 }, { x: 795, y: 505 }],
  eyes: { r: 12, look: [0.1, -0.2] },
  beak: { open: 0.5 },
});
const F = mergePose(E, {
  head: { x: 717, y: 432, r: 40, yaw: 0.17, roll: -0.36, pitch: 0 },
  headphones: { yaw: 0.17 },
  body: { x: 738, y: 493, a: 45, b: 44, rot: 1.5 },
  tail: { base: [725, 528], dir: [0, 1], len: 26, n: 5, spread: 1.3, w: 9 },
  wings: [
    { S: [757, 462], Wr: [765, 400], T: [757, 332], trail: [1, 0.2], len: 30, n: 5, m: 2, bulge: 0.2, pin: 1.15, seed: 21 },
    { S: [695, 468], Wr: [625, 440], T: [582, 400], trail: [-0.2, 1], len: 30, n: 5, m: 4, seed: 17 },
  ],
  feet: [{ x: 750, y: 520 }, { x: 795, y: 500 }],
  eyes: { r: 12.5, spread: 0.42, look: [-0.2, -0.1] },
  beak: { open: 0.6 },
});

// key poses: { t (film s), pose }
export const KEYS = [
  { t: 48.72, p: A },
  { t: 49.08, p: A },
  { t: 49.88, p: B },
  { t: 50.40, p: C },
  { t: 50.88, p: D },
  { t: 51.36, p: E },
  { t: 51.84, p: F },
];

// ---------------------------------------------------------------- px -> owl units
export function toUnits(K) {
  const s = K.s, R = K.root, u = (p) => [(p[0] - R[0]) / s, (p[1] - R[1]) / s], d = (v) => v / s;
  const h = K.head, hr = d(h.r);
  const hc = u([h.x, h.y]);
  return {
    x: R[0], y: R[1], s, rot: K.rot || 0,
    light: [-0.55, -0.83],
    head: { x: hc[0], y: hc[1], rx: hr * (h.sx ?? 1), ry: hr, yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: h.square ?? 2.1, jowl: 0.04 },
    body: K.body ? { x: u([K.body.x, K.body.y])[0], y: u([K.body.x, K.body.y])[1], a: d(K.body.a), b: d(K.body.b), rot: K.body.rot || 0, egg: K.body.egg || 0, sag: 0 } : null,
    tail: K.tail && K.tail.len > 3 ? { base: u(K.tail.base), dir: K.tail.dir, len: d(K.tail.len), n: K.tail.n, spread: K.tail.spread, w: d(K.tail.w) } : null,
    wings: K.wings.map((w) => ({ ...w, S: u(w.S), Wr: u(w.Wr), T: u(w.T), len: d(w.len) })),
    feet: K.feet.map((f) => ({ ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size) })),
    order: K.order,
    eyes: { state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: ROUND, left: K.eyes.left, right: K.eyes.right },
    beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l) },
    plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
    headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w) },
    disc: 1, blur: K.blur, flip: K.flip,
  };
}

// the owl at film time t (continuous; the caller quantises to the drawing times). Returns a pose in owl units.
export function owlAt(t) {
  const K = KEYS;
  let k;
  if (t <= K[0].t) k = K[0].p;
  else if (t >= K[K.length - 1].t) k = K[K.length - 1].p;
  else {
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i].t) {
        const a = K[i - 1], b = K[i], u = (t - a.t) / (b.t - a.t);
        k = mixPose(a.p, b.p, b.ease ? b.ease(u) : u);
        break;
      }
    }
  }
  return toUnits(k);
}
