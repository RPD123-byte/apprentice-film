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

export function paintDesigner() {
  const B = DES_BOX, S = DES_SC;
  const c = canvas((B.x1 - B.x0) * S, (B.y1 - B.y0) * S), g = c.getContext("2d");
  g.scale(S, S); g.translate(-B.x0, -B.y0);
  g.lineJoin = "round"; g.lineCap = "round";
  // base: the whole figure in the jacket's mid green, so no seam shows the room through
  g.beginPath(); for (const o of DES_OUTLINE) poly4(g, o); g.fillStyle = "#5f6658"; g.fill();
  g.save(); g.beginPath(); for (const o of DES_OUTLINE) poly4(g, o); g.clip();
  // colour regions (largest first); each also stroked in its own colour to close the seams between neighbours
  for (const r of DES2_REGIONS) {
    g.beginPath(); poly2(g, r[1]); for (let k = 2; k < r.length; k++) poly2(g, r[k]);
    g.fillStyle = r[0]; g.fill("evenodd"); g.lineWidth = 1.0; g.strokeStyle = r[0]; g.stroke();
  }
  // line art in its measured tones (black hair and outlines, brown modelling lines)
  for (const grp of DES2_INK) {
    g.beginPath(); for (let k = 1; k < grp.length; k++) for (const p of grp[k]) poly2(g, p);
    g.fillStyle = grp[0]; g.fill("evenodd");
  }
  g.restore();
  // outer keyline
  g.beginPath(); for (const o of DES_OUTLINE) poly4(g, o);
  g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  return c;
}

// a designer key view (traced at time tk in that frame's coordinates): regions, ink, outline keyline
export const DKEY_BOX = { x0: -20, y0: -20, x1: 1560, y1: 966 };
export function paintDesignerKey(REG, INK, OUT) {
  const B = DKEY_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0); g.lineJoin = "round"; g.lineCap = "round";
  g.beginPath(); poly2(g, OUT); g.fillStyle = "#5f6658"; g.fill();
  g.save(); g.beginPath(); poly2(g, OUT); g.clip();
  for (const r of REG) {
    g.beginPath(); poly2(g, r[1]); for (let k = 2; k < r.length; k++) poly2(g, r[k]);
    g.fillStyle = r[0]; g.fill("evenodd"); g.lineWidth = 1.0; g.strokeStyle = r[0]; g.stroke();
  }
  for (const grp of INK) { g.beginPath(); for (let k = 1; k < grp.length; k++) for (const p of grp[k]) poly2(g, p); g.fillStyle = grp[0]; g.fill("evenodd"); }
  g.restore();
  g.beginPath(); poly2(g, OUT); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
  return c;
}
