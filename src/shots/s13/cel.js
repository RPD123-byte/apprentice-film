// s13 cel painter: draws the measured flat-shaded traces of ./celHP.js (headphones, beak) — a base fill of the region,
// then each posterised level's rings on top (even-odd), all crisp; the metal mesh areas as a +-45 deg cross-hatch.
import { gv } from "../../lib/owlInk.js";

const ringPath = (g, R) => { for (const r of R) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); } };
export const celRegion = (C) => (g) => ringPath(g, C.region);
// With C.core: the cel is composed off-screen and masked by its hard core plus a feathered margin, so where it reaches
// into the fur (to cover the silhouette's gap round the cups) it fades into the plumage instead of ending on a seam.
export function drawCel(g, C, o = {}) {
  if (!C.core) return drawCelFlat(g, C, o);
  const cv = g.canvas, tr = g.getTransform();
  const mk = () => { const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d"); x.setTransform(tr); return x; };
  const off = mk(), m = mk();
  drawCelFlat(off, C, o);
  m.filter = `blur(${o.feather ?? 3}px)`; m.fillStyle = "#fff"; m.beginPath(); ringPath(m, C.region); m.fill("evenodd"); m.filter = "none";
  m.beginPath(); ringPath(m, C.core); m.fill("evenodd");
  off.setTransform(1, 0, 0, 1, 0, 0); off.globalCompositeOperation = "destination-in"; off.drawImage(m.canvas, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off.canvas, 0, 0); g.restore();
}
// a group's first-ring bbox centre inside box [x0, y0, x1, y1] (cached on the group)
function inBox(G, b) {
  if (G._c === undefined) { const r = G.rings[0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); } G._c = [(x0 + x1) / 2, (y0 + y1) / 2]; }
  return G._c[0] > b[0] && G._c[0] < b[2] && G._c[1] > b[1] && G._c[1] < b[3];
}
function drawCelFlat(g, C, { skipBase = false, gain = 0 } = {}) {
  if (!skipBase && C.base >= 0) { g.fillStyle = gv(C.base); g.beginPath(); ringPath(g, C.region); g.fill("evenodd"); }
  // each level: groups (an outer ring and its holes), each in its own measured value
  // (w3) each group grown by C.grow px (a stroke of its own value round its rings): the levels are painted dark to
  // light, so this pulls every boundary a fraction of a pixel toward the darker side — the posterised traces put the
  // boundaries on the dark side of the source's soft transitions (dark levels measured too large)
  for (const L of C.levels) for (const G of L) {
    g.fillStyle = gv(G.v + gain); g.beginPath(); ringPath(g, G.rings); g.fill("evenodd");
    if (C.grow > 0 && !(C.growSkip && inBox(G, C.growSkip))) { g.strokeStyle = g.fillStyle; g.lineWidth = C.grow; g.lineJoin = "round"; g.stroke(); }
  }
  if (C.mesh) drawMesh(g, C.mesh);
}
// the mesh (measured pitch ~3.2 px, lines at +-45 deg): per tone level a tile of dark lines on a light ground whose
// light / dark values are the level's 88th / 12th percentiles
const TILES = {};
function meshTile(light, dark, w = 1.3) {
  const key = light + "/" + dark + "/" + w;
  if (!TILES[key]) {
    const T = 9, c = document.createElement("canvas"); c.width = c.height = T;
    const d = c.getContext("2d"); d.fillStyle = gv(light); d.fillRect(0, 0, T, T);
    d.strokeStyle = gv(dark); d.lineWidth = w;
    for (let k = -3; k <= 3; k++) { const o = k * 4.5; d.beginPath(); d.moveTo(o - 2, -2); d.lineTo(o + T + 2, T + 2); d.stroke(); d.beginPath(); d.moveTo(o - 2, T + 2); d.lineTo(o + T + 2, -2); d.stroke(); }
    TILES[key] = c;
  }
  return TILES[key];
}
// (measured by FFT on the plate: two wave families at +-45 deg, period 3.0-3.2 px) the lattice as the sum of two
// crossed cosines round the part's mean value, amplitude measured from the source's contrast
function latticeTile(mu, amp) {
  const key = "L" + mu + "/" + amp;
  if (!TILES[key]) {
    const T = 9, c = document.createElement("canvas"); c.width = c.height = T;
    const d = c.getContext("2d"), im = d.createImageData(T, T), k = (2 * Math.PI) / 4.5;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = Math.max(0, Math.min(1, mu + amp * (Math.cos(k * (x + y + 1)) + Math.cos(k * (x - y))) )), o = (y * T + x) * 4;
      im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.round(v * 255); im.data[o + 3] = 255;
    }
    d.putImageData(im, 0, 0); TILES[key] = c;
  }
  return TILES[key];
}
// overlay parts: a mid-grey lattice laid over the cel's own (lattice-free) shading with an overlay blend, so the mesh
// takes the measured shading and the ink round it stays dark
export function drawMesh(g, parts, { w = 1.3 } = {}) {
  for (const P of parts) {
    g.save();
    if (P.overlay) g.globalCompositeOperation = "overlay";
    g.fillStyle = g.createPattern(P.overlay ? latticeTile(0.5, P.amp) : P.amp ? latticeTile(P.mu, P.amp) : meshTile(P.hi, P.lo, w), "repeat");
    g.beginPath(); ringPath(g, P.rings); g.fill("evenodd");
    g.restore();
  }
}
