// fit.mjs — fit the s26 owl rig to the source owl silhouette, frame by frame (pattern search on IoU at 1/2 res).
// usage: node fit.mjs poses.json F0 F1 [--init F] [--spec name] [--iters N]
//   poses.json: { "<F>": P, ... } (read + updated in place). Masks: m/<F>.bin (1103x473 uint8). Landmarks: lm.json
import { rigSilhouette } from "../../../src/shots/s26/rig.js";
import fs from "fs";

const MW = 1103, MH = 473, K = 0.5;
const args = process.argv.slice(2);
const file = args[0], F0 = +args[1], F1 = +args[2];
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const LOOK = opt("--look", "ink");
const LMW = +opt("--lmw", 0.004), WB = +opt("--wb", 0.05), WU = +opt("--wu", 0.35);
const SILOPT = { cups: opt("--cups", "1") === "1", feet: opt("--feet", "1") === "1" };
const iters = +opt("--iters", 40), specName = opt("--spec", "full"), initF = opt("--init", null);
const poses = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
const LM = fs.existsSync("lm.json") ? JSON.parse(fs.readFileSync("lm.json", "utf8")) : {};

function raster(polys) {
  const buf = new Uint8Array(MW * MH);
  for (const P of polys) {
    const n = P.length; if (n < 3) continue;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of P) { const y = p[1] * K; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    y0 = Math.max(0, Math.ceil(y0 - 0.5)); y1 = Math.min(MH - 1, Math.floor(y1 - 0.5));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], ay = a[1] * K, by = b[1] * K;
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(a[0] * K + (yc - ay) / (by - ay) * (b[0] * K - a[0] * K));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.ceil(xs[i] - 0.5)), xb = Math.min(MW - 1, Math.floor(xs[i + 1] - 0.5));
        for (let x = xa; x <= xb; x++) buf[y * MW + x] = 1;
      }
    }
  }
  return buf;
}
function iou(buf, M) {
  let I = 0, U = 0;
  for (let i = 0; i < buf.length; i++) { const a = buf[i], b = M[i] > 127; if (a && b) I++; if (a || b) U++; }
  return U ? I / U : 0;
}
// parameter paths
const get = (P, p) => p.split(".").reduce((o, k) => o?.[k], P);
const set = (P, p, v) => { const ks = p.split("."); let o = P; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
const BOUNDS = (opt("--look","ink") === "colour") ? [["head.yaw", -0.8, 0.8], ["wings.0.sec", 20, 300], ["wings.1.sec", 20, 300]] : [["body.rx", 60, 95], ["body.ry", 80, 150], ["head.yaw", -0.6, 0.6], ["wings.0.sec", 50, 260], ["wings.1.sec", 50, 260]];
const HEADONLY = opt("--spec", "full") === "head";
const SPECS = {
  nohead: null,
  fold: [["head.x", 3], ["head.y", 3], ["head.r", 3], ["head.rot", 0.04], ["head.yaw", 0.06], ["body.x", 4], ["body.y", 4], ["body.rx", 4], ["body.ry", 4], ["body.rot", 0.06],
    ...[0, 1].flatMap((k) => [[`wings.${k}.S.0`, 4], [`wings.${k}.S.1`, 4], [`wings.${k}.T.0`, 4], [`wings.${k}.T.1`, 4], [`wings.${k}.w`, 3]]),
    ["feet.0.x", 4], ["feet.0.y", 4], ["feet.1.x", 4], ["feet.1.y", 4], ["feet.0.size", 3], ["feet.1.size", 3]],
  head: [["head.x", 3], ["head.y", 3], ["head.r", 3], ["head.rot", 0.04]],
  feet: [["feet.0.x", 6], ["feet.0.y", 6], ["feet.1.x", 6], ["feet.1.y", 6], ["feet.0.ang", 0.1], ["feet.1.ang", 0.1]],
  full: [["head.x", 3], ["head.y", 3], ["head.r", 3], ["head.rot", 0.04], ["head.yaw", 0.06],
    ["body.x", 5], ["body.y", 5], ["body.rx", 5], ["body.ry", 5], ["body.rot", 0.06],
    ...[0, 1].flatMap((k) => [[`wings.${k}.S.0`, 5], [`wings.${k}.S.1`, 5], [`wings.${k}.Wr.0`, 8], [`wings.${k}.Wr.1`, 8], [`wings.${k}.T.0`, 8], [`wings.${k}.T.1`, 8], [`wings.${k}.trail`, 0.08], [`wings.${k}.sec`, 6]]),
    ["feet.0.x", 5], ["feet.0.y", 5], ["feet.1.x", 5], ["feet.1.y", 5]],
};
function loss(P, M, F) {
  const I = HEADONLY ? 1 : iou(raster(rigSilhouette(P, SILOPT)), M);
  let L = 1 - I;
  for (const [p, lo, hi] of BOUNDS) { const v = get(P, p); if (v < lo) L += (lo - v) * 0.01; if (v > hi) L += (v - hi) * 0.01; }
  // wing bones: the wrist sits ~35 % of the way from the shoulder to the tip, near the S-T line
  for (const w of P.wings || []) {
    if (w.type === "folded") continue;
    const st = Math.hypot(w.T[0] - w.S[0], w.T[1] - w.S[1]), sw = Math.hypot(w.Wr[0] - w.S[0], w.Wr[1] - w.S[1]);
    const u = ((w.Wr[0] - w.S[0]) * (w.T[0] - w.S[0]) + (w.Wr[1] - w.S[1]) * (w.T[1] - w.S[1])) / (st * st);
    const off = Math.abs((w.Wr[0] - w.S[0]) * (w.T[1] - w.S[1]) - (w.Wr[1] - w.S[1]) * (w.T[0] - w.S[0])) / st;
    L += WB * (Math.abs(u - WU) * 1.0 + Math.max(0, off / st - 0.12));
  }
  if (true) {
    // the body hangs under the head: its top near the chin, its centre within half a head of the head's x
    const H = P.head, B = P.body;
    const top = B.y - B.ry * 0.9, chin = H.y + H.r * 0.55;
    L += 0.0015 * Math.max(0, Math.abs(top - chin) - H.r * 0.25) + 0.0015 * Math.max(0, Math.abs(B.x - H.x) - H.r * 0.45);
    L += 0.05 * Math.max(0, B.rx / B.ry - 1.15) + 0.05 * Math.max(0, B.ry / B.rx - 1.5) + 0.05 * Math.max(0, B.rx / H.r - 1.05) + 0.05 * Math.max(0, 0.6 - B.rx / H.r);
  }
  if (P.feet) for (const f of P.feet) {
    const B = P.body, dy = (f.y - B.y) / B.ry, dx = Math.abs(f.x - B.x) / B.rx;
    L += 0.02 * (Math.max(0, 0.6 - dy) + Math.max(0, dy - 1.6) + Math.max(0, dx - 0.9));
  }
  const lm = LM[F];
  if (lm?.eyes) {
    // eye landmarks (frame px): the rig's eye centres should sit on them
    const { headGeom } = RIG; const H = headGeom({ ...P.head, lookL: P.eyes?.lookL ?? P.eyes?.look, lookR: P.eyes?.lookR ?? P.eyes?.look });
    let e = 0; for (let k = 0; k < 2; k++) if (lm.eyes[k]) e += Math.hypot(H.irises[k][0] - lm.eyes[k][0], H.irises[k][1] - lm.eyes[k][1]);
    L += LMW * e;
  }
  return { L, I };
}
import * as RIG from "../../../src/shots/s26/rig.js";

function fitFrame(P, F, spec) {
  const M = new Uint8Array(fs.readFileSync(`m/${F}.bin`));
  let best = loss(P, M, F);
  const steps = spec.map((s) => s[1]);
  for (let it = 0; it < iters; it++) {
    let improved = false;
    for (let j = 0; j < spec.length; j++) {
      const p = spec[j][0]; const v0 = get(P, p); if (v0 === undefined) continue;
      for (const d of [steps[j], -steps[j]]) {
        set(P, p, v0 + d);
        const r = loss(P, M, F);
        if (r.L < best.L - 1e-6) { best = r; improved = true; break; }
        set(P, p, v0);
      }
    }
    if (!improved) { for (let j = 0; j < steps.length; j++) steps[j] *= 0.5; if (steps[0] < 0.3) break; }
  }
  return best;
}

const spec = specName === "nohead" ? SPECS.full.filter((s) => !s[0].startsWith("head.")) : specName === "foldnohead" ? SPECS.fold.filter((s) => !s[0].startsWith("head.") || s[0] === "head.yaw") : SPECS[specName];
let prev = initF ? JSON.parse(JSON.stringify(poses[initF])) : null;
const dir = F1 >= F0 ? 1 : -1;
for (let F = F0; dir > 0 ? F <= F1 : F >= F1; F += dir) {
  const P = poses[F] ? JSON.parse(JSON.stringify(poses[F])) : JSON.parse(JSON.stringify(prev));
  const r = fitFrame(P, F, spec);
  poses[F] = P; prev = P;
  console.log(`F${F} IoU=${r.I.toFixed(3)} L=${r.L.toFixed(4)}`);
  fs.writeFileSync(file, JSON.stringify(poses));
}
