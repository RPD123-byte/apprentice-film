// s05's drawing as depth layers (settled frame coordinates), each built once from its measured ink data
// (./data/<name>.js, see ./ink.js and trace/README.md) and cached. Back to front:
//   room (boxes, speakers, shelving; reaches past the frame for the camera settle) | desk (desk, laptop, cables, the
//   left speaker; the screen is drawn over it) | lh | rh (the right hand) | arm (his right forearm) | fig (the designer:
//   beanie, hair, face, pencil, back, left sleeve, chair) | owl (with its headphones). The right hand and forearm have a
//   second drawing (rhB, armB: pose B, held 25.48-26.68 and through most of the shot; rh/arm are pose A), and so does
//   the owl (owlD: its head at the bottom of the dip, 26.00-26.08)
// Each layer also runs on under the layers in front of it (value study filled in from its visible part; under the
// sliding right hand the desk is traced from the frame at 24.24 s, where the hand is 68 px to the right).
import { buildInkLayer, cutLayer, decodeRings } from "./ink.js";
import { armBKeep, armBUnder, armBCut, deskUnder } from "./armfix.js";
import { fillUnderHand } from "./kbfill.js";
import * as room from "./data/room.js";
import * as desk from "./data/desk.js";
import * as lh from "./data/lh.js";
import * as rh from "./data/rh.js";
import * as rhB from "./data/rhB.js";
import * as arm from "./data/arm.js";
import * as armB from "./data/armB.js";
import * as fig from "./data/fig.js";
import * as owl from "./data/owl.js";
import * as owlD from "./data/owlD.js";
import * as figA from "./data/figA.js";
import * as owlA from "./data/owlA.js";
import * as deskA from "./data/deskA.js";
import * as key578 from "./data/key578.js";
import * as key579 from "./data/key579.js";
import * as key580 from "./data/key580.js";
import * as key581 from "./data/key581.js";
import * as key582 from "./data/key582.js";
import * as key583 from "./data/key583.js";
import * as key584 from "./data/key584.js";
import * as key585 from "./data/key585.js";
import * as key586 from "./data/key586.js";
import * as key587 from "./data/key587.js";

// (pass 3) figA / owlA / deskA: the designer, the owl and the desk's left part as the source's first clip draws them (23.12-24.00; the source
// dissolves into its second clip, whose drawing fig / owl are, at 24.00-24.12): trace/build_clipA.py
// (pass 3) key<k>: the whole frame k traced on its own (flattened; the screen left out), for the settle's fastest frames
// (trace/build_keys.py)
export const KEYS = [578, 579, 580, 581, 582, 583, 584, 585, 586, 587];
export const DATA = { room, desk, lh, rh, rhB, arm, armB, fig, owl, owlD, figA, owlA, deskA, deskK: desk, deskAK: deskA, key578, key579, key580, key581, key582, key583, key584, key585, key586, key587 };
export const ORDER = ["room", "desk", "lh", "rh", "arm", "fig", "owl"];     // (+ rhB, armB: the hand's second drawing)
// value-study softening and final softening (as fitted in trace/). The layers are drawn neutral grey: s05.js lays the
// source's measured, time-varying ink tint over the whole frame (it changes when Pure Imagination comes up, 24.00-24.16)
export const NEUTRAL = { r: [1, 0], g: [1, 0], b: [1, 0] };
export const INK_OPTS = { blur: 1.6, soft: 0.5, tint: NEUTRAL };

let CACHE = {}, UNCUT = {}, GROWN = {};
// parts the layer masks gave the wrong layer (frame px, settled): the sliver of desk between his jaw and the owl's left
// side went to the figure, so at 23.12-23.24, when the figure and the owl move apart, it showed as a broken piece of desk
// riding on the figure (the source shows the desk there)
const CUT_FIG = [[[1418, 553], [1470, 553], [1490, 570], [1506, 592], [1513, 607], [1418, 607]]];
const CUT_OUT = { fig: CUT_FIG, figA: CUT_FIG };
// per-layer extras (s05/armfix.js: the pose-B forearm past the torso's edge)
const EXTRA = { armB: () => ({ keep: armBKeep(armB, fig), under: armBUnder(armB, fig) }), desk: () => ({ under: deskUnder(desk, owl) }), deskA: () => ({ under: deskUnder(deskA, owl) }) };
// the characters are drawn a little crisper than the traced fit's softening (their linework measured 10-25 % softer
// than the source's in high-pass detail)
export const CHAR_OPTS = { blur: 1.0, soft: 0.25 };
const CHAR = new Set(["lh", "rh", "rhB", "arm", "armB", "fig", "owl", "owlD", "figA", "owlA"]);
// (pass 3) deskK: the desk with its hidden part under the left hand re-drawn from its own keyboard (s05/kbfill.js),
// for the camera settle (and s04's tail), where the hand slides over the keys; at rest the plain desk layer stays under
// the hand (its smooth fill there suits the hand's soft edges and the gaps between the fingers)
const copyOf = (l) => { const c = document.createElement("canvas"); c.width = l.c.width; c.height = l.c.height; c.getContext("2d").drawImage(l.c, 0, 0); return { ...l, c }; };
const KB = { deskK: "desk", deskAK: "deskA" };
const uncut = (name) => UNCUT[name] || (UNCUT[name] = KB[name] ? fillUnderHand(copyOf(uncut(KB[name])), lh) : buildInkLayer(DATA[name], { ...INK_OPTS, ...(CHAR.has(name) ? CHAR_OPTS : {}), cut: false, ...(EXTRA[name] ? EXTRA[name]() : {}) }));
// the layer canvas { c, x, y, w, h } (frame px of its top-left corner), cut to its outline
let KEY_LRU = [];
export function inkLayer(name) {
  if (!CACHE[name] && name.startsWith("key")) {
    // a key frame: one full-frame drawing, built cut (its outline is the frame); at most 4 kept (renders walk forward)
    CACHE[name] = buildInkLayer(DATA[name], INK_OPTS);
    KEY_LRU.push(name);
    while (KEY_LRU.length > 4) delete CACHE[KEY_LRU.shift()];
  }
  if (!CACHE[name]) {
    if (name === "armB") { const l = uncut(name), c = document.createElement("canvas"); c.width = l.c.width; c.height = l.c.height; c.getContext("2d").drawImage(l.c, 0, 0); CACHE[name] = { ...l, c: armBCut(c, armB) }; }
    else CACHE[name] = cutLayer(uncut(name), DATA[name], 0);
    if (CUT_OUT[name]) {
      const l = CACHE[name], g = l.c.getContext("2d");
      g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
      for (const P of CUT_OUT[name]) { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x - l.x, y - l.y) : g.moveTo(x - l.x, y - l.y))); g.closePath(); g.fill(); }
      g.restore();
    }
  }
  return CACHE[name];
}
// the layer's box [x0, y0, x1, y1] (frame px)
export const layerBox = (name) => DATA[name].box;
// the layer's outline as a path function in frame px (grow > 0: stroked wider, for masks that must cover the edge)
const RINGS = {};
export function outlinePath(name, shift = [0, 0]) {
  return (c) => {
    if (!RINGS[name]) { const [x0, y0] = DATA[name].box; RINGS[name] = decodeRings(DATA[name].alpha).map((r) => r.map(([x, y]) => [x + x0, y + y0])); }
    const [sx, sy] = shift;
    for (const r of RINGS[name]) { c.moveTo(r[0][0] + sx, r[0][1] + sy); for (let k = 1; k < r.length; k++) c.lineTo(r[k][0] + sx, r[k][1] + sy); c.closePath(); }
  };
}
// paint the layer into a Plate's overlay (for s04's tail, which builds s05's layers as engraving plates): the plate's
// own value map stays black and its mask is this layer's outline
// (its mask is grown 1.5 px, so this copy is cut 2.5 px wider than the outline)
// shift: where s04's tail must paint the drawing so that, moved the way s04 moves that plate, it lands where s05 draws it
// at 23.12 (the hands ride s04's desk/figure plates there, but move on their own in the source)
export function paintInto(P, name, shift = [0, 0]) {
  const l = GROWN[name] || (GROWN[name] = cutLayer(uncut(name), DATA[name], 2.5));
  P.o.drawImage(l.c, l.x + shift[0], l.y + shift[1]);
}
export function releaseLayers() { CACHE = {}; UNCUT = {}; GROWN = {}; PENCIL = {}; KEY_LRU = []; }

// The pencil between his teeth as its own rigid piece (for the camera settle, where the figure's motion grid would bend
// it): PENCIL_POLY is its outline in the settled frame (frame px; it stops short of his lips, which stay on the figure).
// pencilParts() -> { fig: the figure without the pencil, pencil: the pencil alone }, both { c, x, y, w, h } like the
// figure layer.
export const PENCIL_POLY = [[1154, 480], [1195, 452], [1368, 402], [1372, 418], [1207, 479], [1165, 487]];
let PENCIL = {};
export function pencilParts(name = "fig") {
  if (PENCIL[name]) return PENCIL[name];
  const f = inkLayer(name);
  const part = (op, grow) => {
    const c = document.createElement("canvas"); c.width = f.c.width; c.height = f.c.height;
    const g = c.getContext("2d"); g.drawImage(f.c, 0, 0);
    const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
    const q = m.getContext("2d"); q.fillStyle = "#000"; q.strokeStyle = "#000"; q.lineWidth = 2 * grow; q.lineJoin = "round";
    q.beginPath(); PENCIL_POLY.forEach(([x, y], i) => (i ? q.lineTo(x - f.x, y - f.y) : q.moveTo(x - f.x, y - f.y))); q.closePath(); q.fill(); q.stroke();
    g.globalCompositeOperation = op; g.drawImage(m, 0, 0);
    return { ...f, c };
  };
  PENCIL[name] = { fig: part("destination-out", 2.5), pencil: part("destination-in", 1.2) };
  return PENCIL[name];
}
