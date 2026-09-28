// s02 designer, pass 2: the ink is the source's own line work, MEASURED as outlines (faceInk.js; traced by
// trace/trace_designer.py + trace_poster.py on averaged stare frames after inverting the grade): a grey level (soft
// hatching, bags, knit) and an ink level (lines, hair, brows, lids), each a set of shapes with holes filled in its
// measured value, on measured grounds. Kept from pass 1 (designer.js): the shapes (hoodie, skin, beanie, laptop), the
// procedural pencil and laptop, and the beanie crown above the frame (y < 0, only ever seen blurred in the pans).
// Two static drawings: the stare (eye ink from 6.08–6.88 s; the irises are drawn per frame at the scan offset) and the
// look (eye ink from 8.96–10.44 s, irises included).
import { sampleCurve } from "../../lib/paths.js";
import { clamp } from "../../lib/rng.js";
import { HAIR } from "./hairShapes.js";
import { FACE_P, FACE_G, FACE_I, EYE0_P, EYE0_G, EYE0_I, IRIS0_P, IRIS0_G, IRIS0_I, EYE1_P, EYE1_G, EYE1_I } from "./faceInk.js";
import { HOODIE, SKIN, BEANIE, EYES, paintLaptop, paintBeanie, gv } from "./designer.js";

const flatPoly = (f) => (c) => { c.moveTo(f[0], f[1]); for (let i = 2; i < f.length; i += 2) c.lineTo(f[i], f[i + 1]); c.closePath(); };
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
function fillPath(g, path, style, rule) { g.beginPath(); path(g); g.fillStyle = style; g.fill(rule || "nonzero"); }

// options (the film uses these defaults; snapshots/s02-lab varies them)
export const DOPTS = { crown: false, pale: true, paleDv: -0.05, grey: true, ink: true, greyDv: -0.03, inkDv: -0.03, skin: 0.975, hairGround: 0.9 };

// measured shapes: [v*100, nRings, len, x0, y0, dx, dy, ...] in half-pixels (vertices at 2x pixel centres)
export function shapeSet(g, list, { dx = 0, dy = 0, dv = 0, div = 100 } = {}) {
  for (const s of list) {
    let i = 2;
    g.beginPath();
    for (let r = 0; r < s[1]; r++) {
      const n = s[i++]; let x = s[i++], y = s[i++];
      g.moveTo((x + 0.5) / 2 + dx, (y + 0.5) / 2 + dy);
      for (let k = 1; k < n; k++) { x += s[i++]; y += s[i++]; g.lineTo((x + 0.5) / 2 + dx, (y + 0.5) / 2 + dy); }
      g.closePath();
    }
    g.fillStyle = gv(clamp(s[0] / div + dv)); g.fill("evenodd");
  }
}
function levels(g, P, G, I, o = {}) {
  if (DOPTS.pale) shapeSet(g, P, { ...o, dv: DOPTS.paleDv });
  if (DOPTS.grey) shapeSet(g, G, { ...o, dv: DOPTS.greyDv });
  if (DOPTS.ink) shapeSet(g, I, { ...o, dv: DOPTS.inkDv });
}

// grounds (pre-grade paint values measured on the envelope of the stare average): skin and hoodie are white paper
// (0.99–1.0; their grey is all hatching), the far sides of the hoodie ~0.93–0.97; the beanie cuff's paper (median of
// the pixels no ink level covers) 0.63–0.67
function grounds(g) {
  fillPath(g, poly(HOODIE), (() => { const r = g.createLinearGradient(0, 0, 2040, 0); r.addColorStop(0, gv(0.95)); r.addColorStop(0.08, gv(0.99)); r.addColorStop(0.9, gv(0.99)); r.addColorStop(1, gv(0.93)); return r; })());
  fillPath(g, poly(SKIN), gv(DOPTS.skin));
  // paper under the hair (its black and its lit gaps are all in the measured shapes)
  g.beginPath(); for (const p of HAIR) flatPoly(p.o)(g); g.fillStyle = gv(DOPTS.hairGround); g.fill();
}
const beaniePath = (c) => { c.moveTo(BEANIE[0][0], BEANIE[0][1]); for (const p of BEANIE) c.lineTo(p[0], p[1]); c.closePath(); };
function beanie(g) {
  // above the frame (y < 0) the crown comes from the pans' measured mosaic (s02.js); in the frame: the measured cuff
  // ground (+ shapes)
  if (DOPTS.crown) { g.save(); g.beginPath(); g.rect(-100, -800, 2400, 800); g.clip(); paintBeanie(g); g.restore(); }
  g.save(); g.beginPath(); g.rect(-100, 0, 2400, 900); g.clip();
  fillPath(g, beaniePath, (() => {
    const r = g.createLinearGradient(560, 0, 1520, 0);
    for (const [x, v] of [[560, 0.6], [640, 0.634], [720, 0.631], [800, 0.627], [880, 0.644], [960, 0.657], [1040, 0.653], [1120, 0.674], [1200, 0.652], [1280, 0.636], [1360, 0.638], [1440, 0.62], [1520, 0.55]]) r.addColorStop((x - 560) / 960, gv(v));
    return r;
  })());
  g.restore();
}
// the teeth bite down over the pencil's top edge (pencil body 711–745, measured): their white ground goes over the
// pencil, their outlines are in the measured shapes (the tracer leaves the teeth box in and the pencil body out)
// the pencil's outline (measured at 8.4 s: tip at x 707, body 709–746, ferrule and eraser to 1397)
const PENCIL = [[705, 727], [796, 708], [1312, 708], [1394, 709], [1398, 745], [1312, 747], [796, 747]];
const TEETH = [[972, 699], [1130, 699], [1130, 712], [1128, 718], [1100, 719], [1100, 724], [1053, 726], [1010, 725], [1010, 721], [993, 721], [993, 717], [974, 717]];

// the iris (per frame in the stare): pale disk, the measured iris shapes (striations, ring, pupil) moved by the scan
const IRIS_C = [[852.5, 323.5], [1232.5, 318.5]];
const opening = (E, grow = 0) => (c) => {
  const up = sampleCurve(E.up0.map(([x, y]) => [x, y - grow]), 8), lo = sampleCurve(E.lo0.map(([x, y]) => [x, y + grow]), 8).reverse();
  c.moveTo(up[0][0], up[0][1]); for (const p of up) c.lineTo(p[0], p[1]); for (const p of lo) c.lineTo(p[0], p[1]); c.closePath();
};
export function paintIris(g, dx, dy) {
  for (let k = 0; k < 2; k++) {
    const E = EYES[k], [cx, cy] = IRIS_C[k];
    const mine = (L) => L.filter((s) => Math.abs(s[3] / 2 - cx) < 60);
    g.save(); g.beginPath(); opening(E, 2)(g); g.clip();
    g.beginPath(); g.arc(cx + dx, cy + dy, 33, 0, 2 * Math.PI); g.fillStyle = gv(0.96); g.fill();
    levels(g, mine(IRIS0_P), mine(IRIS0_G), mine(IRIS0_I), { dx, dy });
    g.restore();
  }
}

// the look: iris grounds under the traced eye shapes, measured on the look average (Hough): centre, radius and the
// iris's light value (80th percentile inside the ring), clipped to the lowered lids
const IRIS_L = [[907.5, 309.5, 34, 0.67], [1266.5, 324.5, 31, 0.76]];
function lookIrises(g) {
  for (let k = 0; k < 2; k++) {
    const E = EYES[k], [x, y, r, v] = IRIS_L[k];
    const up = sampleCurve(E.up1.map(([px, py]) => [px, py - 3]), 8), lo = sampleCurve(E.lo1.map(([px, py]) => [px, py + 3]), 8).reverse();
    g.save(); g.beginPath(); g.moveTo(up[0][0], up[0][1]); for (const p of up) g.lineTo(p[0], p[1]); for (const p of lo) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
    g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fillStyle = gv(v); g.fill();
    g.restore();
  }
}
// the static drawing without the eyes' ink
export function paintBase(g) {
  g.lineCap = "round"; g.lineJoin = "round";
  grounds(g);
  beanie(g);
  // the pencil's paper (brightest quarter of its pixels, measured: 0.95–0.99; its lines, shading, ferrule rings and
  // the teeth over it are all in the traced shapes)
  fillPath(g, poly(PENCIL), gv(0.96));
  fillPath(g, poly(TEETH), gv(0.97));
  paintLaptop(g);
  // the lid's lit top edge: measured paper (brightest tenth of rows 816-832 per 60 px), its lines are in the shapes
  g.save(); g.beginPath(); g.rect(232, 815, 1654, 19); g.clip();
  { const r = g.createLinearGradient(230, 0, 1890, 0);
    for (const [x, v] of [[230, 0.99], [290, 0.62], [350, 0.61], [410, 0.87], [470, 0.76], [530, 0.83], [650, 0.81], [710, 0.79], [770, 0.97], [1370, 0.95], [1430, 0.81], [1490, 0.81], [1550, 0.88], [1610, 0.74], [1670, 0.66], [1730, 0.66], [1790, 0.77], [1850, 0.99], [1890, 0.99]]) r.addColorStop((x + 30 - 230) / 1690, gv(v));
    g.fillStyle = r; g.fillRect(232, 815, 1654, 19); }
  g.restore();
  levels(g, FACE_P, FACE_G, FACE_I);
}
export function paintEyes(g, phase) {
  if (phase === 0) levels(g, EYE0_P, EYE0_G, EYE0_I);
  else { lookIrises(g); levels(g, EYE1_P, EYE1_G, EYE1_I); }
}
