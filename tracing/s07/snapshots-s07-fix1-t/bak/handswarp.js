// s07 hands: the traced base frame (data/hands.js) warped per source frame by the measured backward flow
// (out(p) = base(p + flow_f(p)), flow bilinear on the GRID lattice, base sampled bilinearly), drawn through the
// feathered moving-region mask. The frames listed in OWN (the first frame after the cut, whose right hand is in a pose
// the flow cannot reach) are drawn from their own traced layer (B1_*), unwarped, through their own mask.
// Pure function of the frame index; the last frame is cached.
import * as HD from "./data/hands.js";
import { paintTraced, decode, canvas, ctx2d } from "./tracekit.js";
import { QUAD } from "./screen.js";
import { KEY_FIELD as KEYS, lightMask } from "./keys.js";
import { skinHatch } from "./hatch.js";

const [BX0, BY0, BX1, BY1] = HD.BOX, BW = BX1 - BX0, BH = BY1 - BY0;

function featherMask(MASK) {
  const mk = decode(MASK);
  const P = canvas(BW, BH), pg = ctx2d(P);
  pg.fillStyle = "#fff";
  for (let i = 0; i < mk.length;) {
    const n = mk[i++]; pg.beginPath();
    for (let k = 0; k < n; k++) { const x = mk[i + 2 * k] - BX0, y = mk[i + 2 * k + 1] - BY0; if (k) pg.lineTo(x, y); else pg.moveTo(x, y); }
    pg.closePath(); pg.fill(); i += 2 * n;
  }
  const M = canvas(BW, BH), mg = ctx2d(M);
  mg.filter = "blur(6px)"; mg.drawImage(P, 0, 0); mg.filter = "none";
  return M;
}

// Inside the key field, wherever the traced hand layer is not skin, the plate's keyboard (redrawn crisp by keys.js)
// replaces the hand layer's coarser 152-zone trace, whose caps read melted (fix pass 3). Skin = the layer's own light
// mass (keys.js lightMask: luminance blurred 3.5 px above ~0.52 - caps with their 1-2 px light gaps blur to ~0.25,
// fingers and palms stay above 0.6 - grown 2 px and feathered).
function platedKeys(layer, plate) {
  if (!plate) return layer;
  const P = canvas(BW, BH), pg = ctx2d(P);
  pg.drawImage(plate, BX0, BY0, BW, BH, 0, 0, BW, BH);
  pg.globalCompositeOperation = "destination-out"; pg.drawImage(lightMask(layer, 0, 0, BW, BH), 0, 0); pg.globalCompositeOperation = "source-over";
  const g = ctx2d(layer);
  g.save();
  g.beginPath(); KEYS.forEach(([x, y], i) => (i ? g.lineTo(x - BX0, y - BY0) : g.moveTo(x - BX0, y - BY0))); g.closePath(); g.clip();
  g.drawImage(P, 0, 0);
  g.restore();
  return layer;
}

// Fix pass 3 on the traced hand lines: FINE 637 is a stray straight dark stroke across the left ring and pinky fingers
// (644,753)-(650,717), absent in the source; contour runs broken by the tracer are re-joined across gaps < 6 px.
const DROP = new Set([637]), DROP1 = new Set(), BRIDGE = { gap: 6, vmax: 0.45, cos: 0.8 };
let st = null, own = null;
// The skin's grey value zones become hatching (hatch.js skinHatch): inside the moving region's light mass, the
// layer's own tone is flattened and drawn back as short dark strokes along the form (fix pass 3).
// Applied to the blurred tone before the traced ink strokes go on, so the tendons, folds and contours stay.
const hatched = (MASK) => (layer) => {
  const sk = lightMask(layer, 0, 0, BW, BH), g = ctx2d(sk);
  g.globalCompositeOperation = "destination-in"; g.drawImage(featherMask(MASK), 0, 0); g.globalCompositeOperation = "source-over";
  skinHatch(layer, sk, BX0, BY0, HATCH);
};
const HATCH = { light: 0.955, ink: 0.4, pitch: 3.4, len: 7, lo: 0.46, def: 0.95, seed: 11, gain: 1.05 };   // gain: tone-neutral (blurred mean unchanged within 0.1 over the box; swept 0.8-1.6)
function build(plate) {
  const layer = platedKeys(paintTraced(HD, BW, BH, { x0: BX0, y0: BY0, fineDrop: DROP, bridge: BRIDGE, beforeFine: hatched(HD.MASK) }), plate);
  const src = ctx2d(layer).getImageData(0, 0, BW, BH).data;
  const M = featherMask(HD.MASK);
  const ma = ctx2d(M).getImageData(0, 0, BW, BH).data;
  const idx = [];
  for (let i = 0; i < BW * BH; i++) if (ma[4 * i + 3] > 0) idx.push(i);
  st = { src, M, idx: Int32Array.from(idx), flow: decode(HD.FLOW), out: canvas(BW, BH), last: -1 };
}
function buildOwn(plate) {
  const D = { BLUR: HD.BLUR };
  for (const k of ["ZN", "ZP", "ZC", "BROAD", "SHAPES", "FINE", "CORR", "TEX"]) if (HD["B1_" + k]) D[k] = HD["B1_" + k];
  const layer = platedKeys(paintTraced(D, BW, BH, { x0: BX0, y0: BY0, fineDrop: DROP1, bridge: BRIDGE, beforeFine: hatched(HD.MASK1) }), plate);
  const c = canvas(BW, BH), g = ctx2d(c);
  g.drawImage(layer, 0, 0);
  g.globalCompositeOperation = "destination-in"; g.drawImage(featherMask(HD.MASK1), 0, 0);
  // the first frame's own trace reaches up onto the laptop screen (its box starts at y 470): cut the screen quad
  // (grown 2 px) out of it, so the colour page shows through and no grey trace of the screen lands on the cut frame
  g.globalCompositeOperation = "destination-out";
  g.beginPath(); QUAD.forEach(([x, y], i) => (i ? g.lineTo(x - BX0, y - BY0) : g.moveTo(x - BX0, y - BY0))); g.closePath();
  g.fillStyle = "#000"; g.fill(); g.lineWidth = 4; g.lineJoin = "round"; g.strokeStyle = "#000"; g.stroke();
  g.globalCompositeOperation = "source-over";
  own = c;
}

// plate: the static plate canvas (frame size), whose keyboard shows through between the fingers.
export function handsAt(f, plate = null) {
  f = Math.max(0, Math.min(HD.NF - 1, f));
  if (HD.OWN && HD.OWN.includes(f) && HD.B1_ZN) {
    if (!own) buildOwn(plate);
    return { canvas: own, x: BX0, y: BY0 };
  }
  if (!st) build(plate);
  if (st.last !== f) {
    const { src, idx, flow } = st, w = BW, h = BH, G = HD.GRID, GW = HD.GW, GH = HD.GH, base = f * GH * GW * 2;
    const g = ctx2d(st.out);
    const im = g.createImageData(w, h), d = im.data;
    for (let n = 0; n < idx.length; n++) {
      const i = idx[n], x = i % w, y = (i - x) / w;
      const gx = x / G, gy = y / G;
      let ix = Math.floor(gx), iy = Math.floor(gy);
      if (ix > GW - 2) ix = GW - 2; if (iy > GH - 2) iy = GH - 2;
      const ax = gx - ix, ay = gy - iy;
      const o00 = base + (iy * GW + ix) * 2, o10 = o00 + 2, o01 = o00 + GW * 2, o11 = o01 + 2;
      const fx = ((flow[o00] * (1 - ax) + flow[o10] * ax) * (1 - ay) + (flow[o01] * (1 - ax) + flow[o11] * ax) * ay) / 4;
      const fy = ((flow[o00 + 1] * (1 - ax) + flow[o10 + 1] * ax) * (1 - ay) + (flow[o01 + 1] * (1 - ax) + flow[o11 + 1] * ax) * ay) / 4;
      let sx = x + fx, sy = y + fy;
      if (sx < 0) sx = 0; if (sy < 0) sy = 0; if (sx > w - 1.001) sx = w - 1.001; if (sy > h - 1.001) sy = h - 1.001;
      const jx = Math.floor(sx), jy = Math.floor(sy), bx = sx - jx, by = sy - jy;
      const p00 = (jy * w + jx) * 4, p10 = p00 + 4, p01 = p00 + w * 4, p11 = p01 + 4;
      const q = i * 4;
      for (let c = 0; c < 3; c++) d[q + c] = (src[p00 + c] * (1 - bx) + src[p10 + c] * bx) * (1 - by) + (src[p01 + c] * (1 - bx) + src[p11 + c] * bx) * by;
      d[q + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.drawImage(st.M, 0, 0); g.globalCompositeOperation = "source-over";
    st.last = f;
  }
  return { canvas: st.out, x: BX0, y: BY0 };
}
export function releaseHands() { st = null; own = null; }
