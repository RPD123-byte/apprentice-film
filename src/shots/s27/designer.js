// The designer asleep on his folded arms (beanie, headphones round his neck, green jacket), painted once in the
// coordinates of the 125.0 s source frame, then moved per frame by the measured motion field (see s27.js).
// Painting: flat colour regions + ink polygons with their measured colours (designerData2.js, traced on a grain-free
// median of the source around 125.0), then the outer keyline. Everything is drawn here with canvas paths.
import { DES2_REGIONS, DES2_INK, DES_OUTLINE } from "./designerData2.js";
import { canvas } from "./paint.js";
import { poly as dec } from "./codec.js";

export const DES_BOX = { x0: -40, y0: 60, x1: 1120, y1: 1000 };   // frame@125 coords covered by the layer
export const DES_SC = 1.5;                                       // layer px per frame px

const INK = "#040303";   // the source's line art and hair are pure black (pre-grade 0)
function poly4(g, p) { const a = dec(p); g.moveTo(a[0] / 4, a[1] / 4); for (let i = 2; i < a.length; i += 2) g.lineTo(a[i] / 4, a[i + 1] / 4); g.closePath(); }
function poly2(g, p) { const a = dec(p); g.moveTo(a[0] / 2, a[1] / 2); for (let i = 2; i < a.length; i += 2) g.lineTo(a[i] / 2, a[i + 1] / 2); g.closePath(); }

// (end-s27-fix1) the drawing read heavier and more posterised than the source (dark area at 125.04: beanie 23.5 % vs 21.6 %,
// hair 55.8 % vs 51.1 %, face 19.9 % vs 16.7 %; blobby crown hatching; ragged, doubled outline). Now: the flat colour fill is
// softened (a copy blurred by ~1.2 px laid over the crisp fill, so the edge stays opaque), the ink is thinned by ~0.3 px a
// side (its polygons' own edges erased with a 0.6 px stroke), and the keyline follows a lightly smoothed outline.
// frame-px -> canvas-px scale k (blur and erase widths are given in frame px)
function paintLayers(g, k, W, H, outline, fillRegions, inkGroups, polyFn, keyline) {
  const clip = (h) => { h.beginPath(); outline(h, false); h.clip(); };
  // base + fill, crisp
  g.beginPath(); outline(g, false); g.fillStyle = "#5f6658"; g.fill();
  const fc = canvas(W, H), f = fc.getContext("2d"); f.setTransform(g.getTransform()); f.lineJoin = "round";
  f.save(); clip(f);
  f.beginPath(); outline(f, false); f.fillStyle = "#5f6658"; f.fill();
  for (const r of fillRegions) { f.beginPath(); polyFn(f, r[1]); for (let q = 2; q < r.length; q++) polyFn(f, r[q]); f.fillStyle = r[0]; f.fill("evenodd"); f.lineWidth = 1.0; f.strokeStyle = r[0]; f.stroke(); }
  f.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fc, 0, 0); g.restore();
  // the softened copy, clipped to the outline
  g.save(); clip(g); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${(1.2 * k).toFixed(2)}px)`; g.drawImage(fc, 0, 0); g.filter = "none"; g.restore();
  fc.width = fc.height = 0;
  // ink, thinned
  const ic = canvas(W, H), h = ic.getContext("2d"); h.setTransform(g.getTransform()); h.lineJoin = "round";
  h.save(); clip(h);
  for (const grp of inkGroups) { h.beginPath(); for (let q = 1; q < grp.length; q++) for (const pp of grp[q]) polyFn(h, pp); h.fillStyle = grp[0]; h.fill("evenodd"); }
  h.globalCompositeOperation = "destination-out"; h.lineWidth = 0.6; h.strokeStyle = "#000";
  for (const grp of inkGroups) { h.beginPath(); for (let q = 1; q < grp.length; q++) for (const pp of grp[q]) polyFn(h, pp); h.stroke(); }
  h.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ic, 0, 0); g.restore();
  ic.width = ic.height = 0;
  if (keyline) keyline();
}
// a closed polygon smoothed by a [1 2 3 2 1] moving average of its vertices (the traced outlines are ragged at the 2-5 px scale)
function smoothPts(a, sc) {
  const n = a.length / 2, P = [];
  for (let i = 0; i < n; i++) P.push([a[2 * i] / sc, a[2 * i + 1] / sc]);
  if (n < 8) return P;
  const w = [1, 2, 3, 2, 1], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  // vertices on long straight runs (the frame edges, corners of the layer box) stay put: only the dense, traced parts move
  return P.map((p, i) => {
    for (let k = -2; k < 2; k++) if (d(P[(i + k + n) % n], P[(i + k + 1 + n) % n]) > 12) return p;
    let x = 0, y = 0; for (let k = -2; k <= 2; k++) { const q = P[(i + k + n) % n]; x += w[k + 2] * q[0]; y += w[k + 2] * q[1]; } return [x / 9, y / 9];
  });
}
function pathPts(g, P) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }

export function paintDesigner() {
  const B = DES_BOX, S = DES_SC;
  const c = canvas((B.x1 - B.x0) * S, (B.y1 - B.y0) * S), g = c.getContext("2d");
  g.scale(S, S); g.translate(-B.x0, -B.y0);
  g.lineJoin = "round"; g.lineCap = "round";
  const SO = DES_OUTLINE.map((o) => smoothPts(dec(o), 4));
  const outline = (h) => { for (const P of SO) pathPts(h, P); };
  paintLayers(g, S, c.width, c.height, outline, DES2_REGIONS, DES2_INK, poly2, () => {
    g.beginPath(); outline(g); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  });
  // (end-s27-fix1) under the beanie's right brim the traced outline had taken in a piece of the background (a pale box
  // with a dark outline and loose strands, a "tag" by his face, 121.4–127.6). Cut back to the source's edges at 125.0 (the
  // brim's lower edge, the hanging hair, the sleeve's outline), then the brim line and two hair strands redrawn
  g.save(); g.globalCompositeOperation = "destination-out"; g.beginPath();
  [[1058, 405], [1049, 434], [1041, 451], [1031, 464], [1019, 479], [1007, 491], [993, 503], [983, 509], [984, 540], [996, 552], [1004, 561],
    [1010, 570], [1015, 580], [1019, 590], [1023, 600], [1028, 610], [1032, 620], [1034, 632], [1036, 645], [1130, 645], [1130, 380], [1062, 380]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath(); g.fillStyle = "#000"; g.fill(); g.restore();
  const line = (pts, w) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); };
  line([[1059, 400], [1055, 420], [1049, 434], [1041, 451], [1031, 464], [1019, 479], [1007, 491], [993, 503], [981, 510]], 3.4);
  line([[980, 512], [990, 526], [1000, 540], [1011, 556]], 1.6);
  line([[982, 528], [990, 541], [997, 556]], 1.3);
  return c;
}

// a designer key view (traced at time tk in that frame's coordinates): regions, ink, outline keyline
export const DKEY_BOX = { x0: -20, y0: -20, x1: 1560, y1: 966 };
// keyline: false paints the key without its outer keyline (drawn only by the nearer of two cross-fading views, s27.js)
export function paintDesignerKey(REG, INK_, OUT, noLine = null, keyline = true) {
  const B = DKEY_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0); g.lineJoin = "round"; g.lineCap = "round";
  const SO = smoothPts(dec(OUT), 2);
  const outline = (h) => pathPts(h, SO);
  paintLayers(g, 1, c.width, c.height, outline, REG, INK_, poly2, keyline ? () => {
    // noLine: zones (frame px of the key) where the outline runs over the desk below his hem (the key took in a piece of
    // desk) and is not stroked: stroked, it drew dark "cracks" across the desk as the view moved (129.12–129.28)
    g.save();
    if (noLine) { g.beginPath(); g.rect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0); for (const z of noLine) { g.moveTo(z[0][0], z[0][1]); for (const q of z.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); } g.clip("evenodd"); }
    g.beginPath(); outline(g); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
    g.restore();
  } : null);
  return c;
}
