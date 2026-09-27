// s04 (fix1): the pencil in his teeth as a vector drawing (the review: the traced pencil was lumpy, its ferrule and
// graphite tip soft). Two measured models, each placed per source frame by a measured affine (PENCIL_A / PENCIL_B,
// trace/fix1/pencil_track.py: coarse-to-fine ECC affines of the pencil between consecutive frames, correlation
// 0.84-1.0):
//   A (19.12-22.12): the whole pencil as on 20.56, measured at 4x (snapshots/s04-fix1w/penL.jpg, penR.jpg): tip
//     (706, 729); graphite to x 733; the sharpened wood cone to the scalloped edge at x ~797 (its half-width grows
//     0.2 px per px from the tip); the hexagonal shaft (outlines at y 708.5 / 744.5, facet lines at 720.5 / 736,
//     paint ~130 over the top facet, ~242 over the middle, ~200 -> 120 over the lower one) to the ferrule at x 1312;
//     the ferrule (grooves at 1318, 1326 and 1352-1360) to its rounded end at 1392.
//   B (22.36-23.08): the tip half seen from behind him, as on 23.08 (pen577.jpg): tip (1136, 519), along
//     (0.952, -0.305) to where it goes into his lips 218 px on; half-width 8.5; graphite 13 px, cone to 44 px.
// (22.16-22.32, where the pencil points at the lens end-on, the traced drawing stays.)
// Paint values measured on the frames (the film's grade inverted). Motion: smeared along its measured velocity with
// the shot's shutter (0.35): while the camera pans (19.12-19.40, ~28 px per frame, mostly vertical) the source's
// pencil outlines wash out to paint ~140-160.
import { hash } from "../../lib/rng.js";
const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
const MODEL_A = { o: [706, 728], d: [1, -0.0015], hw: 17, gLen: 27, cLen: 91, sEnd: 606, fEnd: 686, lips: null };
// (A's bite: his upper teeth are in front of the pencil's upper part between x 978 and 1111 on 20.56, their lower
// edges curving down to y 718-727 -- measured at 4x, snapshots/s04-fix1w/mouth514.jpg; in model coords (from the tip))
MODEL_A.bite = [[272, -21], [405, -21], [405, -10], [394, -8], [374, -5], [354, -1], [339, -3], [324, -1], [304, -4], [284, -7], [272, -11]];
const MODEL_B = { o: [1136, 519], d: [0.952, -0.305], hw: 8.5, gLen: 13, cLen: 44, sEnd: 218, fEnd: null };
// the pencil in its own coordinates: x along the axis from the tip, y across (+ = the lower side on 20.56)
function pencilLocal(g, m) {
  const { hw, gLen, cLen, sEnd, fEnd } = m;
  const k = hw / cLen;   // the cone's half-width slope
  // shaft
  const shaft = () => { g.beginPath(); g.rect(cLen - 2, -hw, sEnd - cLen + 2, 2 * hw); };
  const sg = g.createLinearGradient(0, -hw, 0, hw);
  if (m.fEnd) {
    sg.addColorStop(0, grey(150)); sg.addColorStop(0.34, grey(122)); sg.addColorStop(0.35, grey(238)); sg.addColorStop(0.74, grey(244));
    sg.addColorStop(0.76, grey(215)); sg.addColorStop(0.9, grey(170)); sg.addColorStop(1, grey(118));
  } else {
    // (fix2) B, from behind him: measured across the shaft on 23.04, 100 px from the tip (the review: two parallel tubes;
    // B had A's shading, lit side and shaded side the wrong way round): a lit edge on its upper side, a mid grey
    // middle, a shaded band on its lower side, dark lower edge
    sg.addColorStop(0, grey(125)); sg.addColorStop(0.1, grey(238)); sg.addColorStop(0.2, grey(236)); sg.addColorStop(0.32, grey(182));
    sg.addColorStop(0.55, grey(186)); sg.addColorStop(0.63, grey(128)); sg.addColorStop(0.8, grey(126)); sg.addColorStop(0.88, grey(165)); sg.addColorStop(1, grey(70));
  }
  shaft(); g.fillStyle = sg; g.fill();
  // the wood grain the source draws along the whole shaft: fine broken lines (dashes 15-90 px, gaps 4-24 px) at
  // seeded offsets across it, grey ~150-190 (measured: the shaft's middle band averages ~225 on 20.56, not white)
  for (let q = 0; q < 16; q++) {
    const yy = -0.95 + (1.9 * (q + 0.5)) / 16 + (hash(q, 3) - 0.5) * 0.08;
    g.lineWidth = Math.max(0.5, hw * (0.035 + 0.025 * hash(q, 4))); g.strokeStyle = grey(145 + 45 * hash(q, 5)); g.globalAlpha = 0.75;
    let x = cLen + 4 + 30 * hash(q, 6), k2 = 0;
    g.beginPath();
    while (x < sEnd - 4) {
      const L = 15 + 75 * hash(q, k2, 7), x2 = Math.min(sEnd - 4, x + L);
      g.moveTo(x, yy * hw + (hash(q, k2, 8) - 0.5) * 0.6); g.lineTo(x2, yy * hw + (hash(q, k2, 9) - 0.5) * 0.6);
      x = x2 + 4 + 20 * hash(q, k2, 10); k2++;
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // facet lines (B: one, faint)
  g.strokeStyle = grey(100); g.lineWidth = Math.max(0.8, hw * 0.08);
  if (!m.fEnd) { g.globalAlpha = 0.45; g.beginPath(); g.moveTo(cLen + 2, 0.2 * hw); g.lineTo(sEnd, 0.2 * hw); g.stroke(); g.globalAlpha = 1; }
  else for (const yy of [-0.33, 0.52]) { g.beginPath(); g.moveTo(cLen + 2, yy * hw); g.lineTo(sEnd, yy * hw); g.stroke(); }
  // the cone (sharpened wood), with its scalloped edge on the shaft
  const cone = () => { g.beginPath(); g.moveTo(gLen, -k * gLen); g.lineTo(cLen, -hw); g.lineTo(cLen, hw); g.lineTo(gLen, k * gLen); g.closePath(); };
  const cg = g.createLinearGradient(0, -hw, 0, hw);
  cg.addColorStop(0, grey(150)); cg.addColorStop(0.3, grey(160)); cg.addColorStop(0.42, grey(240)); cg.addColorStop(0.8, grey(246)); cg.addColorStop(1, grey(205));
  cone(); g.fillStyle = cg; g.fill();
  if (m.fEnd) {   // (B: no facet lines on the cone -- measured bright and even there on 23.04)
    g.strokeStyle = grey(120); g.lineWidth = Math.max(0.6, hw * 0.05); g.globalAlpha = 0.7;
    for (const yy of [-0.35, 0.5]) { g.beginPath(); g.moveTo(gLen + 2, yy * k * gLen); g.lineTo(cLen - 3, yy * hw); g.stroke(); }
    g.globalAlpha = 1;
  }
  // scallops: the paint's edge where it was sharpened
  g.beginPath(); g.moveTo(cLen, -hw);
  const n = 3; for (let i = 0; i < n; i++) { const y0 = -hw + (2 * hw * i) / n, y1 = -hw + (2 * hw * (i + 1)) / n; g.quadraticCurveTo(cLen - hw * 0.35, (y0 + y1) / 2, cLen, y1); }
  g.strokeStyle = grey(60); g.lineWidth = Math.max(0.8, hw * 0.07); g.stroke();
  // graphite
  // (fix2: B's graphite measured dark over the first ~12 px on 23.04; foreshortened to ~7 px by 22.36 it read pale:
  // drawn a little wider and darker so the point stays a small black point)
  const gk = m.fEnd ? 1 : 1.5, gv = m.fEnd ? 30 : 16;
  g.beginPath(); g.moveTo(-1, 0); g.lineTo(gLen + 1, -k * gLen * gk - 0.4); g.lineTo(gLen + 1, k * gLen * gk + 0.4); g.closePath();
  g.fillStyle = grey(gv); g.fill();
  g.strokeStyle = grey(95); g.lineWidth = Math.max(0.5, hw * 0.04); g.beginPath(); g.moveTo(gLen * 0.25, -k * gLen * 0.1); g.lineTo(gLen * 0.9, -k * gLen * 0.45); g.stroke();
  // ferrule
  if (fEnd) {
    const fs = sEnd, fh = hw * 1.02;
    const fg = g.createLinearGradient(0, -fh, 0, fh);
    fg.addColorStop(0, grey(100)); fg.addColorStop(0.3, grey(128)); fg.addColorStop(0.36, grey(235)); fg.addColorStop(0.55, grey(236));
    fg.addColorStop(0.62, grey(160)); fg.addColorStop(0.9, grey(140)); fg.addColorStop(1, grey(90));
    g.beginPath(); g.moveTo(fs, -fh); g.lineTo(fEnd - 5, -fh); g.ellipse(fEnd - 5, 0, 5, fh, 0, -Math.PI / 2, Math.PI / 2); g.lineTo(fs, fh); g.closePath();
    g.fillStyle = fg; g.fill();
    g.strokeStyle = grey(55); g.lineWidth = Math.max(0.8, hw * 0.08);
    for (const x of [fs + 1, fs + 6, fs + 14, fs + 40, fs + 48]) { g.beginPath(); g.ellipse(x, 0, 2.5, fh, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); }
    g.lineWidth = Math.max(1, hw * 0.16); g.strokeStyle = grey(26);
    g.beginPath(); g.moveTo(fs, -fh); g.lineTo(fEnd - 5, -fh); g.ellipse(fEnd - 5, 0, 5, fh, 0, -Math.PI / 2, Math.PI / 2); g.lineTo(fs, fh); g.stroke();
  }
  // the outline: shaft edges and cone edges
  g.strokeStyle = grey(26); g.lineWidth = Math.max(1, hw * 0.18); g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, 0); g.lineTo(cLen, -hw); g.lineTo(sEnd, -hw); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(cLen, hw); g.lineTo(sEnd, hw); g.stroke();
}
// the pencil's outline polygon in frame coords (for dropping the traced lines under it), grown by `grow` px
// The measured affine is used only through the axis: where it puts the tip and the far end (well measured along
// the pencil); across it the pencil keeps its width (the affine's cross-axis scale is poorly measured on a thin
// object and squashed it). -> the pencil frame: origin (the tip), axis vector per model px, unit normal.
function frameOf(m, A, off = 0) {
  const [a, b, tx, c, d, ty] = A, L = Math.hypot(m.d[0], m.d[1]), ux = m.d[0] / L, uy = m.d[1] / L;
  const e = m.fEnd || m.sEnd, T = m.o, E = [m.o[0] + ux * e, m.o[1] + uy * e];
  const t = [a * T[0] + b * T[1] + tx, c * T[0] + d * T[1] + ty], q = [a * E[0] + b * E[1] + tx, c * E[0] + d * E[1] + ty];
  const ax = [(q[0] - t[0]) / e, (q[1] - t[1]) / e], al = Math.hypot(ax[0], ax[1]) || 1;
  const n = [-ax[1] / al, ax[0] / al];
  return { t: [t[0] + n[0] * off, t[1] + n[1] * off], ax, n };
}
export function pencilPoly(which, A, grow = 5, off = 0) {
  const m = which === "A" ? MODEL_A : MODEL_B, F = frameOf(m, A, off);
  const P = (s, u) => [F.t[0] + F.ax[0] * s + F.n[0] * u, F.t[1] + F.ax[1] * s + F.n[1] * u];
  const gs = grow / (Math.hypot(F.ax[0], F.ax[1]) || 1);
  const e = m.fEnd || m.sEnd, h = m.hw + grow;
  return [P(-gs, 0), P(m.cLen, -h), P(e + gs, -h), P(e + gs, h), P(m.cLen, h)];
}
// draw the pencil for a key frame into a key canvas g (M = margin); A: the model's affine to this frame; v: its
// velocity (px per frame) for the smear
let SC = null;
export function paintPencil(g, M, which, A, v = [0, 0], off = 0, shutter = 0.35) {
  const m = which === "A" ? MODEL_A : MODEL_B, F = frameOf(m, A, off);
  const poly = pencilPoly(which, A, 8, off);
  const x0 = Math.floor(Math.min(...poly.map((p) => p[0]))) - 40, x1 = Math.ceil(Math.max(...poly.map((p) => p[0]))) + 40;
  const y0 = Math.floor(Math.min(...poly.map((p) => p[1]))) - 40, y1 = Math.ceil(Math.max(...poly.map((p) => p[1]))) + 40;
  const w = x1 - x0, h = y1 - y0;
  if (!SC) SC = { a: document.createElement("canvas"), b: document.createElement("canvas") };
  for (const cv of [SC.a, SC.b]) { cv.width = w; cv.height = h; }   // (fix2: exact size each time: fresh state, order-independent)
  const sa = SC.a.getContext("2d"), sb = SC.b.getContext("2d");
  sa.setTransform(1, 0, 0, 1, 0, 0); sa.clearRect(0, 0, SC.a.width, SC.a.height);
  // pencil coords (x along the axis in model px, y across in px) -> frame -> scratch
  sa.setTransform(F.ax[0], F.ax[1], F.n[0], F.n[1], F.t[0] - x0, F.t[1] - y0);
  sa.save();
  if (m.bite) {   // everything but the bite
    sa.beginPath(); sa.rect(-60, -80, (m.fEnd || m.sEnd) + 120, 160);
    m.bite.forEach(([x, y], i) => (i ? sa.lineTo(x, y) : sa.moveTo(x, y))); sa.closePath(); sa.clip("evenodd");
  }
  pencilLocal(sa, m);
  sa.restore();
  sa.setTransform(1, 0, 0, 1, 0, 0);
  let src = SC.a;
  const sp = Math.hypot(v[0], v[1]), Ls = sp * shutter;
  if (Ls > 2) {   // a 16-tap box along the motion (repeated halving), centred; plus a slight defocus
    const vx = v[0] / sp, vy = v[1] / sp;
    sb.setTransform(1, 0, 0, 1, 0, 0); sb.clearRect(0, 0, SC.b.width, SC.b.height); sb.drawImage(SC.a, 0, 0);
    for (let s = Ls / 16; s < Ls; s *= 2) { sb.globalAlpha = 0.5; sb.drawImage(SC.b, vx * s, vy * s); }
    sb.globalAlpha = 1;
    sa.clearRect(0, 0, SC.a.width, SC.a.height); sa.filter = "blur(0.8px)"; sa.drawImage(SC.b, -vx * Ls / 2, -vy * Ls / 2); sa.filter = "none";
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(src, 0, 0, w, h, x0 + M, y0 + M, w, h); g.restore();
}

// the bite polygon in frame coords (null for B)
export function pencilBite(which, A, off = 0) {
  const m = which === "A" ? MODEL_A : MODEL_B;
  if (!m.bite) return null;
  const F = frameOf(m, A, off);
  return m.bite.map(([x, y]) => [F.t[0] + F.ax[0] * x + F.n[0] * y, F.t[1] + F.ax[1] * x + F.n[1] * y]);
}
