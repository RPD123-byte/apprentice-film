// s16 scene: the designer at his desk seen straight on at eye level (steady framing of 46.08–47.48).
// Everything is in frame px of that steady frame (measured on the source with tools/grid.py at 46.80).
// paintScene(P) paints the engraving plate (value + stroke direction) and the crisp ink on P.o: the room, desk,
// laptop, mug, books and cables here, the designer himself in ./designer.js.
// The eyes are not in the plate: drawEyes(ctx, dx, lid) paints them every frame (the pupils move 46.16–46.44).
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { paintDesigner } from "./designer.js";
export { drawEyes } from "./designer.js";

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const radial = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };
const DARK = "#080808";
// a swelling ink line through control points
export function line(o, pts, w, color, per = 6, prof = 0.5) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), prof)), color);
}
// a line that starts full and tapers to a point (hair strands, flicks)
function strand(o, pts, w, color, per = 6, head = 0.12) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * Math.min(1, 0.35 + u / head) * Math.pow(1 - u, 0.8), color);
}
function soft(g, clip, fn, blur) {
  g.save(); g.beginPath(); clip(g); g.clip(); g.filter = `blur(${blur}px)`; fn(g); g.filter = "none"; g.restore();
}

// ---------------------------------------------------------------- measured outlines (frame px)
// laptop lid (back), the right edge seen as a white band
export const LID = [[993, 655], [1442, 650], [1514, 846], [996, 848]];
const DESK_Y = 849;

// ---------------------------------------------------------------- the plate
export function paintScene(P) {
  const o = P.o, r = rng(1601);
  // ---- desk: the plank's front edge is the lit band, grain lines run along it; under it the dark rail
  const X1 = 2206 + 90;
  P.fill(poly([[626, DESK_Y], [X1, DESK_Y], [X1, 900], [626, 900]]), linear(626, 0, 2206, 0, [[0, 0.62], [0.12, 0.56], [0.2, 0.5], [0.6, 0.46], [1, 0.4]]), 0.0, { spacing: 0.06, style: 0 });
  P.fill(poly([[626, 900], [X1, 900], [X1, 1040], [626, 1040]]), 0.04, 0.0, { style: 2 });
  // grain: long white streaks, broken, more of them toward the right where the plank goes dark between them
  for (let i = 0; i < 70; i++) {
    const y = DESK_Y + 4 + r() * 44, x0 = 626 + r() * 1650, L = 60 + r() * 360;
    o.globalAlpha = 0.35 + 0.5 * r();
    line(o, [[x0, y], [x0 + L * 0.5, y + (r() - 0.5) * 2], [x0 + L, y + (r() - 0.5) * 3]], 1.2 + r() * 2.2, INK, 4);
  }
  for (let i = 0; i < 40; i++) {
    const y = DESK_Y + 6 + r() * 42, x0 = 830 + r() * 1450, L = 40 + r() * 220;
    o.globalAlpha = 0.8;
    line(o, [[x0, y], [x0 + L, y + (r() - 0.5) * 3]], 1.5 + r() * 2, "#060606", 4);
  }
  o.globalAlpha = 1;
  // top edge: a hairline of light on the desk's lip, and the dark line under the plank
  line(o, [[626, DESK_Y + 1], [1200, DESK_Y], [2300, DESK_Y - 1]], 2.6, "rgba(242,240,234,0.9)", 4, 0.2);
  line(o, [[626, 901], [1400, 900], [2300, 899]], 3, "#050505", 4, 0.2);
  // the plank's cut end at the left, and a leg under the desk
  P.fill(poly([[618, DESK_Y + 2], [630, DESK_Y], [630, 901], [618, 903]]), 0.3, 1.57, { style: 2 });
  P.fill(poly([[724, 900], [792, 900], [792, 1040], [724, 1040]]), 0.05, 1.57, { spacing: 0.3 });
  o.globalAlpha = 1;

  // ---- designer (drawn before the laptop, which hides his lower body): src/shots/s16/designer.js
  paintDesigner(P);
  // ---- laptop lid
  P.fill(poly(LID), 0.0, 0, { style: 2 });
  // white rim along the top and the side band on the right
  taper(o, [[995, 657], [1220, 654], [1440, 651]], (u) => 5.2 - 1.6 * u, "rgba(242,240,234,0.95)");
  o.fillStyle = "rgba(242,240,234,0.95)";
  o.beginPath(); o.moveTo(1436, 651); o.lineTo(1447, 650); o.lineTo(1518, 846); o.lineTo(1506, 846); o.closePath(); o.fill();
  o.fillStyle = "#050505"; o.beginPath(); o.moveTo(1438, 656); o.lineTo(1443, 655); o.lineTo(1511, 846); o.lineTo(1508, 846); o.closePath(); o.fill();
  // the glowing logo dot
  o.fillStyle = "#f4f2ec"; o.beginPath(); o.ellipse(1245, 765, 23.5, 24, 0, 0, 7); o.fill();
  // the hatched paper corner left of the laptop
  o.save(); o.beginPath(); o.moveTo(1013, 756); o.lineTo(1042, 830); o.lineTo(977, 842); o.closePath(); o.clip();
  for (let k = -12; k < 20; k++) { const x = 960 + k * 7; line(o, [[x, 860], [x + 40, 750]], 2.2, "rgba(242,240,234,0.85)", 2, 0.2); }
  o.restore();
  // ---- cables looping over the desk's edge
  const cables = [
    [[1034, 836], [1016, 842], [998, 866], [984, 905], [974, 960]],
    [[1024, 838], [1006, 846], [990, 872], [978, 910], [968, 960]],
    [[1112, 834], [1094, 842], [1076, 870], [1064, 910], [1058, 960]],
    [[1990, 806], [1984, 830], [1990, 880], [1998, 960]],
    [[2004, 806], [2000, 832], [2006, 880], [2014, 960]],
  ];
  for (const c of cables) { line(o, c, 9, "#070707", 6, 0.1); line(o, c.map(([x, y]) => [x - 2.5, y]), 2.2, "rgba(242,240,234,0.8)", 6, 0.3); }
  // ---- mug (two handles), steam is animated separately
  paintMug(P, r);
  // ---- books and a small device on the right of the desk
  paintBooks(P, r);
}

function paintMug(P, r) {
  const o = P.o;
  const body = [[732, 724], [872, 720], [862, 846], [742, 848]];
  // a rounded ceramic mug: speckled glaze in the shaded left half, a soft wrap-around shade, the lit right half
  P.fill(poly(body), linear(732, 0, 872, 0, [[0, 0.42], [0.2, 0.5], [0.4, 0.8], [0.55, 0.98], [1, 0.98]]), 1.57, { spacing: 0.1, style: 2 });
  o.save(); o.beginPath(); poly(body)(o); o.clip();
  // speckle: small round flecks, light on the dark side and dark on the light side
  for (let i = 0; i < 520; i++) {
    const u = Math.pow(r(), 1.25), x = 734 + u * 132, y = 726 + r() * 120, rad = 0.6 + r() * 1.1;
    const dark = u > 0.45 ? r() < 0.8 : r() < 0.35;
    if (u > 0.5 && r() < 0.93) continue;
    o.globalAlpha = 0.35 + 0.45 * r(); o.fillStyle = dark ? "#1a1a1a" : "#e8e6e0";
    o.beginPath(); o.arc(x, y, rad, 0, 7); o.fill();
  }
  // wrap-around shade: short curved strokes across the body where the light turns
  for (let k = 0; k < 34; k++) {
    const y = 730 + k * 3.4 + r() * 1.5, x0 = 768 + r() * 12, x1 = 812 + r() * 16;
    o.globalAlpha = 0.25 + 0.3 * r();
    line(o, [[x0, y], [(x0 + x1) / 2, y + 1.6], [x1, y + 0.6]], 1 + r() * 0.6, "#101010", 3, 0.5);
  }
  o.globalAlpha = 1;
  o.restore();
  // rim and outline
  line(o, [[731, 725], [800, 719], [873, 720]], 3, "#f4f2ec", 4, 0.2);
  line(o, [[733, 728], [800, 724], [870, 724]], 1.2, "rgba(20,20,20,0.6)", 4, 0.3);
  line(o, [[732, 726], [742, 848]], 2.2, "#0a0a0a", 3, 0.3);
  line(o, [[742, 848], [800, 849], [862, 846]], 2.6, "#0a0a0a", 3, 0.2);
  // right handle: a thick white loop
  line(o, [[868, 747], [896, 748], [911, 770], [906, 806], [890, 824], [864, 826]], 8, "#efede7", 8, 0.25);
  line(o, [[872, 755], [893, 757], [902, 775], [898, 803], [884, 816], [866, 818]], 2, "#0a0a0a", 8, 0.3);
  // left handle: the far one, in shadow: a dark loop with a pale outer edge
  line(o, [[733, 748], [708, 752], [694, 775], [697, 806], [712, 826], [735, 832]], 9, "#2a2a2a", 8, 0.25);
  line(o, [[731, 744], [705, 748], [690, 774], [693, 808], [709, 829], [734, 836]], 1.8, "rgba(200,198,192,0.7)", 8, 0.3);
}

function paintBooks(P, r) {
  const o = P.o;
  // top book (shorter, stacked at the right) and the long lower book whose left end meets his hand: pale page edges
  const top = [[1733, 760], [1936, 762], [1939, 801], [1733, 803]], low = [[1692, 805], [1942, 806], [1946, 846], [1690, 847]];
  P.fill(poly(low), linear(0, 806, 0, 846, [[0, 0.92], [1, 0.8]]), 0.0, { style: 2 });
  P.fill(poly(top), linear(0, 762, 0, 802, [[0, 0.95], [1, 0.84]]), 0.0, { style: 2 });
  // page edges: a light striped band
  for (const [x0, x1, y0, y1] of [[1740, 1920, 766, 798], [1698, 1928, 810, 843]]) {
    for (let y = y0; y < y1; y += 3.2 + r() * 1.4) {
      const a = x0 + r() * 30, b = x1 - r() * 40;
      o.globalAlpha = 0.18 + 0.25 * r();
      line(o, [[a, y], [(a + b) / 2, y + (r() - 0.5)], [b, y + (r() - 0.5) * 1.5]], 0.9 + r() * 0.5, "#141414", 3, 0.3);
    }
  }
  o.globalAlpha = 1;
  // the shadow of the top book on the lower one
  o.fillStyle = "rgba(10,10,10,0.8)"; o.beginPath(); o.moveTo(1733, 803); o.lineTo(1939, 801); o.lineTo(1942, 812); o.lineTo(1800, 810); o.closePath(); o.fill();
  // covers: the dark back edges at the right ends
  P.fill(poly([[1918, 763], [1937, 763], [1940, 801], [1920, 801]]), 0.14, 1.57, { style: 2 });
  P.fill(poly([[1928, 807], [1943, 807], [1946, 846], [1930, 846]]), 0.16, 1.57, { style: 2 });
  for (const pts of [[[1733, 760], [1936, 762]], [[1733, 803], [1939, 801]], [[1733, 760], [1733, 803]], [[1936, 762], [1939, 801]], [[1692, 805], [1942, 806]], [[1690, 847], [1946, 846]], [[1942, 806], [1946, 846]]]) line(o, pts, 2.3, "#0a0a0a", 3, 0.2);
  // the crumpled dark pouch at the right end of the desk: a lit top on its left part, a dark end with a few highlights
  P.fill(blob([[1966, 812], [2000, 800], [2060, 796], [2100, 792], [2140, 790], [2158, 800], [2160, 825], [2150, 842], [2080, 845], [1985, 843], [1968, 832]]), 0.15, 0.1, { style: 2 });
  P.fill(blob([[1972, 812], [2010, 801], [2066, 797], [2086, 806], [2078, 822], [2040, 827], [1992, 829]]), 0.8, 0.1, { style: 2 });
  for (const c of [[[1990, 818], [2010, 812], [2030, 814]], [[2040, 806], [2056, 812], [2070, 810]], [[2000, 826], [2030, 822], [2060, 824]]]) line(o, c, 1.3, "rgba(15,15,15,0.7)", 4);
  line(o, [[1972, 812], [2010, 801], [2066, 797], [2086, 806]], 1.8, "rgba(242,240,234,0.8)", 5, 0.3);
  line(o, [[2090, 802], [2122, 792], [2146, 792], [2157, 804], [2158, 822]], 2.2, "rgba(242,240,234,0.75)", 6, 0.3);
  line(o, [[2124, 822], [2130, 812], [2138, 816]], 1.8, "rgba(242,240,234,0.8)", 3, 0.3);
  for (let i = 0; i < 5; i++) { o.fillStyle = "rgba(230,228,222,0.55)"; o.beginPath(); o.arc(2010 + i * 18 + r() * 8, 836 + r() * 4, 1.2, 0, 7); o.fill(); }
}
