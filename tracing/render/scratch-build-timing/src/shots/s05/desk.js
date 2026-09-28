// s05 desk layer: the desk top with its grain, the cables, the laptop (lid, deck, keyboard, trackpad, ports).
// Painted on its own plate and masked, because during the camera settle it moves differently from the room.
// Edges of the laptop's front and the desk's front were measured as straight lines (Hough on the source frame):
// deck front y = 787 - 0.367(x - 905), laptop bottom y = 818 - 0.388(x - 915), desk front y = 853 - 0.414(x - 953).
import { INK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, grain, quadAt, along, clearO, inside, PI, sampleCurve } from "./kit.js";
import * as T from "./trace.js";

// ---------------------------------------------------------------- cables (dark tubes with a pale core)
export const CABLES = [
  // from the ports on the laptop's left side, looping down to the bottom edge
  [[445, 752], [400, 752], [360, 762], [325, 790], [305, 835], [298, 890], [296, 960]],
  [[478, 775], [445, 790], [420, 820], [405, 865], [402, 910], [408, 960]],
  [[515, 822], [480, 838], [455, 868], [445, 910], [450, 960]],
  // behind the lid on the left, looping back toward the speaker
  [[420, 700], [388, 690], [352, 668], [326, 640], [305, 612], [284, 596], [262, 596]],
  [[410, 712], [362, 712], [322, 702], [292, 694], [266, 706], [248, 740]],
  // long cable lying across the far left of the desk
  [[-60, 890], [40, 872], [140, 866], [210, 872], [258, 892], [282, 925], [292, 960]],
  [[-60, 935], [80, 912], [170, 908], [228, 925], [252, 960]],
  // behind the laptop on the right, a bundle to the centre speaker, and the long one under his arm
  [[918, 500], [960, 488], [1000, 494], [1040, 510], [1068, 528], [1086, 548], [1076, 566], [1040, 570], [1000, 562]],
  [[925, 520], [970, 510], [1020, 522], [1060, 540], [1110, 548], [1150, 545]],
  [[930, 540], [990, 548], [1050, 568], [1120, 578], [1190, 584], [1250, 596], [1300, 616], [1340, 634], [1390, 652]],
];

function cable(o, pts, w = 7, seed = 1) {
  const q = sampleCurve(pts, 8);
  taper(o, q, () => w + 1.6, "#060606");
  taper(o, q, () => w - 2.2, "rgba(96,96,94,1)");
  taper(o, q.map(([x, y]) => [x - 0.6, y - 1.0]), () => Math.max(0.8, w * 0.2), "rgba(236,234,228,0.85)");
}

// USB plug seen from above: a pale metal shell with a dark end and a moulded collar
function plug(o, x, y, ang, L = 34, W = 13) {
  o.save(); o.translate(x, y); o.rotate(ang);
  o.fillStyle = "#070707"; o.beginPath(); o.roundRect(-2, -W / 2 - 2, L + 4, W + 4, 3); o.fill();
  o.fillStyle = "rgb(206,204,198)"; o.beginPath(); o.roundRect(0, -W / 2, L * 0.5, W, 2); o.fill();
  o.fillStyle = "rgb(120,118,114)"; o.beginPath(); o.roundRect(L * 0.5, -W / 2 + 1, L * 0.5, W - 2, 2); o.fill();
  o.strokeStyle = "rgba(0,0,0,0.85)"; o.lineWidth = 1.4; o.beginPath(); o.moveTo(L * 0.5, -W / 2); o.lineTo(L * 0.5, W / 2); o.stroke();
  o.fillStyle = "rgba(250,249,245,0.85)"; o.fillRect(2, -W / 2 + 1.5, L * 0.45, 2);
  o.restore();
}

const LAPTOP_OUT = [[285, 223], [843, 143], [921, 532], [928, 543], [1219, 671], [1225, 700], [690, 902], [400, 707], [405, 660]];

function paintDesk(P) {
  const o = P.o;
  // the desk top: a pale board lit by the screen, darker to the far left and toward the wall (flat tone; the grain
  // is drawn as strokes, as in the source)
  P.fill(poly(T.DESK), rad(760, 780, 60, 820, [[0, 0.74], [0.45, 0.68], [0.7, 0.52], [0.9, 0.28], [1, 0.16]]), -0.42, { style: 2 });
  // right of the laptop the board runs away from us; its far strip against the wall is in shadow
  P.fill(poly([[930, 540], [1140, 505], [1450, 490], [1520, 640], [1420, 659], [1225, 700], [1219, 671]]), lin(0, 490, 0, 690, [[0, 0.1], [0.15, 0.35], [0.3, 0.7], [0.45, 0.8], [1, 0.82]]), 0.2, { style: 2 });
  // behind the laptop's left side the desk is in the lid's shadow
  P.light(poly([[240, 735], [300, 690], [405, 660], [410, 712], [400, 760], [330, 790], [260, 800]]), 0.35, "source-over", 0.55);
  // the far left under the speaker falls into the dark
  P.light(poly([[-60, 840], [0, 830], [110, 805], [240, 735], [260, 800], [230, 960], [-60, 960]]), lin(-60, 0, 260, 0, [[0, 0.06], [1, 0.36]]), "source-over", 0.85);
  // grain: long thin dark strokes along the board, denser away from the light
  const r = rng(51);
  o.save(); o.beginPath(); poly(T.DESK)(o); o.clip();
  for (let i = 0; i < 520; i++) {
    const x = -60 + r() * 1580, y = 480 + r() * 480;
    if (!inside(T.DESK, x, y) || inside(LAPTOP_OUT, x, y)) continue;
    const right = x > 930 && y < 710;
    const dist = Math.min(1, Math.hypot((x - 760) / 1.3, y - 780) / 650);
    if (r() > 0.35 + 0.65 * dist) continue;
    const L = 40 + r() * 170, a = right ? 0.18 + (r() - 0.5) * 0.08 : -0.42 + (r() - 0.5) * 0.1;
    const al = 0.35 + dist * 0.55;
    stroke(o, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 3], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.9 + r() * 1.6 + dist * 1.2, `rgba(8,8,8,${al.toFixed(2)})`, 60 + i, 0.5);
  }
  // pale grain highlights in the dark parts
  for (let i = 0; i < 90; i++) {
    const x = -60 + r() * 420, y = 760 + r() * 200;
    if (!inside(T.DESK, x, y)) continue;
    const L = 40 + r() * 120, a = -0.35 + (r() - 0.5) * 0.1;
    stroke(o, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1.2, "rgba(236,234,228,0.35)", 900 + i, 0.5);
  }
  o.restore();
  // the strip of desk top in front of the laptop, and the desk's thick front edge in shadow
  P.fill(poly(T.DESK_TOPFRONT), 0.46, -0.4, { spacing: 0.18 });
  P.fill(poly(T.DESK_EDGE), lin(0, 700, 0, 920, [[0, 0.2], [1, 0.06]]), -0.4, { spacing: 0.2 });
  grain(o, [[700, 958], [1420, 659], [1420, 720], [800, 980]], 26, { dir: "u", w: 1.5, color: "rgba(0,0,0,0.7)", seed: 53, len: [0.3, 0.8], wav: 0.003 });
  line(o, [[700, 958], [953, 853], [1300, 709], [1420, 659]], 2, "rgba(236,234,228,0.55)", 54);
  // cables (behind the laptop's lid first: the lid is painted over them)
  CABLES.forEach((c, i) => cable(o, c, i >= 7 ? 5 : 8, 70 + i));
}

function paintLaptop(P) {
  const o = P.o;
  clearO(P, poly(LAPTOP_OUT));
  // ---- lid: the black glass bezel with a pale aluminium rim
  P.fill(poly(T.LID), 0.02, 0, { style: 2 });
  line(o, [[284, 227], [843, 141]], 2.2, "rgba(236,234,228,0.8)", 81);
  line(o, [[284, 227], [404, 660]], 2.6, "rgba(236,234,228,0.9)", 82);
  line(o, [[845, 142], [922, 531]], 2, "rgba(236,234,228,0.65)", 83);
  line(o, [[405, 661], [921, 533]], 2.4, "rgba(236,234,228,0.8)", 84);
  // ---- deck (top case): pale aluminium
  P.fill(poly(T.DECK), lin(450, 700, 1150, 650, [[0, 0.7], [0.5, 0.72], [1, 0.68]]), -0.25, { style: 2 });
  P.light(poly([[408, 683], [928, 543], [940, 556], [420, 698]]), 0.45, "source-over", 0.8);   // hinge shadow
  // ---- keyboard: black caps on the pale deck
  const K = T.KBD;
  P.fill(poly(K), 0.74, -0.26, { style: 2 });
  const rows = 6;
  for (let j = 0; j < rows; j++) {
    const cols = j === 0 ? 15 : 14;
    for (let i = 0; i < cols; i++) {
      // key widths vary like a real board: wide keys at the row ends
      let u0 = i / cols, u1 = (i + 1) / cols;
      if (j === 5 && i > 3 && i < 9) { if (i !== 4) continue; u1 = 9 / cols; }
      const v0 = j / rows, v1 = (j + 1) / rows;
      const gu = 0.05 / cols, gv = 0.07 / rows;
      const q = [quadAt(K, u0 + gu, v0 + gv), quadAt(K, u1 - gu, v0 + gv), quadAt(K, u1 - gu, v1 - gv), quadAt(K, u0 + gu, v1 - gv)];
      o.fillStyle = "#101010"; o.beginPath(); o.moveTo(q[0][0], q[0][1]);
      for (let k = 1; k < 4; k++) o.lineTo(q[k][0], q[k][1]);
      o.closePath(); o.lineJoin = "round"; o.lineWidth = 2; o.strokeStyle = "#101010"; o.stroke(); o.fill();
      // the lit front rim of each cap
      o.strokeStyle = "rgba(200,198,192,0.45)"; o.lineWidth = 1.1; o.beginPath(); o.moveTo(q[3][0], q[3][1] + 1); o.lineTo(q[2][0], q[2][1] + 1); o.stroke();
    }
  }
  line(o, [K[0], K[1]], 1.4, "#0a0a0a", 89);
  // ---- trackpad
  const tp = T.TRACKPAD;
  P.fill(poly(tp), 0.7, -0.25, { style: 2 });
  curve(o, [tp[0], tp[1], tp[2], tp[3], tp[0]], 1.8, "#141414", 91, { ends: 1 });
  // ---- the left side face with the ports
  P.fill(poly(T.BASE_SIDE), lin(0, 680, 0, 900, [[0, 0.44], [1, 0.54]]), 0.58, { style: 2 });
  line(o, [[408, 684], [686, 866]], 2.2, "#0a0a0a", 85);
  line(o, [[400, 707], [690, 902]], 2.2, "#0a0a0a", 86);
  o.fillStyle = "#060606";
  for (const [x, y, L] of [[425, 700, 18], [452, 718, 20], [486, 741, 24], [540, 777, 12], [572, 798, 10], [622, 832, 7]]) {
    o.save(); o.translate(x, y); o.rotate(0.58); o.beginPath(); o.roundRect(0, -4, L, 8, 2); o.fill(); o.restore();
  }
  plug(o, 452, 752, PI - 0.02, 38, 14);
  plug(o, 486, 775, PI - 0.28, 36, 13);
  plug(o, 540, 822, PI - 0.24, 46, 16);
  // ---- front face (the rounded lip, in shade) and the rounded front-left corner
  P.fill(poly(T.BASE_FRONT), lin(0, 670, 0, 900, [[0, 0.52], [1, 0.42]]), -0.37, { style: 2 });
  curve(o, [[686, 866], [905, 787], [1219, 671]], 2.4, "#0a0a0a", 87);
  curve(o, [[690, 902], [915, 818], [1225, 700]], 2.4, "#0a0a0a", 88);
  line(o, [[692, 870], [905, 792], [1210, 678]], 1.4, "rgba(242,240,234,0.7)", 92);
}

export function paintDeskLayer(P) {
  paintDesk(P);
  paintLaptop(P);
}
// The outline of everything on the desk layer (desk + laptop), for its mask.
export const DESK_MASK = [
  (c) => poly(T.DESK)(c),
  (c) => poly(T.DESK_TOPFRONT)(c),
  (c) => poly(T.DESK_EDGE)(c),
  (c) => poly(LAPTOP_OUT)(c),
  (c) => poly([[700, 960], [800, 980], [953, 914], [1300, 770], [1420, 720], [1420, 980], [700, 980]])(c),
];
