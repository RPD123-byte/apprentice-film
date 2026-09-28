// The tail of the arc (22.64–23.12) drawn with s05's own layers, so the picture runs on into s05 at 23.12 with only
// camera motion. s05 paints the over-the-shoulder view as flat layers in its settled frame and moves each layer by
// a decaying similarity from 23.12 on; the source before 23.12 moves the same drawings the same way (SIFT per layer
// against the 23.12 source frame: residuals ~1 px from 22.64 for the figure, from 22.84 for the room and desk —
// snapshots/s04-fix1-study/layertrack.py). Each layer here = measured similarity(t) ∘ s05's own 23.12 placement.
// s05's painters are imported as namespaces and checked, so a change to their exports cannot break s04's loading.
import { W, H } from "../../config.js";
import { Plate } from "../../lib/engrave.js";
import * as SITES from "../../lib/sites.js";
import * as R5 from "../s05/room.js";
import * as D5 from "../s05/desk.js";
import * as F5 from "../s05/figure.js";
import * as HA5 from "../s05/hands.js";
import * as O5 from "../s05/owl.js";
import * as S5 from "../s05/screen.js";
import * as K5 from "../s05/kit.js";

// s05's settle at 23.12 (u = 1): [scale-1, rotation (deg), dx, dy, cx, cy] — copied from src/shots/s05.js SETTLE
const SETTLE = {
  room: [0.0459, -1.30, -163.0, 51.1, 600, 300],
  desk: [0.0639, -2.99, -111.5, 74.9, 700, 650],
  fig: [0.0403, -0.65, 18.1, 26.2, 1650, 500],
  owl: [0.0182, -1.58, 47.9, 23.9, 1580, 440],
};
const HAND0 = [35.0, -13.7];      // s05 HAND_R before 23.56 (held)
// measured motion of each layer before 23.12, as where its centre C goes: [t, dx, dy, scale, rot (deg)] — SIFT on the
// layer's region chained frame to frame back from the 23.12 source frame (snapshots/s04-fix1-study/chain.py);
// `body` is the figure below the neck (its head is redrawn while the camera turns, so it gets its own track)
const MOVE = {
  room: { C: [800, 250], k: [[22.6, -173, 93, 1.348, -1.97], [22.64, -161, 84, 1.318, -1.69], [22.68, -150, 82, 1.295, -1.91], [22.72, -134, 72, 1.259, -1.7], [22.76, -117, 72, 1.229, -2.24],
    [22.8, -104, 61, 1.2, -1.78], [22.84, -86, 53, 1.166, -1.69], [22.88, -74, 40, 1.138, -1.09], [22.92, -59, 36, 1.112, -1.23], [22.96, -44, 23, 1.079, -0.68], [23.0, -26, 14, 1.047, -0.49],
    [23.04, -15, 6, 1.027, -0.15], [23.08, -15, 7, 1.027, -0.16], [23.12, 0, 0, 1, 0]] },
  desk: { C: [650, 550], k: [[22.6, -406, 221, 1.141, -5.96], [22.64, -368, 195, 1.128, -5.22], [22.68, -326, 173, 1.118, -5.19], [22.72, -291, 151, 1.094, -4.11], [22.76, -262, 131, 1.07, -3.09],
    [22.8, -221, 111, 1.07, -2.96], [22.84, -193, 95, 1.046, -2.28], [22.88, -159, 78, 1.045, -1.99], [22.92, -129, 63, 1.04, -1.66], [22.96, -66, 33, 1.037, -1.4], [23.0, -45, 21, 1.018, -0.93],
    [23.04, -22, 9, 1.007, -0.46], [23.08, -22, 9, 1.007, -0.46], [23.12, 0, 0, 1, 0]] },
  fig: { C: [1800, 450], k: [[22.6, 111, 39, 1.116, -0.05], [22.64, 99, 33, 1.098, -0.16], [22.68, 88, 26, 1.079, -0.53], [22.72, 77, 25, 1.075, -0.39], [22.76, 67, 19, 1.055, -0.81],
    [22.8, 57, 15, 1.043, -0.73], [22.84, 47, 14, 1.039, -0.56], [22.88, 39, 12, 1.034, -0.56], [22.92, 32, 11, 1.028, -0.46], [22.96, 16, 6, 1.014, -0.1], [23.0, 10, 4, 1.009, -0.12],
    [23.04, 4, 1, 1.004, -0.03], [23.08, 4, 1, 1.004, -0.03], [23.12, 0, 0, 1, 0]] },
  body: { C: [1900, 700], k: [[22.6, 195, 51, 1.141, -6.58], [22.64, 164, 23, 1.064, -8.77], [22.68, 153, 21, 1.043, -8.15], [22.72, 127, 21, 1.042, -6.93], [22.76, 101, 21, 1.04, -5.9],
    [22.8, 76, 18, 1.021, -5.04], [22.84, 52, 16, 1.001, -4.5], [22.88, 45, 12, 0.992, -4.13], [22.92, 37, 10, 0.99, -3.36], [22.96, 21, 4, 0.985, -2.24], [23.0, 13, 4, 0.995, -1.39],
    [23.04, 6, 1, 0.997, -0.65], [23.08, 6, 1, 0.997, -0.64], [23.12, 0, 0, 1, 0]] },
  owl: { C: [1650, 450], k: [[22.6, 270, 20, 1.079, -3.43], [22.64, 242, 20, 1.072, -2.92], [22.68, 215, 20, 1.064, -2.56], [22.72, 188, 20, 1.059, -2.44], [22.76, 162, 19, 1.057, -2.36],
    [22.8, 137, 16, 1.051, -2.28], [22.84, 115, 15, 1.043, -1.98], [22.88, 93, 13, 1.035, -1.69], [22.92, 74, 12, 1.028, -1.35], [22.96, 39, 7, 1.017, -0.97], [23.0, 25, 5, 1.01, -0.72],
    [23.04, 11, 2, 1.005, -0.28], [23.08, 11, 2, 1.005, -0.28], [23.12, 0, 0, 1, 0]] },
};
const tabv = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-9) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
function xf(ctx, name, t, settle = name) {
  const M = MOVE[name], [dx, dy, s, r] = tabv(M.k, t), [cx, cy] = M.C;
  ctx.translate(cx + dx, cy + dy); ctx.rotate((r * Math.PI) / 180); ctx.scale(s, s); ctx.translate(-cx, -cy);
  const [S, R, sx, sy, scx, scy] = SETTLE[settle];
  ctx.translate(scx + sx, scy + sy); ctx.rotate((R * Math.PI) / 180); ctx.scale(1 + S, 1 + S); ctx.translate(-scx, -scy);
}

const ok = () => typeof R5.paintRoom === "function" && typeof D5.paintDeskLayer === "function" && typeof F5.paintFigure === "function" &&
  typeof F5.paintArm === "function" && typeof HA5.paintLeftHand === "function" && typeof HA5.paintRightHand === "function" &&
  typeof O5.owlCanvases === "function" && typeof S5.drawScreen === "function" && typeof K5.maskOf === "function" && typeof K5.applyMask === "function";
let L = null;
function plateLayer(x, y, w, h, paint, seed, spacing = 4.6, mask = null) {
  const P = new Plate(w, h, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(-x, -y);
  paint(P);
  const c = P.engrave({ spacing, seed, contrast: 1.0 });
  if (mask) K5.applyMask(c, K5.maskOf(w, h, 1, mask, { ox: x, oy: y, grow: 1.5 }));
  return { c, x, y, w, h };
}
// the same layers s05 builds (src/shots/s05.js layers()), built lazily per part
function part(name) {
  if (!L) L = {};
  if (L[name]) return L[name];
  if (name === "room") L.room = plateLayer(-60, -80, W + 60 + 160, H + 80 + 40, R5.paintRoom, 7, 4.4);
  else if (name === "desk") L.desk = plateLayer(-60, 0, W + 60, H + 60, D5.paintDeskLayer, 11, 4.4, D5.DESK_MASK);
  else if (name === "fig") L.fig = plateLayer(760, -80, W - 760 + 160, H + 80 + 60, F5.paintFigure, 13, 4.2, F5.FIG_MASK);
  else if (name === "arm") L.arm = plateLayer(1140, 600, 460, 230, F5.paintArm, 23, 4.2, F5.ARM_MASK);
  else if (name === "lh") L.lh = plateLayer(...HA5.LHAND_BOX, HA5.paintLeftHand, 17, 4.2, HA5.LHAND_MASK);
  else if (name === "rh") L.rh = plateLayer(...HA5.RHAND_BOX, HA5.paintRightHand, 19, 4.2, HA5.RHAND_MASK);
  return L[name];
}
const blit = (ctx, l) => ctx.drawImage(l.c, l.x, l.y, l.w, l.h);

export const tailReady = () => ok();
// s05's figure below the neck (settled coordinates): the arm, the sleeve and the back of the t-shirt
const BODY05 = [[1100, 612], [1300, 616], [1500, 612], [1560, 626], [1620, 614], [1700, 584], [1760, 582], [1830, 552], [1875, 514], [1896, 466], [1950, 466], [2300, 440], [2300, 1200], [1100, 1200]];
// the complement of that region in frame coordinates at time t (to clip a head drawn over it)
export function aboveBody(ctx, t) {
  ctx.beginPath(); ctx.rect(-4000, -4000, 12000, 12000);
  ctx.save(); xf(ctx, "body", t, "fig");
  BODY05.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.restore();
  ctx.clip("evenodd");
}
// draw the parts of s05's picture at time t (< 23.12): room (alpha), desk group (laptop, screen, hands), figure, owl
export function drawTail(ctx, t, { room = 0, desk = false, fig = false, owl = false } = {}) {
  if (!ok()) return false;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";   // (bilinear: "high" resampling varied by a few levels between runs)
  if (room > 0.001) { ctx.save(); ctx.globalAlpha = room; xf(ctx, "room", t); blit(ctx, part("room")); ctx.restore(); }
  if (desk) {
    ctx.save(); xf(ctx, "desk", t);
    blit(ctx, part("desk"));
    S5.drawScreen(ctx, t, SITES, null);
    blit(ctx, part("lh"));
    ctx.save(); ctx.translate(HAND0[0], HAND0[1]); blit(ctx, part("rh")); ctx.restore();
    ctx.restore();
  }
  if (fig) {
    ctx.save(); if (fig === "body") xf(ctx, "body", t, "fig"); else xf(ctx, "fig", t);
    // 'body': only the shirt, back and arm (below the neck), for frames where the source's head is still redrawn
    if (fig === "body") { ctx.beginPath(); BODY05.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip(); }
    ctx.save(); ctx.translate(HAND0[0], HAND0[1]); blit(ctx, part("arm")); ctx.restore();
    blit(ctx, part("fig"));
    ctx.restore();
  }
  if (owl) {
    const oc = O5.owlCanvases(), [ox, oy, ow, oh] = O5.OWL_BOX;
    ctx.save(); xf(ctx, "owl", t); ctx.drawImage(oc.body, ox, oy, ow, oh); ctx.drawImage(oc.head, ox, oy, ow, oh); ctx.restore();
  }
  ctx.restore();
  return true;
}
// s05's screen-light gain on the desk side (its applyLight at 23.12: frame * (1 + A·w), w = 1 left of x 1250 falling
// to 0.2 beyond 1700, the screen itself left out)
const SCREEN_Q = [[315, 246], [834, 168], [898, 519], [409, 648]];
let GAIN = null, GMASK = null;
export function tailLight(ctx, t, A = 0.245 * 0.75) {
  const c = ctx.canvas;
  if (!GMASK) {
    GMASK = document.createElement("canvas"); GMASK.width = W; GMASK.height = 1;
    const m = GMASK.getContext("2d"), gr = m.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1250 / W, "rgba(0,0,0,1)"); gr.addColorStop(1700 / W, "rgba(0,0,0,0.2)"); gr.addColorStop(1, "rgba(0,0,0,0.2)");
    m.fillStyle = gr; m.fillRect(0, 0, W, 1);
  }
  if (!GAIN) { GAIN = document.createElement("canvas"); GAIN.width = W; GAIN.height = H; }
  const g = GAIN.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.globalAlpha = 1; g.drawImage(c, 0, 0);
  g.globalCompositeOperation = "destination-in"; g.globalAlpha = Math.min(1, A); g.drawImage(GMASK, 0, 0, W, H);
  g.globalCompositeOperation = "destination-out"; g.globalAlpha = 1;
  g.save(); xf(g, "desk", t); g.beginPath(); SCREEN_Q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.restore();
  g.fillStyle = "#000"; g.fill();
  g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(GAIN, 0, 0); ctx.restore();
}
export function releaseTail() { L = null; GAIN = null; GMASK = null; }
