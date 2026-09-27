// s06 hoodie, traced version: the silhouettes from body.js filled with the cloth's ground, then the measured wash and
// ink strokes (data/body.js).
import { drawInk, drawMasses, clipMasses } from "./ink.js";
import { INK, MASS } from "./data/body.js";
import { SLEEVE_L, SHOULDER_R } from "./body.js";
import { poly, gv } from "./kit.js";

export const BODYCAL = { base: 0.93, wash: 3, soft: 0.6 };
export function drawBodyT(g) {
  // the measured lit silhouette (crisp), then the soft ground value study inside it, then the ink
  drawMasses(g, MASS.sil.map(([v, ...r]) => [BODYCAL.base, ...r]), { blur: 0.5 });
  g.save(); clipMasses(g, MASS.sil);
  drawMasses(g, MASS.wash, { blur: 2 });
  g.restore();
  drawInk(g, INK, { end: 7, endMin: 0.12, soft: BODYCAL.soft });
}

// the fist: skin, the measured wash and ink (data/hand.js); the contour strokes run along the silhouette, so the ink
// is not clipped to it
import { INK as HAND_INK, MASS as HAND_MASS } from "./data/hand.js";
import { HAND } from "./head.js";
import { SKIN } from "./face.js";
import { smoothPath } from "../../lib/paths.js";
export function drawHandT(g) {
  g.fillStyle = SKIN; g.beginPath(); smoothPath(g, HAND, true); g.fill();
  g.save(); g.beginPath(); smoothPath(g, HAND, true); g.clip();
  drawMasses(g, HAND_MASS.wash, { blur: 3 });
  g.restore();
  drawInk(g, HAND_INK, { end: 7, endMin: 0.12, soft: 0.6 });
}

// the beanie: a mid-grey knit, the measured wash and ink (data/beanie.js) inside the silhouette from head.js
import { INK as BEANIE_INK, MASS as BEANIE_MASS } from "./data/beanie.js";
import { BEANIE } from "./head.js";
export const BEANIECAL = { base: 0.72 };
export function drawBeanieT(g) {
  // no base fill: the value study paints everything above the darkest level; below it the hair shows through
  g.save(); g.beginPath(); poly(BEANIE)(g); g.clip();
  drawMasses(g, BEANIE_MASS.wash, { blur: 0.5 });
  drawInk(g, BEANIE_INK, { end: 5, endMin: 0.15 });
  g.restore();
}

// the room: near-black, the measured bright structures (nested levels, painted dark to light) and pale strokes
// (data/room.js)
import { LIGHT as ROOM_LIGHT, MASS as ROOM_MASS, DOTS as ROOM_DOTS } from "./data/room.js";
export const ROOMCAL = { base: 0.03, dot: 1.0 };
// the grille mesh: each measured dot as a small soft-cornered mark in its measured value
function drawDots(g, D) {
  for (let i = 0; i < D.length; i += 7) {
    const x = D[i], y = D[i + 1], L = Math.max(1.2, D[i + 2]), w = Math.max(1.1, D[i + 3]), a = D[i + 4];
    const v = Math.max(0, Math.min(1, D[i + 6] + (D[i + 5] - D[i + 6]) * ROOMCAL.dot)), c = Math.round(v * 255);
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgb(${c},${c},${c})`;
    g.beginPath(); g.roundRect(-L / 2, -w / 2, L, w, Math.min(L, w) * 0.3); g.fill(); g.restore();
  }
}
export function drawRoomT(g) {
  g.fillStyle = gv(ROOMCAL.base); g.fillRect(0, 0, 2206, 946);
  drawMasses(g, ROOM_MASS.room, { blur: 0.5 });
  drawMasses(g, ROOM_MASS.meshbase, { blur: 1 });
  drawInk(g, ROOM_LIGHT, { bright: true, end: 4, endMin: 0.2, wMin: 0.5, soft: 0.5 });
  drawDots(g, ROOM_DOTS);
}

// in front: the laptop lid and the pencil, measured value studies (data/front.js)
import { MASS as FRONT } from "./data/front.js";
export function drawLaptopT(g) { drawMasses(g, FRONT.laptop, { blur: 0.4 }); }
export function drawPencilT(g) { drawMasses(g, FRONT.pencil, { blur: 0.4 }); }

// the tone correction (data/resid.js): soft black / white veils, their opacity measured by comparing renders with the
// source (blurred); drawn last in the cached front layer, so it lies over everything but the owl
import { DARK as RES_DARK, LIGHT as RES_LIGHT } from "./data/resid.js";
import * as RES_SMILE from "./data/resid_smile.js";
import * as RES_BROW from "./data/resid_brow.js";
import * as RES_OWL from "./data/resid_owl.js";
// the same for the smile / brow-rise state: a delta veil faded in with the measured motion (k = 0..1)
const VBOX = { smile: [720, 380, 1400, 846], brow: [720, 60, 1400, 420], owl: [1470, 90, 1890, 645] };   // the delta veils' boxes + margin
const VCACHE = {};
export function releaseVeils() { for (const k in VCACHE) delete VCACHE[k]; }
export function drawResidState(g, which, k) {
  if (k <= 0.01) return;
  const [x0, y0, x1, y1] = VBOX[which];
  if (!VCACHE[which]) {   // drawn once into a box-sized canvas, then faded in per frame
    const c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
    const o = c.getContext("2d"); o.translate(-x0, -y0);
    const R = which === "smile" ? RES_SMILE : which === "owl" ? RES_OWL : RES_BROW;
    drawResid(o, R.DARK, R.LIGHT);
    VCACHE[which] = c;
  }
  g.save(); g.globalAlpha = Math.min(1, k); g.drawImage(VCACHE[which], x0, y0); g.restore();
}
// fix pass: the base veil was fitted to the round-2 drawing; it is left out where that drawing has been replaced
// (VEIL_OUT polygons, feathered 6 px), so those regions carry their own tone
export const VEIL_OUT = [];
export function drawResid(g, DARK = RES_DARK, LIGHT = RES_LIGHT, out = null) {
  if (out && out.length) {
    const c = document.createElement("canvas"); c.width = 2206; c.height = 946;
    const o = c.getContext("2d");
    drawResid(o, DARK, LIGHT, null);
    o.save(); o.globalCompositeOperation = "destination-out"; o.filter = "blur(6px)"; o.fillStyle = "#000";
    for (const P of out) { o.beginPath(); P.forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y))); o.closePath(); o.fill(); }
    o.restore();
    g.drawImage(c, 0, 0);
    return;
  }
  g.save(); g.filter = "blur(5px)";
  for (const [items, c] of [[DARK, "0,0,0"], [LIGHT, "255,255,255"]]) for (const [a, ...rings] of items) {
    g.beginPath();
    for (const r of rings) { for (let i = 0; i < r.length; i += 2) (i ? g.lineTo(r[i], r[i + 1]) : g.moveTo(r[i], r[i + 1])); g.closePath(); }
    g.fillStyle = `rgba(${c},${a})`; g.fill("evenodd");
  }
  g.restore();
}
