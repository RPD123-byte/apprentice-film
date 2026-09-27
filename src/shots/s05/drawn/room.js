// s05 drawn: the room behind the desk (settled frame px; the layer reaches past the frame for the camera settle).
// Cartons stacked left and behind the laptop, the tall carton right of the screen, the monitor speaker behind his
// face, the slotted shelf upright and the cartons at the right edge, all scratched white into black (carve: lines
// whose mean brightness equals the face's light). Corners were read off 2x labelled grids of the rest frame
// (24.88–25.08) and checked with line profiles; each face's light is a small grid of values fitted to that frame's
// pre-grade light (./roomvals.js, control values only).
import { carve, drip, ink, fill, fillSoft, dot, ring, lgrad, rgrad, grey, lerp, clamp, sstep, rng, PI, TAU, ELL, woofer, softLine, blurDraw } from "./kit.js";
import { RV } from "./roomvals.js";

// value grid [nu, nv, vals] -> vq(u, v) (bilinear between the knots)
export function gridV(G, gain = 1) {
  const [nu, nv, a] = G;
  return (u, v) => {
    const fu = clamp(u) * (nu - 1), fv = clamp(v) * (nv - 1);
    const i0 = Math.min(Math.floor(fu), Math.max(0, nu - 2)), j0 = Math.min(Math.floor(fv), Math.max(0, nv - 2));
    const wu = nu > 1 ? fu - i0 : 0, wv = nv > 1 ? fv - j0 : 0;
    const at = (i, j) => a[Math.min(nv - 1, j) * nu + Math.min(nu - 1, i)];
    return gain * lerp(lerp(at(i0, j0), at(i0 + 1, j0), wu), lerp(at(i0, j0 + 1), at(i0 + 1, j0 + 1), wu), wv);
  };
}
// the bounding-box value function of a polygon face (fitted with "poly": u, v over its bbox)
function polyV(pts, G, gain = 1) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), f = gridV(G, gain);
  return (x, y) => f((x - x0) / (x1 - x0), (y - y0) / (y1 - y0));
}
const edge = (g, pts, w = 1.4, v = 0.85, seed = 1, o = {}) => ink(g, pts, w, grey(v, o.a ?? 1), { seed, ends: o.ends ?? 0.5, jit: o.jit ?? 0.3, closed: o.closed });
const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#050505", { seed, ends: o.ends ?? 0.6, jit: o.jit ?? 0.3, closed: o.closed });

// the faces (TL, TR, BR, BL; lines run TL->BL for dir "v")
export const F = {
  L1top: [[-130, 86], [210, 92], [252, 106], [-130, 103]],
  L1front: [[-130, 103], [237, 108], [249, 322], [-130, 318]],
  L1lab: [[45, 124], [114, 124], [114, 190], [47, 192]],
  L1edge: [[226, 108], [240, 108], [252, 322], [238, 322]],
  R2top: [[243, 128], [350, 103], [690, 102], [687, 120], [317, 160]],
  R2front: [[317, 160], [687, 120], [687, 158], [322, 212]],
  R2side: [[243, 128], [317, 160], [322, 212], [250, 176]],
  Cleft: [[725, 12], [900, 15], [900, 165], [725, 152]],
  Cright: [[900, 15], [1050, 12], [1050, 140], [900, 165]],
  Clab: [[792, 16], [826, 16], [826, 62], [792, 60]],
  Dfront: [[855, 170], [978, 185], [978, 478], [855, 472]],
  Dtop: [[855, 160], [960, 150], [1080, 140], [978, 185], [855, 170]],
  Dside: [[978, 185], [1080, 140], [1080, 470], [978, 478]],
  Eback: [[1022, 148], [1078, 142], [1078, 225], [1022, 232]],
  Eside: [[1128, 192], [1148, 202], [1148, 508], [1128, 500]],
  Efront: [[1148, 202], [1330, 200], [1330, 508], [1148, 508]],
  SHup: [[1958, -130], [2010, -130], [1946, 470], [1915, 470]],
  SHbar: [[1880, 84], [1960, 92], [1958, 126], [1880, 118]],
  Htop: [[2040, 392], [2206, 380], [2420, 375], [2420, 400], [2206, 402], [2055, 414]],
  Hfront: [[2055, 414], [2420, 402], [2420, 600], [2050, 605]],
  H2top: [[2040, 606], [2420, 598], [2420, 628], [2046, 632]],
  H2front: [[2046, 632], [2420, 628], [2420, 850], [2050, 850]],
};
const Q = (n) => F[n];
const V = (n, gain = 1) => gridV(RV[n], gain);

export function paintRoom(g) {
  g.fillStyle = "#000"; g.fillRect(-200, -200, 2800, 1500);
  // ---- the left carton column (its label: a screentoned square with a dark rim)
  carve(g, null, { q: Q("L1top"), dir: "h", vq: V("L1top"), per: 5.5, seed: 11, wav: 0.3, bg: 0.4 });
  carve(g, null, { q: Q("L1front"), dir: "v", vq: V("L1front"), per: 6, seed: 12, bg: 0.3, lum: 0.62, wav: 0.3, streak: 0.4, brk: 0.3 });
  carve(g, null, { q: Q("L1edge"), dir: "v", vq: V("L1edge"), per: 4.5, seed: 13 });
  fill(g, Q("L1lab"), grey(0.12));
  carve(g, Q("L1lab"), { ang: PI / 4, vq: null, v: RV.L1lab[2].reduce((a, b) => a + b, 0) / RV.L1lab[2].length, per: 3, seed: 14, jit: 0.02, wav: 0.02, brk: 0, streak: 0 });
  dark(g, [[45, 124], [114, 124], [114, 190], [47, 192]], 1.8, 15, { closed: true });
  dark(g, [[-130, 103], [237, 108]], 2.2, 16);
  edge(g, [[237, 108], [249, 322]], 1.5, 0.5, 17);
  dark(g, [[-130, 318], [249, 324]], 2.5, 18);
  // ---- the carton row behind the laptop
  carve(g, Q("R2top"), { ang: -0.06, vf: polyVF("R2top"), per: 5.2, seed: 21, wav: 0.3 });
  drip(g, null, { q: Q("R2front"), dir: "v", vq: V("R2front"), per: 6.2, dens: 0.85, w: [1.6, 3.2], len: [0.6, 1], b0: [0, 0.15], dk: [0.4, 0.8], mot: 0.12, seed: 22 });
  carve(g, null, { q: Q("R2side"), dir: "v", vq: V("R2side"), per: 5.5, seed: 23 });
  // the tape down its front and across the top
  fill(g, [[475, 136], [533, 131], [534, 170], [477, 176]], grey(0.4));
  carve(g, [[475, 136], [533, 131], [534, 170], [477, 176]], { ang: PI / 2, v: 0.42, per: 3.5, seed: 24, streak: 0.5 });
  dark(g, [[475, 136], [533, 131], [534, 170], [477, 176], [475, 136]], 1.4, 25);
  dark(g, [[317, 160], [687, 120]], 1.8, 26); dark(g, [[322, 212], [687, 158]], 2.2, 27);
  // ---- the cartons stacked top middle
  drip(g, null, { q: Q("Cleft"), dir: "v", vq: V("Cleft"), per: 6, dens: 0.9, w: [1.6, 3.4], len: [0.5, 1], b0: [0, 0.2], dk: [0.55, 0.95], mot: 0.22, seed: 31, spots: 0.04 });
  carve(g, null, { q: Q("Cright"), dir: "v", vq: V("Cright"), per: 6, seed: 32 });
  fill(g, Q("Clab"), grey(0.1)); edge(g, Q("Clab"), 1.3, 0.55, 33, { closed: true });
  dark(g, [[900, 15], [900, 165]], 1.8, 34); dark(g, [[725, 152], [900, 165], [1050, 140]], 2.2, 35);
  // ---- the tall carton right of the screen
  carve(g, Q("Dtop"), { ang: 0.1, vf: polyVF("Dtop"), per: 5, seed: 41 });
  drip(g, null, { q: Q("Dfront"), dir: "v", vq: V("Dfront"), per: 7, dens: 0.9, w: [1.6, 4.2], len: [0.3, 1], b0: [0, 0.3], dk: [0.55, 0.95], mot: 0.2, seed: 42, bias: (u) => lerp(1.25, 0.25, sstep(0.25, 0.75, u)), spots: 0.03 });
  carve(g, null, { q: Q("Dside"), dir: "v", vq: V("Dside"), per: 6, seed: 43 });
  dark(g, [[855, 170], [978, 185], [1080, 140]], 2, 44); edge(g, [[978, 186], [978, 478]], 1.2, 0.35, 45);
  carve(g, null, { q: Q("Eback"), dir: "v", vq: V("Eback"), per: 5, seed: 46 });
  // ---- the monitor speaker behind his face: dark wooden front with grain, lit left edge, tweeter and woofer
  carve(g, null, { q: Q("Eside"), dir: "v", vq: V("Eside"), per: 4, seed: 51 });
  carve(g, null, { q: Q("Efront"), dir: "v", vq: V("Efront"), per: 5.5, seed: 52, streak: 0.4, wav: 0.35 });
  edge(g, [[1148, 204], [1148, 506]], 2.4, 0.8, 53);
  edge(g, [[1149, 203], [1330, 201]], 1.4, 0.6, 54);
  // (fix pass 2: re-measured at 1.6x: the tweeter centred (1238, 263), radius ~36; the woofer (1245, 393), ~62; both
  // cones darker than drawn before)
  spkDriver(g, 1238, 263, 36, 0.4, 55);
  spkDriver(g, 1245, 393, 62, 0.45, 56);
  // ---- the slotted shelf upright and its bracket, far right
  carve(g, null, { q: Q("SHup"), dir: "v", vq: V("SHup"), per: 4.5, seed: 61, bg: 0.05, wExp: 0.9 });
  for (let i = 0; i < 16; i++) {
    const u = 0.1 + i * 0.058, y = -130 + u * 600, x = lerp(1978, 1928, (y + 130) / 600) + 3;
    fill(g, [[x - 3, y], [x + 3, y], [x + 3, y + 18], [x - 3, y + 18]], "#050505");
  }
  carve(g, null, { q: Q("SHbar"), dir: "h", vq: V("SHbar"), per: 4, seed: 62 });
  // ---- the cartons at the right edge
  carve(g, Q("Htop"), { ang: -0.05, vf: polyVF("Htop"), per: 5, seed: 71 });
  carve(g, null, { q: Q("Hfront"), dir: "v", vq: V("Hfront"), per: 6, seed: 72, bg: 0.3, lum: 0.62, wav: 0.3, streak: 0.4, brk: 0.3 });
  carve(g, null, { q: Q("H2top"), dir: "h", vq: V("H2top"), per: 5, seed: 73 });
  carve(g, null, { q: Q("H2front"), dir: "v", vq: V("H2front"), per: 6, seed: 74, bg: 0.3, lum: 0.62, wav: 0.3, streak: 0.4, brk: 0.3 });
  dark(g, [[2055, 414], [2420, 402]], 2, 75); dark(g, [[2046, 632], [2420, 628]], 2, 76); dark(g, [[2055, 414], [2050, 850]], 2.2, 77);
}
function polyVF(n) { return polyV(F[n], RV[n]); }

// a round driver in a dark cabinet front: dark surround, a cone lit from the lower left with swirl strokes, a dust cap
function spkDriver(g, cx, cy, R, lit, seed) {
  dot(g, cx, cy, R, grey(0.02));
  ring(g, cx, cy, R - 1, 2.2, grey(0.35));
  ring(g, cx, cy, R * 0.9, 1.2, grey(0.18));
  const rc = R * 0.72;
  g.save(); g.beginPath(); g.arc(cx, cy, rc, 0, TAU); g.clip();
  g.fillStyle = lgrad(g, cx + rc * 0.6, cy - rc * 0.7, cx - rc * 0.3, cy + rc * 0.7, [[0, 0.02], [0.5, 0.12 * lit], [1, 0.55 * lit]]); g.fillRect(cx - rc, cy - rc, 2 * rc, 2 * rc);
  const r = rng(seed);
  for (let i = 0; i < 40; i++) { const rr = rc * (0.4 + r() * 0.6), a0 = 0.6 + r() * 2.4, da = 0.3 + r() * 0.9; g.strokeStyle = grey(0.5 + r() * 0.4, 0.18 + r() * 0.25); g.lineWidth = 0.8 + r() * 1.2; g.beginPath(); g.arc(cx, cy, rr, a0, a0 + da); g.stroke(); }
  g.restore();
  ring(g, cx, cy, rc, 1.4, grey(0.06));
  dot(g, cx + R * 0.05, cy - R * 0.02, R * 0.3, grey(0.03));
  fillSoft(g, ELL(cx + R * 0.12, cy - R * 0.14, R * 0.08, R * 0.05), grey(0.7), 1);
}
