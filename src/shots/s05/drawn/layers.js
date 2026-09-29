// s05 drawn layers: each painted once into its own canvas in the settled frame's coordinates (frame px at rest,
// 23.52–26.72) and cached. Back to front: room | desk (desk top, laptop, cables, left speaker; the screen is drawn over
// it) | lh | rh + arm (pose A) or rhB + armB (pose B) | fig (hair, beanie, face, back, chair) | pencil | lips | owl.
// Each layer runs on under the layers in front of it where the camera settle can uncover it.
import { paintRoom } from "./room.js";
import { paintDesk } from "./desk.js";
import { paintFigure, paintPencil, paintLips } from "./figure.js";
import { paintOwl } from "./owl.js";
import { paintLeftHand, paintRightHand, paintArm } from "./hands.js";
import { toneLayer } from "./tone.js";
import { blurCanvas, freeScratch } from "./kit.js";

// [x0, y0, x1, y1] frame px (settled), the painter, the final softening (px, exact gaussian)
const DEFS = {
  room: { box: [-130, -130, 2420, 1100], paint: paintRoom, soft: 0.7 },
  desk: { box: [-130, 60, 1810, 1090], paint: paintDesk, soft: 0.6 },
  lh: { box: [470, 560, 1130, 1000], paint: paintLeftHand, soft: 0.55 },
  rh: { box: [780, 560, 1300, 820], paint: (g) => paintRightHand(g, "A"), soft: 0.55 },
  rhB: { box: [780, 560, 1300, 820], paint: (g) => paintRightHand(g, "B"), soft: 0.55 },
  arm: { box: [1100, 560, 1660, 880], paint: (g) => paintArm(g, "A"), soft: 0.55 },
  armB: { box: [1100, 560, 1660, 880], paint: (g) => paintArm(g, "B"), soft: 0.55 },
  fig: { box: [700, -130, 2340, 1090], paint: paintFigure, soft: 0.55 },
  pencil: { box: [1130, 380, 1420, 500], paint: paintPencil, soft: 0.5 },
  lips: { box: [1340, 385, 1405, 440], paint: paintLips, soft: 0.5 },
  owl: { box: [1300, 120, 1900, 840], paint: paintOwl, soft: 0.5 },
};
export const LAYER_BOX = Object.fromEntries(Object.entries(DEFS).map(([k, v]) => [k, v.box]));

// Purity: kit.js's scratch canvases are reused (grown, never shrunk), and blurDraw's reduced-resolution blurs (blur
// > 5 px: lh, rh/arm, owl) are drawn back scaled up from a sub-rectangle of one, so their edges sample a pixel or two of
// whatever an earlier drawing left beside that rectangle. A layer's pixels therefore depended on which layers had been
// built before it since the page loaded (lh and owl differed between a first build and a rebuild). All layers are now
// built together from fresh scratch canvases, in the order the published render first built them (the first frame
// draws room, desk, lh, rhB, armB, fig, pencil, lips, owl; rh and arm followed at 23.60), which keeps its pixels.
const ORDER = ["room", "desk", "lh", "rhB", "armB", "fig", "pencil", "lips", "owl", "rh", "arm"];
let CACHE = {};
export function layer(name) {
  if (!CACHE[name]) { CACHE = {}; freeScratch(); for (const n of ORDER) CACHE[n] = build(n); freeScratch(); }
  return CACHE[name];
}
function build(name) {
  const D = DEFS[name], [x0, y0, x1, y1] = D.box, w = x1 - x0, h = y1 - y0;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.translate(-x0, -y0);
  D.paint(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  toneLayer(name, c, x0, y0);
  if (D.soft) blurCanvas(c, D.soft);
  return { c, x: x0, y: y0, w, h };
}
export function releaseLayers() { CACHE = {}; freeScratch(); }
