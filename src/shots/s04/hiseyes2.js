// s04 (fix1): his eyes, second version. The eye model is b1's (s04/hiseyes.js EYE2: measured on the 20.56 frame at
// 4-8x), drawn in the eye's own coordinates and placed per key frame by the measured eye track (s04/eyes2.js):
//   - the whole swing: to 22.08 for the near eye (R), to 21.88 for the far eye (L, which then goes behind his face)
//     -- b1 faded the authored eyes out at 21.52-21.60 and the traced eyes broke into dashed rings after that;
//   - the iris follows the measured pupil in eye coordinates (his gaze moves from the owl to the lens and on to the
//     laptop) and narrows with the measured iris half-width as the eyeball turns away;
//   - it is drawn UNDER the traced ink (paintKey's `under` hook): the traced lines inside the eye are dropped
//     (`eyeDrop`), and the hair strands that cross his eyes stay on top, as in the source.
// Iris (review: 'no dark limbal ring or striations'): a radial value from ~180 to ~95, fine radial striations, darker
// to the lower left, a dark limbal ring (paint ~40), the window's reflection as the source draws it (measured on the
// eye-local views: the upper-left quadrant cut away, soft-edged and round-cornered, not b1's hard block reaching the
// middle; from ~21.4 a second, smaller block at the right rim), and a round pupil. Lids thinner than b1's (upper lid at most ~7.5 px, the review's 6-8).
import { hash } from "../../lib/rng.js";
import { EYE2 } from "./hiseyes.js";

const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
function taperStroke(g, P, fill, k = 1) {
  const pts = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < 8; s++) {
      const t = s / 8, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), (p1[2] + (p2[2] - p1[2]) * t) * k]);
    }
  }
  const z = P[P.length - 1]; pts.push([z[0], z[1], z[2] * k]);
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const e = Math.min(1, i / 3, (n - 1 - i) / 3), w = pts[i][2] * (0.3 + 0.7 * e) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// fix2 (review: the lower lid 'a thick bright white band under the iris'; measured on 20.56 at x 1215/1240: the eyeball
// runs light down to the lower lid's dark line, no dark rim line above a white band): the waterline grey and the
// eyeball's lower rim a faint 1.2 px line
const WATER_V = 195, RIM_V = 150;
const LID_K = 0.75;   // upper lid width scale (b1's widths 3.9-11.7 px -> 2.9-8.8; the source's lash line is 6-8 px, measured on 21.88 and 22.12)
const BLOCK = { L: { x1: -0.1, y1: -0.13 }, R: { x1: -0.55, y1: 0.16 } };   // the window reflection's block (see iris)
// fix2 (review: 'a flat, hard-edged white rectangle ... reads as a pie chart'): measured on the 20.56 frame at 2 px steps,
// the source's reflection is NOT white: the iris's left part there is a light grey (graded ~205-230, the sclera beside it
// ~245) through which the striations still show, and its edge is soft. So the block is kept where it is measured (the
// source does draw it; so is the second, smaller one at the right rim from ~21.5, visible in the source 21.72-22.12)
// but painted light grey, part-transparent and feathered.
const NOTCH_V = 236, NOTCH_A = 0.9;
// the iris, centred (0, 0), half-width rx, half-height ry, in eye px
function iris(g, rx, ry, seed, nub, refl = 1, blk = null) {
  const disc = () => { g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); };
  g.save();
  disc(); g.clip();
  g.save(); g.scale(rx / ry, 1);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, ry);
  rg.addColorStop(0, grey(178)); rg.addColorStop(0.35, grey(170)); rg.addColorStop(0.62, grey(142));
  rg.addColorStop(0.82, grey(108)); rg.addColorStop(0.93, grey(82)); rg.addColorStop(1, grey(52));
  g.fillStyle = rg; g.fillRect(-ry - 2, -ry - 2, 2 * ry + 4, 2 * ry + 4);
  g.restore();
  // darker to the lower left, shaded under the lid, a little lighter to the right (measured on 20.56)
  const dg = g.createLinearGradient(-rx * 0.8, ry * 0.7, rx * 0.35, -ry * 0.1);
  dg.addColorStop(0, "rgba(0,0,0,0.42)"); dg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = dg; disc(); g.fill();
  const lg = g.createLinearGradient(0, -ry, 0, ry * 0.1);
  lg.addColorStop(0, "rgba(0,0,0,0.28)"); lg.addColorStop(0.35, "rgba(0,0,0,0.06)"); lg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lg; disc(); g.fill();
  // striations: fine radial lines, dark and light, from the collarette out to the rim
  for (let q = 0; q < 64; q++) {
    const h = (k) => hash(q, seed, k);
    const an = (q / 64) * Math.PI * 2 + (h(1) - 0.5) * 0.08, r0 = 0.3 + 0.12 * h(2), r1 = 0.78 + 0.16 * h(3);
    const dark = q % 2 === 0 || h(4) < 0.3;
    g.strokeStyle = dark ? grey(62 + 40 * h(5)) : grey(205); g.globalAlpha = dark ? 0.62 : 0.22; g.lineWidth = dark ? 0.8 + 0.7 * h(6) : 0.8;
    g.beginPath(); g.moveTo(Math.cos(an) * rx * r0, Math.sin(an) * ry * r0); g.lineTo(Math.cos(an) * rx * r1, Math.sin(an) * ry * r1); g.stroke();
  }
  g.globalAlpha = 1;
  // the limbal ring
  g.lineWidth = 3.4; g.strokeStyle = grey(36); g.beginPath(); g.ellipse(0, 0, Math.max(0.5, rx - 1.5), Math.max(0.5, ry - 1.5), 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = grey(75); g.globalAlpha = 0.6; g.beginPath(); g.ellipse(0, 0, rx - 3.4, ry - 3.4, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  // the window's reflection: a soft-edged block cut out of the iris's upper left
  // (measured on the eye-local views: on 20.56 the left block runs from under the lid down to y1 and right to x1 --
  // L: x1 -0.1 rx, y1 -0.13 ry (it reaches the pupil); R: x1 -0.55 rx, y1 +0.16 ry; its right edge bows out a little.
  // As the eye turns (nub 0..1, 21.4-21.8) it becomes a block at the left rim from -0.25 to +0.35 ry, x1 -0.55 rx, and
  // a matching block appears at the right rim)
  const R0 = blk || { x1: -0.3, y1: 0 };
  const bx1 = (R0.x1 + (-0.55 - R0.x1) * nub) * rx, by0 = (-1.3 + (-0.25 + 1.3) * nub) * ry, by1 = (R0.y1 + (0.35 - R0.y1) * nub) * ry;
  g.filter = "blur(1.6px)"; g.fillStyle = grey(NOTCH_V); g.globalAlpha = refl * NOTCH_A;
  g.beginPath(); g.moveTo(-1.3 * rx, by0); g.lineTo(bx1, by0);
  g.quadraticCurveTo(bx1 + 0.12 * rx, (by0 + by1) / 2, bx1 - 0.02 * rx, by1 - 0.08 * ry);
  g.quadraticCurveTo(bx1 - 0.05 * rx, by1, bx1 - 0.2 * rx, by1); g.lineTo(-1.3 * rx, by1); g.closePath();
  g.fill(); g.globalAlpha = 1;
  if (nub > 0) { g.globalAlpha = nub * refl * NOTCH_A * 0.85; g.beginPath(); g.roundRect(0.68 * rx, -0.24 * ry, 0.6 * rx, 0.36 * ry, [0.14 * rx, 0, 0, 0.14 * rx]); g.fill(); g.globalAlpha = 1; }
  g.filter = "none";
  g.restore();
}
// The near eye in profile (22.12-22.44): its shape measured on the 22.32 frame at 4x (frame px): the opening from the
// front corner along the upper lid to the back corner and back along the lower lid; the iris seen edge-on (a narrow
// ellipse at the front, centre, half-axes, angle); the upper lid (thick) and lower lid lines [x, y, width].
const PROFILE_R = {
  t: "22.32",
  top: [[1229, 288], [1236, 288], [1245, 290], [1255, 293], [1265, 296], [1275, 299], [1285, 303], [1295, 307], [1303, 312]],
  bot: [[1303, 312], [1295, 316], [1285, 320], [1275, 323], [1265, 326], [1255, 328], [1246, 328], [1239, 325], [1235, 318], [1232, 306], [1229, 288]],
  upper: [[1220, 284, 3], [1228, 283, 6], [1240, 284, 8], [1255, 287, 8], [1270, 292, 7], [1285, 298, 6], [1298, 305, 4], [1308, 312, 2]],
  lower: [[1233, 322, 2], [1242, 329, 3], [1255, 331, 3], [1270, 329, 3], [1285, 324, 2.5], [1300, 317, 1.5]],
  iris: [1238, 305, 6.5, 17, -10], pupil: [1240, 306, 1.2, 3.5],
};
// polyline resampled to n points by arc length (a third coordinate, the width, is carried along)
function resample(P, n) {
  const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = S[S.length - 1], out = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1); while (j < P.length - 2 && S[j + 1] < s) j++;
    const u = Math.max(0, Math.min(1, (s - S[j]) / Math.max(1e-6, S[j + 1] - S[j])));
    out.push(P[j].map((v, q) => v + (P[j + 1][q] - v) * u));
  }
  return out;
}
const lerpP = (A, B, w) => A.map((p, i) => p.map((v, q) => v + ((B[i][q] ?? v) - v) * w));
// the eye's shape in eye coordinates: the frontal model with the measured iris/pupil, morphed (weight w) to the
// measured profile shape (taken from 22.32's frame into eye coordinates by that frame's track)
function shapeOf(k, st, prof, w) {
  const E = EYE2[k], I = E.iris, r = I.r, rx = Math.min(r, st.rx ?? r);
  const [ipx, ipy] = I.pupil, [icx, icy] = I.c;
  const iMax = E.open.reduce((m, p, i) => (p[0] > E.open[m][0] ? i : m), 0);
  const F = {
    top: E.open.slice(0, iMax + 1), bot: [...E.open.slice(iMax), E.open[0]], upper: E.upper, lower: E.lower,
    ic: [st.cp[0] + (icx - ipx) * (rx / r), st.cp[1] + (icy - ipy)], iu: [rx, 0], iv: [0, r],
    pc: st.cp, pu: [6.3 * (rx / r), 0], pv: [0, 6.55],
  };
  if (!prof || w <= 0) return { ...F, corner: E.corner, refl: 1 };
  const N = 22, T = (P) => resample(P, N);
  const S = { top: T(F.top), bot: T(F.bot), upper: resample(F.upper, 14), lower: resample(F.lower, 12) };
  const P = { top: T(prof.top), bot: T(prof.bot), upper: resample(prof.upper, 14), lower: resample(prof.lower, 12) };
  const out = { top: lerpP(S.top, P.top, w), bot: lerpP(S.bot, P.bot, w), upper: lerpP(S.upper, P.upper, w), lower: lerpP(S.lower, P.lower, w) };
  const L2 = (a, b) => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  return { ...out, ic: L2(F.ic, prof.ic), iu: L2(F.iu, prof.iu), iv: L2(F.iv, prof.iv), pc: L2(F.pc, prof.pc), pu: L2(F.pu, prof.pu), pv: L2(F.pv, prof.pv),
    corner: w < 0.5 ? E.corner : null, refl: 1 - w };
}
// the profile shape in eye coordinates, given 22.32's track (eye -> frame affine)
function profileEye(A) {
  const [a, b, tx, c, d, ty] = A, det = a * d - b * c;
  const inv = ([x, y, ...rest]) => { const X = x - tx, Y = y - ty; return [(d * X - b * Y) / det, (-c * X + a * Y) / det, ...rest]; };
  const lin = ([x, y]) => [(d * x - b * y) / det, (-c * x + a * y) / det];
  const P = PROFILE_R, [ix, iy, irx, iry, ia] = P.iris, th = (ia * Math.PI) / 180, [qx, qy, qrx, qry] = P.pupil;
  const ci = [irx * Math.cos(th), irx * Math.sin(th)], cj = [-iry * Math.sin(th), iry * Math.cos(th)];
  const lw = (Q) => Q.map((q) => { const p = inv(q); return [p[0], p[1], q[2] / Math.sqrt(Math.abs(det))]; });
  return { top: P.top.map(inv), bot: P.bot.map(inv), upper: lw(P.upper), lower: lw(P.lower),
    ic: inv([ix, iy]), iu: lin(ci), iv: lin(cj), pc: inv([qx, qy]), pu: lin([qrx, 0]), pv: lin([0, qry]) };
}
// paint one eye (k: "L" | "R") in key canvas coords. st = { A: [a, b, tx, c, d, ty] eye -> frame, cp: pupil (eye
// coords), rx: iris half-width (eye coords), nub: 0..1, prof: profile shape (eye coords) | null, w: morph weight }
function paintEye(g, M, k, st, seed, ox = 0, oy = 0) {
  const [a, b, tx, c, d, ty] = st.A;
  const Sh = shapeOf(k, st, st.prof, st.w || 0);
  g.save();
  g.setTransform(a, c, b, d, tx + M + 0.5 - ox, ty + M + 0.5 - oy);
  const open = [...Sh.top, ...Sh.bot.slice(1, -1)];
  const openPath = () => { g.beginPath(); open.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.save(); openPath(); g.clip();
  const bot = Math.max(...open.map((p) => p[1])), tp = Math.min(...open.map((p) => p[1]));
  if (st.scl) {
    // the eyeball's tone is the key's own measured value study there, softened (the source shades the white of the eye
    // towards the lids and the far corner: paint ~245 on 20.56, a mean of ~180 over its right half by 21.80)
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(st.scl, 0, 0); g.restore();
    const lift = g.createLinearGradient(0, tp, 0, bot); lift.addColorStop(0, "rgba(255,255,255,0.0)"); lift.addColorStop(0.5, "rgba(255,255,255,0.12)"); lift.addColorStop(1, "rgba(255,255,255,0.0)");
    openPath(); g.fillStyle = lift; g.fill();
  } else {
    const vg = g.createLinearGradient(0, tp, 0, bot); vg.addColorStop(0, grey(244)); vg.addColorStop(0.6, grey(246)); vg.addColorStop(1, grey(232));
    openPath(); g.fillStyle = vg; g.fill();
  }
  // the upper lid's soft shadow on the eyeball
  const sg = g.createLinearGradient(0, tp, 0, tp + 16); sg.addColorStop(0, "rgba(0,0,0,0.2)"); sg.addColorStop(1, "rgba(0,0,0,0)");
  openPath(); g.fillStyle = sg; g.fill();
  // iris: drawn in its own axes (iu, iv)
  { const [ux, uy] = Sh.iu, [vx, vy] = Sh.iv, ru = Math.hypot(ux, uy), rv = Math.hypot(vx, vy);
    g.save(); g.transform(ux / ru, uy / ru, vx / rv, vy / rv, Sh.ic[0], Sh.ic[1]); iris(g, ru, rv, seed, st.nub ?? 0, Sh.refl, BLOCK[k]); g.restore(); }
  { const [ux, uy] = Sh.pu, [vx, vy] = Sh.pv, ru = Math.hypot(ux, uy), rv = Math.hypot(vx, vy);
    g.save(); g.transform(ux / ru, uy / ru, vx / rv, vy / rv, Sh.pc[0], Sh.pc[1]);
    g.fillStyle = grey(12); g.beginPath(); g.ellipse(0, 0, Math.max(0.3, ru), Math.max(0.3, rv), 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
  // waterline, the eyeball's lower rim, the inner corner, then the lids
  { const lo = Sh.lower, edge = Sh.bot.slice(0, -1);
    g.beginPath(); lo.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); edge.forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
    g.fillStyle = grey(WATER_V); g.fill();
    taperStroke(g, edge.map(([x, y]) => [x, y, 1.2]), grey(RIM_V)); }
  if (Sh.corner) { g.filter = "blur(1.5px)"; g.beginPath(); Sh.corner.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = grey(110); g.fill(); g.filter = "none"; }
  taperStroke(g, Sh.upper, grey(18), LID_K);
  taperStroke(g, Sh.lower, grey(44));
  g.restore();
}
// the eyes present on a key: which, and their placement (null when none)
export function eyesAt(EYES2, t) {
  const e = EYES2[t.toFixed(2)];
  if (!e) return null;
  return e;
}
// draw both eyes (those present) into a key canvas (key canvas coords; M = margin)
// Each eye is drawn on a scratch canvas over its bounding box and laid on the key only where the key's value study
// there is lit (its blurred value > ~60): as the head turns, the far eye goes behind the face's edge (21.76-21.88) and
// must not be drawn over the dark room.
let SCR = null;
let PROF = null;
export function paintHisEyes2(g, M, e, t, EYES2) {
  const n0 = Math.max(0, Math.min(1, (t - 21.4) / 0.4)), nub = n0 * n0 * (3 - 2 * n0);
  if (!PROF && EYES2 && EYES2[PROFILE_R.t]) PROF = profileEye(EYES2[PROFILE_R.t].R.A);
  // the near eye's morph to its profile shape: 0 at 22.16, 1 from 22.36 (smooth; on the eye-local views the eye
  // still reads frontal, only narrower, at 22.20)
  const u = Math.max(0, Math.min(1, (t - 22.16) / 0.2)), wR = u * u * (3 - 2 * u);
  let seed = 11;
  for (const k of ["L", "R"]) {
    if (!e[k]) { seed += 7; continue; }
    const poly = eyeDropPolys({ [k]: e[k] }, 26, 30)[0];
    const x0 = Math.floor(Math.min(...poly.map((p) => p[0]))) + M, x1 = Math.ceil(Math.max(...poly.map((p) => p[0]))) + M;
    const y0 = Math.floor(Math.min(...poly.map((p) => p[1]))) + M, y1 = Math.ceil(Math.max(...poly.map((p) => p[1]))) + M;
    const w = x1 - x0, h = y1 - y0;
    if (w < 4 || h < 4) { seed += 7; continue; }
    if (!SCR) { SCR = { a: document.createElement("canvas"), b: document.createElement("canvas") }; }
    const { a, b } = SCR;
    // (fix2: the scratch canvases are set to exactly this eye's box each time -- that also resets their state -- so a
    // key's pixels never depend on which keys were drawn before it)
    a.width = b.width = w; a.height = b.height = h;
    const ag = a.getContext("2d"), bg = b.getContext("2d", { willReadFrequently: true });
    if (!SCR.s) SCR.s = document.createElement("canvas");
    const sc = SCR.s; sc.width = w; sc.height = h;
    const scg = sc.getContext("2d"); scg.setTransform(1, 0, 0, 1, 0, 0); scg.clearRect(0, 0, sc.width, sc.height);
    scg.filter = "blur(3px)"; scg.drawImage(g.canvas, x0, y0, w, h, 0, 0, w, h); scg.filter = "none";
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, a.width, a.height);
    paintEye(ag, M, k, { ...e[k], nub, prof: k === "R" ? PROF : null, w: k === "R" ? wR : 0, scl: sc }, seed, x0, y0);
    ag.setTransform(1, 0, 0, 1, 0, 0);
    // (fix2) on the glide keys the eye moves with the camera's pan (e[k].v, px per frame): smeared along it with the
    // shot's shutter, as the source frame is (a 16-tap box by repeated halving, centred)
    const vv = e[k].v, Ls = vv ? Math.hypot(vv[0], vv[1]) * 0.35 : 0;
    if (Ls > 1.5) {
      if (!SCR.m) SCR.m = document.createElement("canvas");
      const mc = SCR.m; mc.width = w; mc.height = h;
      const mg = mc.getContext("2d"), ux = vv[0] / Math.hypot(vv[0], vv[1]), uy = vv[1] / Math.hypot(vv[0], vv[1]);
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalAlpha = 1; mg.clearRect(0, 0, mc.width, mc.height); mg.drawImage(a, 0, 0);
      for (let q = Ls / 16; q < Ls; q *= 2) { mg.globalAlpha = 0.5; mg.drawImage(mc, ux * q, uy * q); }
      mg.globalAlpha = 1;
      ag.clearRect(0, 0, a.width, a.height); ag.filter = `blur(${e[k].soft || 0.8}px)`; ag.drawImage(mc, -ux * Ls / 2, -uy * Ls / 2); ag.filter = "none";
    }
    // the lit mask from the key's study under it
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, b.width, b.height);
    bg.filter = "blur(8px)"; bg.drawImage(g.canvas, x0, y0, w, h, 0, 0, w, h); bg.filter = "none";
    const id = bg.getImageData(0, 0, w, h), d = id.data;
    for (let q = 0; q < d.length; q += 4) { const u = Math.max(0, Math.min(1, (d[q] - 45) / 40)); d[q + 3] = Math.round(255 * u); }
    bg.putImageData(id, 0, 0);
    ag.globalCompositeOperation = "destination-in"; ag.drawImage(b, 0, 0); ag.globalCompositeOperation = "source-over";
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = e[k].alpha ?? 1; g.drawImage(a, 0, 0, w, h, x0, y0, w, h); g.restore();
    seed += 7;
  }
}
// the traced ink inside the eyes is dropped: the eye openings (frame coords at the key time), grown by `grow` eye px
// (the lid lines sit on the opening's edge)
export function eyeDropPolys(e, grow = 7, growDown = 14) {
  const out = [];
  for (const k of ["L", "R"]) {
    if (!e || !e[k]) continue;
    const E = EYE2[k], [a, b, tx, c, d, ty] = e[k].A;
    const cx = E.open.reduce((s, p) => s + p[0], 0) / E.open.length, cy = E.open.reduce((s, p) => s + p[1], 0) / E.open.length;
    out.push(E.open.map(([x, y]) => {
      const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, X = x + (dx / L) * grow, Y = y + (dy / L) * (dy > 0 ? growDown : grow);
      return [a * X + b * Y + tx, c * X + d * Y + ty];
    }));
  }
  return out;
}
