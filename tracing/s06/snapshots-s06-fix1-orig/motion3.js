// s06 r3 motion: what moves on the face, from measurements (no pixels):
//   - flow maps (data/flow.js): DIS optical flow from the neutral mean to every moving source frame, sampled on a
//     12 px grid over the brows and the mouth (round 2, trace/flowgrid.py); holds: neutral until 27.04, the smile
//     mean from 28.44. flowMapRel gives the displacement relative to the held smile, for layers measured on it;
//   - the mouth line (data/mouth.js): fitted on every source frame (round 2, trace/mouthline.py), drawn with the
//     calibrated MLINE of trace3/mline_fit.py; the lip comb (data/r3_comb.js, trace3/comb_r3.py) re-attached to it.
// (The smile crease needs no drawing of its own: it is traced in the smile-state face and mouth layers, which the
// shot fades in with the smile.)
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";
import { drawInk } from "./ink.js";
import { drawR3, decodeR3 } from "./face3.js";
import { STEP as FSTEP, BOXES as FBOX, SMILE as FSMILE, FRAMES as FFR } from "./data/flow.js";
import { NEUTRAL as MNEU, SMILE as MSMI, FRAMES as MFR } from "./data/mouth.js";
import { COMB_N, COMB_S, COMB_OPTS, MLINE3 } from "./data/r3_comb.js";

let FIDX = null;   // source frame index -> flow grids
const grid = (t) => {
  if (!FIDX) { FIDX = new Map(); for (const k in FFR) FIDX.set(Math.round(+k * 25), FFR[k]); }
  const n = Math.round(t * 25 + 1e-6);
  return FIDX.get(n) || (n / 25 >= 28.42 ? FSMILE : null);
};
function mapOf(key, at) {
  const [x0, y0, x1, y1] = FBOX[key], nx = Math.floor((x1 - x0) / FSTEP) + 1, ny = Math.floor((y1 - y0) / FSTEP) + 1;
  return ([x, y]) => {
    const u = Math.max(0, Math.min(nx - 1.001, (x - x0) / FSTEP)), v = Math.max(0, Math.min(ny - 1.001, (y - y0) / FSTEP));
    const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
    const d = [0, 1].map((k) => at(i, j, k, nx) * (1 - a) * (1 - b) + at(i + 1, j, k, nx) * a * (1 - b) + at(i, j + 1, k, nx) * (1 - a) * b + at(i + 1, j + 1, k, nx) * a * b);
    // outside the measured box the motion fades out over 24 px
    const out = Math.max(x0 - x, x - x1, y0 - y, y - y1, 0), wgt = Math.max(0, 1 - out / 24);
    return [x + d[0] * wgt, y + d[1] * wgt];
  };
}
// the displacement of frame t from the neutral mean (null while neutral)
export function flowMap(t, key) {
  const G = grid(t);
  if (!G) return null;
  const A = G[key];
  return mapOf(key, (i, j, k, nx) => A[(j * nx + i) * 2 + k] / 5);
}
// the displacement of frame t from the held smile (null once the smile is held)
export function flowMapRel(t, key) {
  const G = grid(t);
  if (G === FSMILE) return null;
  const S = FSMILE[key], A = G ? G[key] : null;
  return mapOf(key, (i, j, k, nx) => ((A ? A[(j * nx + i) * 2 + k] : 0) - S[(j * nx + i) * 2 + k]) / 5);
}
export function mouthAt(t) {
  const f = Math.round(t * 25 + 1e-6) / 25;
  return MFR.find((m) => Math.abs(m.t - f) < 1e-3) || (f < 27.6 ? MNEU : MSMI);
}

// the fitted line: one tone (the sharpened darkest value), width per point (capped), smoothstep end tapers, a paler
// upper edge; each part blurred by MLINE.soft
const MLINE = MLINE3;
function drawMouthLine(g, s) {
  const n = s.length / 5; if (n < 3) return;
  const P = [], w = [];
  let vmin = 1, bm = 0;
  for (let i = 0; i < n; i++) { vmin = Math.min(vmin, s[i * 5 + 3]); bm += s[i * 5 + 4] / n; }
  const vd = Math.max(0, bm - (bm - vmin) * MLINE.sharpen);
  for (let i = 0; i < n; i++) {
    const o = i * 5; P.push([s[o], s[o + 1]]);
    w.push(Math.min(MLINE.cap, s[o + 2] * MLINE.gain * Math.max(0, s[o + 4] - s[o + 3]) / Math.max(0.05, s[o + 4] - vd)));
  }
  const q = sampleCurve(P, 3), S = [0];
  for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  const Lt = S[S.length - 1];
  const env = (i) => { const a = Math.min(1, S[i] / MLINE.taper, (Lt - S[i]) / MLINE.taper); return a <= 0 ? 0 : Math.pow(a * a * (3 - 2 * a), 0.5); };
  const wAt = (i) => { const f = (i / (q.length - 1)) * (n - 1), a = Math.floor(f), b = Math.min(n - 1, a + 1); return (w[a] + (w[b] - w[a]) * (f - a)) * env(i); };
  g.save(); if (MLINE.soft) g.filter = `blur(${MLINE.soft}px)`;
  const up = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; const off = wAt(i) / 2 + 0.7; return [p[0] + (ty / l) * off, p[1] - (tx / l) * off]; });
  const ce = Math.round(MLINE.edgeV * 255);
  taper(g, up, (u) => MLINE.edgeW * env(Math.round(u * (q.length - 1))), `rgb(${ce},${ce},${ce})`);
  const cd = Math.round(vd * 255);
  taper(g, q, (u) => wAt(Math.round(u * (q.length - 1))), `rgb(${cd},${cd},${cd})`);
  g.restore();
}

// the lip comb: strokes stored as (u, d) relative to a line (u = fraction of its length, d = px along its upward
// normal), re-attached to this frame's line
function lineGeom(s) {
  const n = s.length / 5, P = [];
  for (let i = 0; i < n; i++) P.push([s[i * 5], s[i * 5 + 1]]);
  const q = sampleCurve(P, 3), S = [0], U = [];
  for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  for (let i = 0; i < q.length; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; U.push([ty / l, -tx / l]); }
  return { q, S, U, L: S[S.length - 1] };
}
function fromUD(G, u, d) {
  const s = Math.max(0, Math.min(1, u)) * G.L, S = G.S;
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
  const f = S[hi] > S[lo] ? (s - S[lo]) / (S[hi] - S[lo]) : 0, lerp = (a, b) => a + (b - a) * f;
  let nx = lerp(G.U[lo][0], G.U[hi][0]), ny = lerp(G.U[lo][1], G.U[hi][1]); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
  return [lerp(G.q[lo][0], G.q[hi][0]) + nx * d, lerp(G.q[lo][1], G.q[hi][1]) + ny * d];
}
function drawComb(g, line, comb, alpha) {
  if (alpha <= 0.001) return;
  const G = lineGeom(line);
  const set = comb.map((s) => { const o = s.slice(); for (let i = 0; i < s.length; i += 5) { const p = fromUD(G, s[i], s[i + 1]); o[i] = p[0]; o[i + 1] = p[1]; } return o; });
  g.save(); g.globalAlpha = alpha; drawInk(g, set, COMB_OPTS); g.restore();
}

export function drawMouthLayer(g, L, map) { decodeR3(L); drawR3(g, map ? { ...L, clip: L.clip.map(map) } : L, map); }
export function drawMouthTop(g, t, smile = 1) {
  const M = mouthAt(t);
  drawMouthLine(g, M.line);
  drawComb(g, M.line, COMB_N, 1 - smile);
  drawComb(g, M.line, COMB_S, smile);
}
