// s05 desk layer: the desk top with its grain, the cables, the laptop (lid, deck, keyboard, trackpad, ports).
// Painted on its own plate and masked, because during the camera settle it moves differently from the room.
// Edges of the laptop's front and the desk's front were measured as straight lines (Hough on the source frame):
// deck front y = 787 - 0.367(x - 905), laptop bottom y = 818 - 0.388(x - 915), desk front y = 853 - 0.414(x - 953).
import { INK, grey, rng, taper, poly, blob, ell, lin, rad, line, curve, stroke, grain, quadAt, along, clearO, inside, PI, sampleCurve } from "./kit.js";
import * as T from "./trace.js";

// ---------------------------------------------------------------- cables (pale tubes with a dark keyline, lit by
// the screen), traced from a skeleton of the source's lines at 25.00 (snapshots/s05-fix1-study/lines-cab.jpg)
export const CABLES = [
  // from the three plugs in the laptop's left side: A loops back up behind the lid, B swings down and away along the
  // bottom of the frame, C runs down to the bottom edge
  [[421, 744], [400, 749], [375, 752], [350, 752], [325, 745], [308, 733], [299, 716], [300, 697], [310, 681], [326, 669], [346, 660], [372, 650]],
  [[463, 767], [446, 770], [428, 774], [410, 784], [394, 800], [384, 822], [384, 845], [393, 861], [410, 875], [440, 887], [475, 893], [535, 897], [575, 906], [612, 922], [636, 944], [642, 960]],
  [[512, 805], [496, 810], [476, 820], [452, 833], [428, 846], [403, 863], [384, 876], [370, 892], [359, 913], [353, 944], [352, 960]],
  // behind the lid on the left, looping back toward the speaker
  [[410, 712], [362, 712], [322, 702], [292, 694], [266, 706], [248, 740], [236, 790]],
  // cables lying across the far left of the desk
  [[-60, 868], [40, 858], [120, 862], [175, 878], [210, 890], [245, 912], [280, 940], [292, 960]],
  [[-60, 930], [80, 912], [170, 908], [228, 925], [252, 960]],
  // behind the laptop on the right, a bundle to the centre speaker, and the long one under his arm
  [[918, 500], [960, 488], [1000, 494], [1040, 510], [1068, 528], [1086, 548], [1076, 566], [1040, 570], [1000, 562]],
  [[925, 520], [970, 510], [1020, 522], [1060, 540], [1110, 548], [1150, 545]],
  [[930, 540], [990, 548], [1050, 568], [1120, 578], [1190, 584], [1250, 596], [1300, 616], [1340, 634], [1390, 652]],
];

function cable(o, pts, w = 7) {
  const q = sampleCurve(pts, 8);
  taper(o, q, () => w + 2.4, "#070707");
  taper(o, q, () => w - 0.6, "rgba(168,166,162,1)");
  taper(o, q.map(([x, y]) => [x - 0.5, y - w * 0.22]), () => Math.max(0.9, w * 0.3), "rgba(236,234,228,0.9)");
  taper(o, q.map(([x, y]) => [x + 0.4, y + w * 0.28]), () => Math.max(0.8, w * 0.18), "rgba(60,60,58,0.7)");
}

// USB plug in a side port: from the port end (x, y) out along ang to the cable end; a pale metal shell at the port,
// a darker moulded body toward the cable
function plug(o, x, y, ang, L = 38, W = 14) {
  o.save(); o.translate(x, y); o.rotate(ang);
  o.fillStyle = "#070707"; o.beginPath(); o.roundRect(-2, -W / 2 - 2, L + 4, W + 4, 3); o.fill();
  o.fillStyle = "rgb(214,212,206)"; o.beginPath(); o.roundRect(0, -W / 2, L * 0.42, W, 2); o.fill();
  o.fillStyle = "rgb(150,148,144)"; o.beginPath(); o.roundRect(L * 0.42, -W / 2 + 1, L * 0.58, W - 2, 3); o.fill();
  o.strokeStyle = "rgba(0,0,0,0.85)"; o.lineWidth = 1.3; o.beginPath(); o.moveTo(L * 0.42, -W / 2); o.lineTo(L * 0.42, W / 2); o.stroke();
  o.fillStyle = "rgba(250,249,245,0.85)"; o.fillRect(2, -W / 2 + 1.5, L * 0.36, 2);
  o.restore();
}

const LAPTOP_OUT = [[285, 223], [843, 143], [921, 532], [928, 543], [1219, 671], [1225, 700], [690, 902], [400, 707], [405, 660]];

function paintDesk(P) {
  const o = P.o;
  const sp = (px) => (px / 4.4 - 0.55) / 1.35;       // plate spacing factor for a line pitch of px
  // the desk top: fine engraved grain (dark hatching on the lit board), the lines running along the planks. Values
  // from blurred means of the source at 25.00: left of the laptop a lit pool (post-grade 150–190) falling into the
  // dark at the far left; right of the laptop lit near him (180–215) and dark toward the back (25–100)
  const LEFT = [[-60, 840], [0, 830], [110, 805], [240, 735], [300, 690], [405, 660], [520, 760], [690, 902], [700, 958], [-60, 960]];
  P.fill(poly(T.DESK), rad(600, 900, 40, 520, [[0, 0.74], [0.4, 0.7], [0.6, 0.46], [0.75, 0.22], [1, 0.06]]), -0.45, { style: 0, spacing: sp(3.3) });
  P.fill(poly(LEFT), rad(600, 900, 40, 520, [[0, 0.74], [0.4, 0.7], [0.6, 0.44], [0.75, 0.2], [1, 0.05]]), -0.5, { style: 0, spacing: sp(3.3) });
  // behind the laptop's left side the desk is in the lid's shadow
  P.light(poly([[240, 735], [300, 690], [405, 660], [410, 712], [400, 760], [330, 790], [260, 800]]), 0.3, "source-over", 0.6);
  // right of the laptop the board runs away from us: lit near him, dark toward the wall
  const RIGHT = [[930, 540], [1140, 505], [1450, 490], [1520, 640], [1420, 659], [1225, 700], [1219, 671]];
  P.fill(poly(RIGHT), lin(0, 490, 0, 640, [[0, 0.1], [0.13, 0.3], [0.27, 0.52], [0.43, 0.7], [1, 0.76]]), 0.36, { style: 0, spacing: sp(3.3) });
  // plank seams and darker grain strokes, sparse (the fine grain is the engraving)
  const r = rng(51);
  o.save(); o.beginPath(); poly(T.DESK)(o); o.clip();
  for (let i = 0; i < 260; i++) {
    const x = -60 + r() * 1580, y = 480 + r() * 480;
    if (!inside(T.DESK, x, y) || inside(LAPTOP_OUT, x, y)) continue;
    const right = x > 930 && y < 710;
    const L = 30 + r() * 110, a = right ? 0.36 + (r() - 0.5) * 0.08 : -0.47 + (r() - 0.5) * 0.08;
    stroke(o, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 2], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.8 + r() * 1.2, `rgba(8,8,8,${(0.3 + 0.35 * r()).toFixed(2)})`, 60 + i, 0.5);
  }
  o.restore();
  // the strip of desk top in front of the laptop (lit), and the desk's thick front edge in shadow (hatched)
  P.fill(poly(T.DESK_TOPFRONT), 0.66, -0.4, { style: 0, spacing: sp(3.3) });
  P.fill(poly(T.DESK_EDGE), lin(0, 700, 0, 920, [[0, 0.3], [1, 0.1]]), -0.4, { style: 0, spacing: sp(3.0) });
  grain(o, [[700, 958], [1420, 659], [1420, 720], [800, 980]], 22, { dir: "u", w: 1.3, color: "rgba(0,0,0,0.6)", seed: 53, len: [0.3, 0.8], wav: 0.003 });
  line(o, [[700, 958], [953, 853], [1300, 709], [1420, 659]], 1.6, "rgba(236,234,228,0.5)", 54);
  // cables (behind the laptop's lid first: the lid is painted over them)
  CABLES.forEach((c, i) => cable(o, c, i >= 6 ? 5.5 : i === 3 ? 6 : 8));
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
  P.fill(poly(T.DECK), lin(450, 700, 1150, 650, [[0, 0.74], [0.5, 0.76], [1, 0.72]]), -0.25, { style: 2 });
  P.light(poly([[408, 683], [928, 543], [940, 556], [420, 698]]), 0.5, "source-over", 0.7);   // hinge shadow
  // ---- keyboard: separate black caps (rounded) with silver gaps (~5 px) and faint pale legends
  const K = T.KBD;
  P.fill(poly(K), 0.64, -0.26, { style: 2 });
  const rows = 6, rk = rng(97);
  for (let j = 0; j < rows; j++) {
    const cols = j === 0 ? 15 : 14;
    for (let i = 0; i < cols; i++) {
      // key widths vary like a real board: wide keys at the row ends, the space bar
      let u0 = i / cols, u1 = (i + 1) / cols;
      if (j === 5 && i > 3 && i < 9) { if (i !== 4) continue; u1 = 9 / cols; }
      const v0 = j / rows, v1 = (j + 1) / rows;
      const gu = 0.085 / cols, gv = 0.11 / rows;
      const q = [quadAt(K, u0 + gu, v0 + gv), quadAt(K, u1 - gu, v0 + gv), quadAt(K, u1 - gu, v1 - gv), quadAt(K, u0 + gu, v1 - gv)];
      o.fillStyle = "#0d0d0d"; o.lineJoin = "round"; o.lineWidth = 3; o.strokeStyle = "#0d0d0d";
      o.beginPath(); o.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) o.lineTo(q[k][0], q[k][1]); o.closePath(); o.fill();
      // shrink by the stroke so the gaps stay open: draw the rounded join inside the quad
      const c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2];
      const qi = q.map(([x, y]) => [x + (c[0] - x) * 0.12, y + (c[1] - y) * 0.12]);
      o.beginPath(); o.moveTo(qi[0][0], qi[0][1]); for (let k = 1; k < 4; k++) o.lineTo(qi[k][0], qi[k][1]); o.closePath(); o.stroke();
      // the lit front rim of each cap, and a small pale legend
      o.strokeStyle = "rgba(200,198,192,0.35)"; o.lineWidth = 1; o.beginPath(); o.moveTo(q[3][0], q[3][1] + 0.5); o.lineTo(q[2][0], q[2][1] + 0.5); o.stroke();
      if (u1 - u0 < 0.2) {
        const g = quadAt(K, u0 + (u1 - u0) * (0.3 + rk() * 0.2), v0 + (v1 - v0) * (0.35 + rk() * 0.2));
        o.strokeStyle = `rgba(230,228,222,${(0.25 + 0.2 * rk()).toFixed(2)})`; o.lineWidth = 1.1;
        o.beginPath(); o.moveTo(g[0] - 2.5, g[1] + 0.6); o.lineTo(g[0] + 2.5, g[1] - 0.6); if (rk() < 0.5) { o.moveTo(g[0], g[1] - 2.5); o.lineTo(g[0], g[1] + 2.5); } o.stroke();
      }
    }
  }
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
  plug(o, 455, 730, 2.75, 36, 13);
  plug(o, 497, 752, 2.72, 38, 14);
  plug(o, 553, 786, 2.72, 44, 16);
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
