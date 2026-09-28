// s06 owl, traced version: the measured value study (ground levels painted dark to light, then the dark masses),
// ink and pale strokes (data/owl.js). During the blink (28.04-28.52) the head rolls: every point is moved by that
// frame's measured head transform, weighted from 1 on the head to 0 on the body across the neck (no seam), and the
// two eye patches are replaced by that frame's measured value study (data/owl_blink.js).
import { drawInk, drawMasses, feathered } from "./ink.js";
import { INK, LIGHT, MASS } from "./data/owl.js";
import { BLINK, PATCH, PRE, POST } from "./data/owl_blink.js";
import { SIL } from "./data/owlsil.js";
// fix pass: everything of the owl is clipped to its measured silhouette (+ headphones, dilated 2 px): the traced
// ground's outer (background) levels no longer paint a flat patch over the room round the owl
export function silClip(g, map = null) {
  g.beginPath();
  for (const r of SIL) { for (let i = 0; i < r.length; i += 2) { const p = map ? map([r[i], r[i + 1]]) : [r[i], r[i + 1]]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); }
  g.clip();
}

const DETAIL_POLYS = [[[1657.0,355.0],[1656.5,359.4],[1654.9,363.7],[1652.4,367.7],[1649.0,371.5],[1644.7,374.8],[1639.7,377.7],[1634.1,379.9],[1628.0,381.6],[1621.6,382.7],[1615.0,383.0],[1608.4,382.7],[1602.0,381.6],[1595.9,379.9],[1590.3,377.7],[1585.3,374.8],[1581.0,371.5],[1577.6,367.7],[1575.1,363.7],[1573.5,359.4],[1573.0,355.0],[1573.5,350.6],[1575.1,346.3],[1577.6,342.3],[1581.0,338.5],[1585.3,335.2],[1590.3,332.3],[1595.9,330.1],[1602.0,328.4],[1608.4,327.3],[1615.0,327.0],[1621.6,327.3],[1628.0,328.4],[1634.1,330.1],[1639.7,332.3],[1644.7,335.2],[1649.0,338.5],[1652.4,342.3],[1654.9,346.3],[1656.5,350.6]],[[1764.0,355.0],[1763.5,359.4],[1761.9,363.7],[1759.4,367.7],[1756.0,371.5],[1751.7,374.8],[1746.7,377.7],[1741.1,379.9],[1735.0,381.6],[1728.6,382.7],[1722.0,383.0],[1715.4,382.7],[1709.0,381.6],[1702.9,379.9],[1697.3,377.7],[1692.3,374.8],[1688.0,371.5],[1684.6,367.7],[1682.1,363.7],[1680.5,359.4],[1680.0,355.0],[1680.5,350.6],[1682.1,346.3],[1684.6,342.3],[1688.0,338.5],[1692.3,335.2],[1697.3,332.3],[1702.9,330.1],[1709.0,328.4],[1715.4,327.3],[1722.0,327.0],[1728.6,327.3],[1735.0,328.4],[1741.1,330.1],[1746.7,332.3],[1751.7,335.2],[1756.0,338.5],[1759.4,342.3],[1761.9,346.3],[1763.5,350.6]],[[1646,364],[1686,364],[1686,410],[1646,410]],[[1580,215],[1600,205],[1660,212],[1665,240],[1640,272],[1590,275],[1578,250]],[[1535,380],[1535,230],[1560,175],[1620,140],[1680,128],[1745,138],[1805,175],[1832,230],[1835,380],[1790,380],[1790,250],[1770,205],[1720,172],[1680,165],[1630,172],[1590,205],[1575,250],[1575,380]]];
const NECK = [385, 425];   // weight 1 above, 0 below (measured: the body stays still, the neck region half-rotates)
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function blinkFrame(t) {
  const f = Math.round(t * 25 + 1e-6) / 25;
  return BLINK.find((b) => Math.abs(b.t - f) < 1e-3) || null;
}
function headMap(w) {
  const [a, b, tx, c, d, ty] = w;
  return ([x, y]) => { const k = 1 - smooth(NECK[0], NECK[1], y); const X = a * x + b * y + tx, Y = c * x + d * y + ty; return [x + k * (X - x), y + k * (Y - y)]; };
}
export const headMapOf = (fr) => headMap(fr.warp);
import { CONTOUR } from "./data/contour.js";
let SCP = null;
function scratchPatch(w, h) {
  if (!SCP || SCP.width < w || SCP.height < h) SCP = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const c = SCP.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.filter = "none"; c.clearRect(0, 0, SCP.width, SCP.height);
  return [SCP, c];
}
export function releaseOwl() { SCP = null; }
const OWL_HILITE = [[1606.2, 345.5, 5.5], [1627.1, 359.1, 2.1], [1705.9, 345.5, 5.5], [1727, 361.1, 2.0]];
export const OWLEYE = { top: 0.78, paper: 0.99, feather: 3, blur: 0, grow: 7 };
export const OWLLIDCAL = { end: 9, endMin: 0.1, sharpen: 1.2, gain: 1.0, per: 2 };
export const OWLSHUTCAL = { end: 12, endMin: 0.1, sharpen: 1.15, gain: 0.85, per: 2 };
// the still eyes before / after the blink (value studies of the mean frames 26.76-27.96 / 28.64-29.00)
export const stillEyes = (t) => (t < 28.2 ? PRE : POST);
// fix pass: the head tuft. Its outline is the MEASURED 50% contour of the neutral mean (4x, lightly smoothed): spike
// tips at (1752,208.5), (1783,198), (1788.4,227.3), (1777.6,251); notches at (1746.5,224), (1769,238), (1766,253). Inside
// TUFT_ZONE the traced owl drawing is clipped to the tuft outline (the notches show the room again; the traced notch
// strokes are dropped) and the tuft is painted crisp: white fill, 1 px grey outline, no blur.
export const TUFT = [[1700, 212], [1716, 215], [1727, 218], [1736, 220.3], [1739.2, 218.4], [1745, 214.1], [1750, 209.2], [1751.8, 208.4], [1752.2, 208.8], [1752.1, 210], [1750.1, 215.8], [1746.4, 223], [1746.4, 223.9], [1747, 224.2], [1749.8, 222.7], [1754.5, 221.2], [1761.5, 217.1], [1773.2, 208], [1780.6, 200.6], [1782.2, 198.2], [1783.1, 197.9], [1783, 208], [1780.3, 218.2], [1774.8, 230], [1768.6, 237.5], [1770, 238], [1773, 237.1], [1781.2, 232.2], [1787.8, 227.2], [1788.4, 227.3], [1788.3, 228.2], [1783.8, 236.8], [1778.8, 243.2], [1774.2, 247.4], [1770.5, 249.6], [1766.2, 253.2], [1767.5, 253.8], [1770, 253.1], [1776.5, 249.9], [1777.6, 251], [1778.8, 254.2], [1784, 259], [1784.5, 266], [1760, 282], [1700, 282]];
const TUFT_EDGE = [3, 41];   // the outline indices that are the tuft's silhouette (the rest closes inside the head)
export const TUFT_ZONE = [[1730, 216], [1738, 206], [1748, 200], [1765, 194], [1778, 188], [1788, 190], [1790, 205], [1795, 222], [1794, 235], [1789, 248], [1787, 258], [1785, 262], [1776, 258], [1766, 256], [1760, 245], [1755, 232], [1745, 226], [1735, 222]];
// the dark around the spikes: the zone's outer boundary, then the tuft silhouette back
const TUFT_HOLE = [[1735, 218.5], [1738, 206], [1748, 200], [1765, 194], [1778, 188], [1788, 190], [1790, 205], [1795, 222], [1794, 235], [1789, 248], [1787, 258], [1785.5, 262], ...TUFT.slice(TUFT_EDGE[0], TUFT_EDGE[1] + 1).reverse()];
export const TUFTCAL = { fill: 0.92, edge: 0.6, edgeW: 1.0, hole: 0.085 };
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const inZone = (s) => { let n = 0, k = 0; for (let i = 0; i < s.length; i += 5, k++) if (inPoly(TUFT_ZONE, s[i], s[i + 1])) n++; return n / Math.max(1, k) > 0.3; };
let INK_T = null, LIGHT_T = null;
export function tuftClip(g, map = null) {
  const m = (P) => (map ? P.map(map) : P);
  g.beginPath(); g.rect(0, 0, 2206, 946);
  for (const P of [m(TUFT_HOLE)]) { P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  g.clip("evenodd");
}
function drawTuft(g, map = null) {
  const T = map ? TUFT.map(map) : TUFT, Z = map ? TUFT_ZONE.map(map) : TUFT_ZONE, HO = map ? TUFT_HOLE.map(map) : TUFT_HOLE;
  // the notches and the dark round the spikes (source: 0.07-0.09 ungraded), feathered into the owl's traced ground
  g.save(); g.filter = "blur(2.5px)"; const hv = Math.round(TUFTCAL.hole * 255); g.fillStyle = `rgb(${hv},${hv},${hv})`;
  g.beginPath(); HO.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
  g.save(); g.beginPath(); Z.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  const c = Math.round(TUFTCAL.fill * 255); g.fillStyle = `rgb(${c},${c},${c})`;
  g.beginPath(); T.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  const e = Math.round(TUFTCAL.edge * 255); g.strokeStyle = `rgb(${e},${e},${e})`; g.lineWidth = TUFTCAL.edgeW; g.lineJoin = "miter"; g.miterLimit = 12;
  g.beginPath(); for (let i = TUFT_EDGE[0]; i <= TUFT_EDGE[1]; i++) (i > TUFT_EDGE[0] ? g.lineTo(T[i][0], T[i][1]) : g.moveTo(T[i][0], T[i][1])); g.stroke();
  g.restore();
}
export function drawOwlT(g, fr = null, still = null) {
  if (still) fr = { warp: [1, 0, 0, 0, 1, 0], ...still };
  const map = fr ? headMap(fr.warp) : null;
  if (!INK_T) { INK_T = INK.filter((s) => !inZone(s)); LIGHT_T = LIGHT.filter((s) => !inZone(s)); }
  g.save();
  drawMasses(g, MASS.ground, { blur: 0.6, map });
  drawMasses(g, MASS.dark, { blur: 0.5, map });
  drawInk(g, INK_T, { end: 5, endMin: 0.15, map });
  drawInk(g, LIGHT_T, { bright: true, end: 4, endMin: 0.2, wMin: 0.5, map });
  // the crisp features (eyes, beak, bandage, headphone band and cups): a direct value study at 14 levels, faded in at
  // the edges of its regions (trace/cfg/owl.json "detail" include polygons)
  feathered(g, DETAIL_POLYS, 2, (o) => drawMasses(o, MASS.detail, { blur: OWLEYE.blur, map }), map);
  if (fr) {
    const ells = PATCH.map(([cx, cy, rx, ry]) => Array.from({ length: 40 }, (_, i) => [cx + rx * Math.cos((i / 40) * Math.PI * 2), cy + ry * Math.sin((i / 40) * Math.PI * 2)]));
    // fix pass: the patch's palest levels (>= OWLEYE.top) are merged into one paper value: posterized, the faint open-eye
    // socket arcs of the source became hard ghost rings round the shut eyes
    const top = OWLEYE.top;
    // (the ground levels nest dark to light: the first level at or above `top` keeps its outline, painted in paper)
    const gi = fr.ground.findIndex((it) => it[0] >= top);
    const G = gi < 0 ? fr.ground : [...fr.ground.slice(0, gi), [OWLEYE.paper, ...fr.ground[gi].slice(1)]];
    // shut frames: only the paper and the fitted lids (the value study's soft lid band doubled the line)
    const shut = !still && CONTOUR[`owlShutL_${fr.t.toFixed(2)}`];
    // the patches are laid on paper in ellipses OWLEYE.grow px larger, so the feathered rim no longer lets the still
    // eye's outline through (the ghost rings of the review)
    const big = PATCH.map(([cx, cy, rx, ry]) => Array.from({ length: 48 }, (_, i) => [cx + (rx + OWLEYE.grow) * Math.cos((i / 48) * Math.PI * 2), cy + (ry + OWLEYE.grow) * Math.sin((i / 48) * Math.PI * 2)]));
    feathered(g, big, OWLEYE.feather, (o) => {
      const c = Math.round(OWLEYE.paper * 255); o.fillStyle = `rgb(${c},${c},${c})`;
      for (const E of big) { o.beginPath(); (map ? E.map(map) : E).forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y))); o.closePath(); o.fill(); }
      if (shut) return;
      // the value study inside its own ellipses, 2.5 px in: drawn whole on a scratch layer, then masked once (its rings
      // all end on the ellipse, and stacked antialiased edges leave a dotted seam)
      const [sc, so] = scratchPatch(o.canvas.width, o.canvas.height);
      so.setTransform(o.getTransform());
      drawMasses(so, G, { blur: OWLEYE.blur, map }); drawMasses(so, fr.dark, { blur: OWLEYE.blur, map });
      so.globalCompositeOperation = "destination-in"; so.fillStyle = "#fff"; so.beginPath();
      for (const [cx, cy, rx, ry] of PATCH) { const E = Array.from({ length: 48 }, (_, i) => [cx + (rx - 2.5) * Math.cos((i / 48) * Math.PI * 2), cy + (ry - 2.5) * Math.sin((i / 48) * Math.PI * 2)]); (map ? E.map(map) : E).forEach(([x, y], i) => (i ? so.lineTo(x, y) : so.moveTo(x, y))); so.closePath(); }
      so.fill(); so.globalCompositeOperation = "source-over"; so.setTransform(1, 0, 0, 1, 0, 0);
      o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.drawImage(sc, 0, 0); o.restore();
    }, map);
    // the lids fitted on the source (trace/contour.py), crisp and dark: the upper lids of the still eyes (pre / post
    // means), the shut lids of each shut frame
    // the catch-lights of the still eyes, crisp (measured blob centres / areas on the pre and post means)
    if (still) { g.fillStyle = "#fff"; for (const [x, y, r] of OWL_HILITE) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
    const keys = still ? ["L", "R"].map((sd) => `owlLid${sd}_${still === PRE ? "pre" : "post"}`) : ["L", "R"].map((sd) => `owlShut${sd}_${fr.t.toFixed(2)}`);
    for (const k of keys) if (CONTOUR[k]) drawInk(g, CONTOUR[k], still ? OWLLIDCAL : OWLSHUTCAL);
  }
  g.restore();
  drawTuft(g, map);
}
