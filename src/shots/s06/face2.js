// s06 face: skin, the measured wash (tonal masses) and ink strokes (data/face.js), the eye openings as a measured value
// study (data/eyes.js) with the iris streaks, pupils and lash lines drawn at their measured places; the brows and the
// mouth move per frame with the measured flow (data/flow.js) and the per-frame mouth line (data/mouth.js).
import { smoothPath } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng } from "../../lib/rng.js";
import { vline } from "./kit.js";
import { drawInk, drawMasses } from "./ink.js";
import { INK as FACE_INK, MASS as FACE_MASS } from "./data/face.js";
import { FACE, SKIN, EYES, eyeOpen } from "./face.js";
import { INK as BROW_INK, MASS as BROW_MASS } from "./data/brows.js";
import { MASS as EYE_MASS } from "./data/eyes.js";
export const EYE_TRACED = true;

// irises measured on 4x crops of the source (26.8): outer circle (the top hidden under the lid), pupil, and the pale
// radial streaks of the lower half
const IRIS = [{ c: [861, 322], r: 34, p: [861, 330, 11.5] }, { c: [1226, 305], r: 35, p: [1227, 313, 13] }];
export const EYECAL = { streak: 0.62, alpha: 0.55, ring: 0.1, lash: "#0a0a0a", lashW: 0.9 };
function irises(g) {
  IRIS.forEach((I, k) => {
    const r = rng(300 + k), [cx, cy] = I.c, E = EYES[k];
    // everything clipped to the opening (below the lash line, above the waterline)
    g.save(); g.beginPath(); smoothPath(g, [...E.lash.slice(1, -1), ...E.water.slice().reverse()], true); g.clip();
    g.save(); g.beginPath(); g.arc(cx, cy, I.r, 0, 7); g.clip();
    for (let i = 0; i < 70; i++) {
      const a = 0.12 * Math.PI + (i / 70) * 0.76 * Math.PI + (r() - 0.5) * 0.03, r0 = I.r * (0.5 + r() * 0.08), r1 = I.r * (0.82 + r() * 0.12);
      if (r() < 0.25) continue;
      const v = Math.round(255 * (EYECAL.streak + 0.2 * r()));
      taper(g, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], (u) => 1.4 * (1 - 0.7 * u), `rgba(${v},${v},${v},${EYECAL.alpha * (0.6 + 0.4 * r())})`);
    }
    g.restore();
    const [px, py, pr] = I.p;
    g.fillStyle = "#0b0b0b"; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
    g.strokeStyle = `rgba(12,12,12,0.8)`; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, I.r - 0.8, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    g.restore();
  });
}
export const INKCAL = { sharpen: 1, end: 7, endMin: 0.12, soft: 0.6 };
// fix pass: the traced strokes of the hatched areas (short, branching or off-direction skeleton paths, which read as
// crackle) are dropped and replaced by GENERATED hatching along the measured stroke direction (data/hatch.js,
// trace/hatch.py); the soft ground under it is the brighter ground the hatching was sized against
import { HATCH, WASH as HWASH, DROP } from "./data/hatch.js";
import { CONTOUR } from "./data/contour.js";
export const CONTCAL = { end: 10, endMin: 0.05, sharpen: 1.3, gain: 0.85, per: 2 };
export const JAWCAL = { end: 14, endMin: 0.1, sharpen: 1.2, gain: 0.8, wMin: 2.6, per: 2, soft: 0.3 };
export const CREASECAL = { end: 14, endMin: 0.05, sharpen: 1.0, gain: 0.7, per: 2, soft: 0.3 };
// the eye-opening polygons of the value study (trace/cfg/eyes.json)
const EYE_POLYS = [[[752, 322], [790, 319], [850, 316], [905, 315], [935, 322], [948, 334], [930, 348], [900, 364], [850, 368], [800, 364], [765, 352], [750, 338]], [[1135, 328], [1160, 310], [1200, 303], [1260, 301], [1305, 298], [1322, 305], [1320, 335], [1300, 346], [1250, 354], [1200, 354], [1160, 350], [1135, 342]]];
export const LIDCAL = { end: 8, endMin: 0.05, sharpen: 1.3, gain: 0.8, per: 2 };
// the five sweat drops: open U outlines FITTED on the source (trace/contour.py), each with a pale interior
export const DROPCAL = { end: 4, endMin: 0.1, sharpen: 1.45, gain: 0.72, per: 2, interior: 0.975 };
function drawSweat(g) {
  for (let k = 0; k < 5; k++) {
    const S = CONTOUR["drop" + k];
    if (!S || !S.length) continue;
    const s = S[0], P = [];
    for (let i = 0; i < s.length; i += 5) P.push([s[i], s[i + 1]]);
    // interior: the U closed across its top
    g.save(); g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    const c = Math.round(DROPCAL.interior * 255); g.fillStyle = `rgb(${c},${c},${c})`; g.fill(); g.restore();
    drawInk(g, S, DROPCAL);
  }
}
export const dropSet = (name, set) => {
  const D = DROP[name.includes(".") ? name : name + ".INK"];
  if (!D || D.n !== set.length) return set;
  const s = new Set(D.idx);
  return set.filter((_, i) => !s.has(i));
};
export const HATCHCAL = { end: 12, endMin: 0.05, soft: 0.35 };
// the face's paper: measured on the source's clean skin (cheek, nose: 252 graded against the round-2 skin's 255)
export const FACE_PAPER = "rgb(239,239,238)";
// the face is redrawn in this pass: the round-2 base tone veil is left out over it
import { VEIL_OUT } from "./body2.js";
VEIL_OUT.push(FACE);
export function drawFaceT(g) {
  g.save();
  g.fillStyle = FACE_PAPER; g.beginPath(); smoothPath(g, FACE, true); g.fill();
  g.beginPath(); smoothPath(g, FACE, true); g.clip();
  drawMasses(g, HWASH.face || FACE_MASS.wash, { blur: 3 });
  drawInk(g, dropSet("face", FACE_INK), INKCAL);
  for (const k of ["face", "eyeL", "eyeR"]) if (HATCH[k]) drawInk(g, HATCH[k], HATCHCAL);
  // fitted contour lines (trace/contour.py): lid creases, nose wings, the nostril line, the left jaw
  for (const k of ["creaseL", "creaseR"]) if (CONTOUR[k]) drawInk(g, CONTOUR[k], CREASECAL);
  for (const k of ["wingL", "wingR", "nostril"]) if (CONTOUR[k]) drawInk(g, CONTOUR[k], CONTCAL);
  if (CONTOUR.jawL) drawInk(g, CONTOUR.jawL, JAWCAL);
  if (EYE_TRACED) {
    drawMasses(g, EYE_MASS.eyes, { blur: 0.4 });
    irises(g);
    EYES.forEach((E) => vline(g, E.lash, E.lashW.map((w) => w * EYECAL.lashW), EYECAL.lash));
  } else EYES.forEach((E, i) => eyeOpen(g, E, 40 + i * 20));
  // the lower lid lines over the eye openings
  // (outside the measured eye openings only: inside them the value study already carries the lid lines)
  g.save(); g.beginPath(); g.rect(0, 0, 2206, 946);
  for (const P of EYE_POLYS) { P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  g.clip("evenodd");
  for (const k of ["lidAL", "lidBL", "lidAR", "lidBR"]) if (CONTOUR[k]) drawInk(g, CONTOUR[k], LIDCAL);
  g.restore();
  drawSweat(g);
  g.restore();
}

// The measured face motion (data/flow.js): the neutral drawing's points move with the flow of that source frame
// (bilinear on a 12 px grid); holds: neutral until 27.04, the smile mean from 28.44.
import { STEP as FSTEP, BOXES as FBOX, SMILE as FSMILE, FRAMES as FFR } from "./data/flow.js";
import { MASS as MWASH } from "./data/mouthwash.js";
let FIDX = null;   // frame index -> flow grids (built once; keys are the source frame times)
export function flowMap(t, key) {
  const f = Math.round(t * 25 + 1e-6) / 25;
  if (!FIDX) { FIDX = new Map(); for (const k in FFR) FIDX.set(Math.round(+k * 25), FFR[k]); }
  const G = FIDX.get(Math.round(f * 25)) || (f >= 28.42 ? FSMILE : null);
  if (!G) return null;
  const A = G[key], [x0, y0, x1, y1] = FBOX[key], nx = Math.floor((x1 - x0) / FSTEP) + 1, ny = Math.floor((y1 - y0) / FSTEP) + 1;
  const at = (i, j, k) => A[(j * nx + i) * 2 + k] / 5;
  return ([x, y]) => {
    const u = Math.max(0, Math.min(nx - 1.001, (x - x0) / FSTEP)), v = Math.max(0, Math.min(ny - 1.001, (y - y0) / FSTEP));
    const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
    const d = [0, 1].map((k) => at(i, j, k) * (1 - a) * (1 - b) + at(i + 1, j, k) * a * (1 - b) + at(i, j + 1, k) * (1 - a) * b + at(i + 1, j + 1, k) * a * b);
    // outside the measured box the motion fades out over 24 px
    const out = Math.max(x0 - x, x - x1, y0 - y, y - y1, 0), wgt = Math.max(0, 1 - out / 24);
    return [x + d[0] * wgt, y + d[1] * wgt];
  };
}
export function drawBrowsF(g, t) {
  const map = flowMap(t, "brows");
  drawMasses(g, BROW_MASS.body, { blur: 0.5, map });
  drawInk(g, BROW_INK, { end: 5, endMin: 0.15, map });
}
// The mouth (data/mouth.js): the line fitted on every source frame, and the patch's fine strokes (lower-lip hatching,
// upper-lip marks, stubble) moved per frame by the measured flow. Holds: neutral 26.84-27.08, smile from 28.40.
import { NEUTRAL as MNEU, SMILE as MSMI, FRAMES as MFR, INK as MINK, PATCH as MPATCH_ } from "./data/mouth.js";
export function mouthAt(t) {
  const f = Math.round(t * 25 + 1e-6) / 25;
  return MFR.find((m) => Math.abs(m.t - f) < 1e-3) || (f < 27.6 ? MNEU : MSMI);
}
export const MOUTHCAL = { end: 8, endMin: 0.1, soft: 0.8, sharpen: 1.35 };
import { FLECKS } from "./data/flecks.js";
export const FLECKCAL = { dv: -0.04, gain: 1 };
// the stubble: each measured fleck as a short tapered dash, moved with the flow of the frame
function drawFlecks(g, map) {
  for (let i = 0; i < FLECKS.length; i += 7) {
    let x = FLECKS[i], y = FLECKS[i + 1];
    if (map) [x, y] = map([x, y]);
    const L = FLECKS[i + 2] * FLECKCAL.gain, w = FLECKS[i + 3], a = FLECKS[i + 4];
    const v = Math.max(0, Math.min(1, FLECKS[i + 6] - (FLECKS[i + 6] - FLECKS[i + 5]) * 1.0 + FLECKCAL.dv));
    const c = Math.round(v * 255), dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    taper(g, [[x - dx, y - dy], [x, y], [x + dx, y + dy]], (u) => w * (0.25 + 0.75 * Math.sin(Math.PI * u)), `rgb(${c},${c},${c})`);
  }
}
// fix pass: the lower lip's traced rows are replaced by GENERATED rows (data/hatch.js "lip", along the measured lip
// direction, sized to the measured darkness; the mouth wash is left out under them); the stubble flecks by GENERATED
// ticks (data/ticks.js: density and direction measured, positions seeded); the mouth line is redrawn with a capped
// width, 18 px end tapers and a paler upper edge; the right smile crease (fitted on the smile mean) fades in with the
// smile. All of it moves with the measured flow of the frame.
const LIP_LENS = [[995, 716], [1030, 712], [1070, 714], [1130, 710], [1165, 716], [1150, 735], [1120, 748], [1060, 754], [1010, 748], [990, 730]];
import { TICKS } from "./data/ticks.js";
export const TICKCAL = { gain: 1, dv: 0 };
function drawTicks(g, map) {
  for (let i = 0; i < TICKS.length; i += 6) {
    let x = TICKS[i], y = TICKS[i + 1];
    if (map) [x, y] = map([x, y]);
    const L = TICKS[i + 2] * TICKCAL.gain, w = TICKS[i + 3], a = TICKS[i + 4], v = Math.max(0, Math.min(1, TICKS[i + 5] + TICKCAL.dv));
    const c = Math.round(v * 255), dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    taper(g, [[x - dx, y - dy], [x, y], [x + dx, y + dy]], (u) => w * (0.15 + 0.85 * Math.sin(Math.PI * Math.min(1, u * 1.15))), `rgb(${c},${c},${c})`);
  }
}
export const MLINE = { cap: 5, taper: 8, sharpen: 1.35, gain: 0.85, edgeV: 0.5, edgeW: 1.0, soft: 0.45 };
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
  // the paler upper edge (the upper lip's lower rim), just above the line
  const up = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; const off = wAt(i) / 2 + 0.7; return [p[0] + (ty / l) * off, p[1] - (tx / l) * off]; });
  const ce = Math.round(MLINE.edgeV * 255);
  taper(g, up, (u) => MLINE.edgeW * env(Math.round(u * (q.length - 1))), `rgb(${ce},${ce},${ce})`);
  const cd = Math.round(vd * 255);
  taper(g, q, (u) => wAt(Math.round(u * (q.length - 1))), `rgb(${cd},${cd},${cd})`);
  g.restore();
}
import { sampleCurve } from "../../lib/paths.js";
export const CRCAL = { end: 12, endMin: 0.05, sharpen: 1.6, gain: 0.45, per: 2, soft: 0.3, alpha: 0.8 };
export function drawMouthT(g, t, smile = 1) {
  const M = mouthAt(t), map = flowMap(t, "mouth");
  g.save(); g.beginPath(); MPATCH_.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  (map ? LIP_LENS.map(map) : LIP_LENS).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.clip("evenodd");
  drawMasses(g, MWASH.wash, { blur: 4, map });
  g.restore();
  drawInk(g, dropSet("mouth.INK", MINK), { end: 4, endMin: 0.2, map, soft: 0.5 });
  if (HATCH.lip) drawInk(g, HATCH.lip, { ...HATCHCAL, map });
  drawTicks(g, map);
  // (the crease is two or three fine parallel lines in the source: drawn as two, 1.7 px either side of the fit)
  if (smile > 0.02 && CONTOUR.smileCrR) { g.save(); g.globalAlpha = Math.min(1, smile) * CRCAL.alpha; for (const dx of [-1.7, 1.7]) drawInk(g, CONTOUR.smileCrR, { ...CRCAL, map: ([x, y]) => [x + dx + 3, y] }); g.restore(); }
  drawMouthLine(g, M.line);
}
