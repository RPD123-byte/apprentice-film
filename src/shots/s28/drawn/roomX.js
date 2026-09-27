// s28 orbit extensions: what the orbit shows beyond the locked view. Positions read off gridded source frames:
//   RIGHTX  the right wall beyond the locked view, in 129.32-frame px (shelves, plants, boxes, books, speakers, the
//           sideboard); items seen only at 129.96 were mapped into 129.32 px through the RIGHT wall plane.
//   DESKA   the desk as seen at 129.32 (129.32 px), DESKB as seen at 129.96 (129.96 px); both are re-projected
//           through the DESK plane and cross-faded (the source is not a rigid scene).
//   BASE    the laptop's base (keyboard deck + silver front face), 2D keyframes read at 129.32 / .56 / .80 / 130.04.
//   CHAIR   the chair back left of him, 2D keyframes (visible until ~129.7).
//   MUG     the mug on the desk (right), its centre per keyframe.
import { canvas, shape, poly, rect, ink, line, hatch, lin, rad, vlines, trace } from "./kit.js";
import { rng } from "../../../lib/rng.js";

const INK = "#3a2320", INK2 = "rgba(58,35,32,0.55)", INK3 = "rgba(58,35,32,0.3)";
const WALL = "#efeadb";
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function leaf(g, x, y, len, wid, ang, col) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const pts = [P(0, 0), P(len * 0.35, -wid * 0.5), P(len * 0.75, -wid * 0.3), P(len, 0), P(len * 0.7, wid * 0.35), P(len * 0.3, wid * 0.45)];
  shape(g, pts, col);
  ink(g, [...pts, pts[0]], 1.2, INK2, { taper: 0.5 });
}
function bush(g, seed, cx, cy, n, spread, lenR, cols, up = -Math.PI / 2) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = up + (r() - 0.5) * spread, L = lenR[0] + r() * (lenR[1] - lenR[0]);
    const x = cx + (r() - 0.5) * 10, y = cy;
    ink(g, [[x, y], [x + Math.cos(a) * L * 0.4, y + Math.sin(a) * L * 0.4]], 1.3, "rgba(70,85,45,0.8)");
    leaf(g, x + Math.cos(a) * L * 0.3, y + Math.sin(a) * L * 0.3, L * 0.7, L * 0.28, a + (r() - 0.5) * 0.3, cols[Math.floor(r() * cols.length)]);
  }
}
function boxShape(g, x0, y0, x1, y1, col, lidH = 0, lidCol = null) {
  poly(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col);
  if (lidH) poly(g, [[x0 - 3, y0], [x1 + 3, y0], [x1 + 3, y0 + lidH], [x0 - 3, y0 + lidH]], lidCol || col);
  ink(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], 1.4, INK2, { smooth: false });
  if (lidH) ink(g, [[x0 - 3, y0 + lidH], [x1 + 3, y0 + lidH]], 1.2, INK2, { smooth: false });
}

// ------------------------------------------------------------------ right wall beyond the locked view (129.32 px)
export function paintRightX() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  rect(g, 690, -40, 1600, 1000, WALL);
  g.fillStyle = lin(g, 700, 0, 2206, 0, [[0, "rgba(240,236,222,0)"], [1, "rgba(232,226,208,0.6)"]]); g.fillRect(690, 0, 1520, 946);
  // pot shelf (seen at 129.96, mapped; shifted up 16 px to sit where 129.32 shows it)
  const dy = -16;
  const P = (pts) => pts.map(([x, y]) => [x, y + dy]);
  bush(g, 11, 1160, 150 + dy, 16, 2.2, [40, 80], ["#8c9a6a", "#a4ae7c", "#7c8c5c"]);
  bush(g, 12, 1270, 150 + dy, 10, 1.6, [60, 115], ["#98a574", "#86955f", "#a9b584"]);
  poly(g, P([[952, 147], [1119, 148], [1119, 164], [955, 161]]), "#d9c2a4");
  boxShape(g, 958, 157 + dy, 1113, 222 + dy, "#d7bd9b");
  poly(g, P([[1000, 180], [1030, 180], [1030, 188], [1000, 188]]), "#5a4030");
  shape(g, P([[1113, 145], [1204, 149], [1192, 222], [1126, 220]]), "#c98a6c", { smooth: false });
  ink(g, P([[1113, 145], [1204, 149], [1192, 222], [1126, 220], [1113, 145]]), 1.4, INK2, { smooth: false });
  shape(g, P([[1223, 144], [1315, 148], [1306, 222], [1233, 219]]), "#ece5d6", { smooth: false });
  ink(g, P([[1223, 144], [1315, 148], [1306, 222], [1233, 219], [1223, 144]]), 1.4, INK2, { smooth: false });
  poly(g, P([[931, 213], [1372, 216], [1372, 223], [931, 223]]), "#d8ac86");
  poly(g, P([[931, 223], [1372, 223], [1372, 234], [931, 237]]), "#c4906c");
  ink(g, P([[931, 213], [1372, 216], [1372, 234], [931, 237]]), 1.5, INK, { smooth: false });
  for (const bx of [1057, 1304]) {
    poly(g, P([[bx, 241], [bx + 18, 242], [bx + 18, 307], [bx + 6, 307]]), "#c4906c");
    ink(g, P([[bx, 241], [bx + 6, 307], [bx + 18, 307], [bx + 18, 242]]), 1.2, INK2, { smooth: false });
  }
  // upper right shelf with two boxes, leaning books and a trailing plant (read at 129.32)
  bush(g, 13, 1830, 0, 0, 1, [1, 1], ["#9f997a"]);
  const r = rng(17);
  for (let i = 0; i < 12; i++) {            // trailing vine
    const y = 5 + i * 11, x = 1800 + Math.sin(i * 0.8) * 18 + r() * 10;
    leaf(g, x, y, 22 + r() * 10, 10, 1.2 + (r() - 0.5) * 1.4, ["#9f997a", "#8e8a68", "#b0aa86"][i % 3]);
  }
  ink(g, [[1810, 0], [1822, 40], [1812, 80], [1826, 120], [1818, 145]], 1.4, "rgba(70,80,45,0.8)");
  boxShape(g, 1883, 87, 2090, 163, "#c2bbac", 12, "#ccc5b6");
  boxShape(g, 1910, 40, 2070, 100, "#c9c2b3", 14, "#d3ccbd");
  poly(g, [[2140, 13], [2206, 5], [2206, 167], [2150, 167]], "#bda493");
  poly(g, [[2172, 20], [2206, 18], [2206, 167], [2178, 167]], "#c9b4a2");
  ink(g, [[2140, 13], [2150, 167]], 1.4, INK2, { smooth: false }); ink(g, [[2172, 20], [2178, 167]], 1.2, INK2, { smooth: false });
  poly(g, [[1787, 170], [2206, 168], [2206, 185], [1792, 185]], "#d7ae8f");
  poly(g, [[1792, 185], [2206, 185], [2206, 200], [1800, 200]], "#bf8f72");
  ink(g, [[1787, 170], [2206, 168]], 1.3, INK2, { smooth: false }); ink(g, [[1787, 170], [1800, 200], [2206, 200]], 1.6, INK, { smooth: false });
  poly(g, [[1860, 200], [1880, 200], [1880, 273], [1866, 273]], "#bf8f72"); ink(g, [[1860, 200], [1866, 273], [1880, 273], [1880, 200]], 1.2, INK2, { smooth: false });
  // speakers (seen at 129.96, mapped): wooden cabinets, dark cones with yellow rings
  for (const [x0, x1, cx] of [[1103, 1197, 1149], [1197, 1327, 1261]]) {
    poly(g, [[x0, 442], [x1, 442], [x1, 580], [x0, 582]], "#c78d6a");
    ink(g, [[x0, 442], [x1, 442], [x1, 580], [x0, 582], [x0, 442]], 1.5, INK, { smooth: false });
    g.beginPath(); g.arc(cx, 527, 30, 0, 6.3); g.fillStyle = "#e7b44c"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.arc(cx, 527, 18, 0, 6.3); g.fillStyle = "#3c2c2c"; g.fill();
    g.beginPath(); g.arc(cx, 471, 12, 0, 6.3); g.fillStyle = "#4a3a3a"; g.fill(); g.stroke();
  }
  // sideboard: top and front (mapped part left of 1590, read at 129.32 to the right), boxes and books on it
  boxShape(g, 1846, 506, 2073, 583, "#cebfab", 10, "#d7cab8");
  boxShape(g, 1877, 445, 2054, 506, "#d6c6b0", 10, "#dccfbd");
  poly(g, [[1936, 470], [1990, 470], [1990, 480], [1936, 480]], "rgba(90,70,60,0.5)");
  poly(g, [[1930, 540], [1990, 540], [1990, 552], [1930, 552]], "rgba(90,70,60,0.5)");
  for (const [x0, x1, col] of [[2085, 2120, "#c2a58f"], [2120, 2160, "#b89a86"], [2160, 2206, "#caa994"]]) {
    poly(g, [[x0, 420 + (x0 - 2085) * 0.1], [x1, 418], [x1, 583], [x0, 583]], col);
    ink(g, [[x0, 420], [x0, 583]], 1.2, INK2, { smooth: false });
  }
  poly(g, [[948, 577], [1590, 568], [2206, 580], [2206, 596], [1590, 584], [948, 591]], "#dcc0a0");
  poly(g, [[948, 591], [1590, 584], [2206, 596], [2206, 705], [1590, 690], [948, 691]], "#d5b594");
  ink(g, [[948, 577], [1590, 568], [2206, 580]], 1.3, INK2, { smooth: false });
  ink(g, [[948, 591], [1590, 584], [2206, 596]], 1.8, INK, { smooth: false });
  for (const x of [1250, 1560, 1740, 1945]) ink(g, [[x, 590], [x, 698]], 1.3, INK2, { smooth: false });
  return c;
}

// ------------------------------------------------------------------ desk (DESK plane), per reference frame
export function paintDeskA() {             // 129.32 px
  const c = canvas(2206, 946), g = c.getContext("2d");
  poly(g, [[-200, 840], [255, 818], [700, 790], [1300, 740], [1660, 680], [2206, 705], [2206, 1100], [-200, 1100]], "#e2c7a0");
  g.fillStyle = lin(g, 0, 0, 1400, 0, [[0, "rgba(160,110,80,0.55)"], [0.5, "rgba(160,110,80,0.15)"], [1, "rgba(160,110,80,0)"]]); g.fillRect(-200, 780, 1700, 320);
  // paper sheets (right)
  poly(g, [[1600, 821], [2206, 695], [2206, 780], [1885, 946], [1520, 946]], "#ece2c6");
  poly(g, [[1640, 715], [1760, 715], [1700, 740], [1640, 770]], "#f2ead6");
  ink(g, [[1600, 821], [2206, 695]], 1.3, INK2, { smooth: false });
  // desk front face (below the front edge) with a drawer
  poly(g, [[1885, 946], [2206, 783], [2206, 1000], [1885, 1000]], "#c0967c");
  ink(g, [[1885, 946], [2206, 783]], 2, INK, { smooth: false });
  ink(g, [[2000, 900], [2206, 830]], 1.2, INK2, { smooth: false });
  // folder (bottom left) and the cable
  poly(g, [[255, 946], [622, 880], [1160, 905], [1180, 946]], "#b98f74");
  ink(g, [[255, 946], [622, 880], [1160, 905]], 1.6, INK, { smooth: false });
  ink(g, [[560, 946], [640, 925], [700, 912], [760, 898], [790, 884]], 6, "#3a302c", { taper: 0.2 });
  return c;
}
export function paintDeskB() {             // 129.96 px
  const c = canvas(2206, 946), g = c.getContext("2d");
  poly(g, [[-200, 850], [300, 845], [790, 776], [1053, 760], [1550, 760], [2206, 790], [2206, 1100], [-200, 1100]], "#e2c19c");
  g.fillStyle = lin(g, 0, 0, 1300, 0, [[0, "rgba(160,110,80,0.35)"], [1, "rgba(160,110,80,0)"]]); g.fillRect(-200, 760, 1500, 340);
  poly(g, [[1450, 800], [1700, 770], [2206, 800], [2206, 946], [1500, 946], [1400, 880]], "#ece0c7");
  poly(g, [[1700, 790], [2000, 800], [2150, 870], [1850, 900]], "#f1ead4");
  ink(g, [[1450, 800], [1700, 770], [2206, 800]], 1.3, INK2, { smooth: false });
  ink(g, [[1700, 790], [2000, 800], [2150, 870], [1850, 900], [1700, 790]], 1.1, INK2, { smooth: false });
  poly(g, [[-200, 880], [300, 870], [310, 946], [-200, 946]], "#b98f74");
  ink(g, [[-200, 880], [300, 870], [310, 946]], 1.5, INK, { smooth: false });
  ink(g, [[300, 925], [420, 915], [560, 905], [700, 900]], 6, "#3a302c", { taper: 0.2 });
  return c;
}

// ------------------------------------------------------------------ laptop base (2D keyframes)
// [t, FL, FR, FLb, FRb, BL] : front-left / front-right top corners, their face bottoms, back-left (hinge side)
const BASEK = [
  [129.32, [765, 818], [1215, 880], [778, 840], [1195, 905], [1250, 740]],
  [129.56, [705, 825], [1065, 908], [722, 842], [1058, 926], [1100, 740]],
  [129.80, [675, 843], [890, 910], [690, 858], [885, 928], [920, 738]],
  [130.04, [598, 848], [700, 905], [610, 862], [700, 922], [760, 740]],
  [130.28, [520, 850], [560, 905], [530, 864], [560, 922], [600, 740]],
];
function lerpKey(K, t) {
  if (t <= K[0][0]) return K[0].slice(1);
  if (t >= K[K.length - 1][0]) return K[K.length - 1].slice(1);
  let i = 1; while (K[i][0] < t) i++;
  const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((p, k) => [p[0] + (b[k + 1][0] - p[0]) * u, p[1] + (b[k + 1][1] - p[1]) * u]);
}
export function drawBase(g, t) {
  if (t > 130.3) return;
  const [FL, FR, FLb, FRb, BL] = lerpKey(BASEK, t);
  const BR = [FR[0] + (BL[0] - FL[0]) * 1.1, FR[1] + (BL[1] - FL[1]) * 1.1];
  // top deck (silver) and keyboard well (dark)
  poly(g, [FL, FR, BR, BL], "#937a78");
  const K = (u, v) => [FL[0] + (FR[0] - FL[0]) * u + (BL[0] - FL[0]) * v, FL[1] + (FR[1] - FL[1]) * u + (BL[1] - FL[1]) * v];
  poly(g, [K(0.3, 0.35), K(0.98, 0.35), K(0.98, 0.9), K(0.3, 0.9)], "#4a3b3b");
  g.save(); g.beginPath(); trace(g, [K(0.3, 0.35), K(0.98, 0.35), K(0.98, 0.9), K(0.3, 0.9)], true, false); g.clip();
  for (let v = 0.4; v < 0.9; v += 0.1) line(g, [K(0.3, v), K(0.98, v)], 1.2, "rgba(150,130,125,0.5)");
  for (let u = 0.33; u < 0.98; u += 0.05) line(g, [K(u, 0.35), K(u, 0.9)], 1, "rgba(150,130,125,0.4)");
  g.restore();
  poly(g, [K(0.45, 0.05), K(0.8, 0.05), K(0.8, 0.28), K(0.45, 0.28)], "rgba(90,75,72,0.35)");
  // silver front face with ports
  poly(g, [FL, FR, FRb, FLb], "#c9b8ad");
  const Fp = (u, v) => [FL[0] + (FR[0] - FL[0]) * u + (FLb[0] - FL[0]) * v, FL[1] + (FR[1] - FL[1]) * u + (FLb[1] - FL[1]) * v];
  for (const [u0, u1] of [[0.62, 0.72], [0.76, 0.81], [0.85, 0.9]]) poly(g, [Fp(u0, 0.35), Fp(u1, 0.35), Fp(u1, 0.75), Fp(u0, 0.75)], "#3a3232");
  ink(g, [BL, FL, FR], 2, INK, { smooth: false });
  ink(g, [FLb, FRb], 1.8, INK, { smooth: false });
  ink(g, [FL, FLb], 1.5, INK, { smooth: false });
}

// ------------------------------------------------------------------ chair back (2D keyframes): left edge x, top y
// fix 2 (read per frame on 50 px grids of 129.32-129.72): a narrow dark backrest (~70 px of it shows left of his hood)
// with a rounded top-left corner, its top at ~590-620, down to the desk edge at ~830; hidden behind his elbow from 129.66
const CHAIRK = [[129.32, 85, 592], [129.40, 105, 598], [129.48, 140, 606], [129.56, 165, 612], [129.64, 190, 618], [129.72, 212, 622]];
export function drawChair(g, t) {
  if (t > 129.66) return;
  let x = CHAIRK[0][1], top = CHAIRK[0][2];
  for (let i = 1; i < CHAIRK.length; i++) if (t <= CHAIRK[i][0]) { const [ta, a, ya] = CHAIRK[i - 1], [tb, b, yb] = CHAIRK[i], u = clamp((t - ta) / (tb - ta), 0, 1); x = a + (b - a) * u; top = ya + (yb - ya) * u; break; }
  const pts = [[x + 2, top + 26], [x + 12, top + 4], [x + 36, top - 2], [x + 96, top - 4], [x + 100, 832], [x + 2, 832]];
  shape(g, pts, "#5b3a34", { smooth: false });
  g.save(); g.beginPath(); trace(g, pts, true, false); g.clip();
  g.fillStyle = lin(g, x, 0, x + 60, 0, [[0, "rgba(150,100,85,0.55)"], [0.35, "rgba(150,100,85,0.12)"], [1, "rgba(0,0,0,0)"]]); g.fillRect(x - 10, top - 10, 120, 850 - top);
  g.restore();
  ink(g, [[x + 2, 832], [x + 2, top + 26], [x + 12, top + 4], [x + 36, top - 2], [x + 96, top - 4]], 2.4, INK, { taper: 0 });
}

// ------------------------------------------------------------------ mug (2D keyframes: centre x, rim y, scale)
const MUGK = [[129.32, 1843, 600, 1], [129.57, 1963, 615, 1.02], [129.82, 2112, 640, 1.05], [129.96, 2175, 660, 1.07], [130.1, 2260, 680, 1.1]];
export function drawMug(g, t) {
  if (t > 130.1) return;
  let r = MUGK[MUGK.length - 1];
  for (let i = 1; i < MUGK.length; i++) if (t <= MUGK[i][0]) { const a = MUGK[i - 1], b = MUGK[i], u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1); r = a.map((v, k) => v + (b[k] - v) * u); break; }
  const [, cx, ry, s] = r;
  const w = 68 * s, h = 140 * s;
  g.save();
  g.beginPath(); g.ellipse(cx + w + 8 * s, ry + 60 * s, 16 * s, 34 * s, 0, 0, 6.3); g.lineWidth = 7 * s; g.strokeStyle = "#e9e2d2"; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke();
  const body = [[cx - w, ry], [cx + w, ry], [cx + w, ry + h - 10 * s], [cx + w - 12, ry + h], [cx - w + 12, ry + h], [cx - w, ry + h - 10 * s]];
  shape(g, body, "#dccab5", { smooth: false });
  g.fillStyle = lin(g, cx - w, 0, cx + w, 0, [[0, "rgba(150,130,110,0.25)"], [0.4, "rgba(0,0,0,0)"], [1, "rgba(150,130,110,0.3)"]]); g.fillRect(cx - w, ry, 2 * w, h);
  ink(g, [...body, body[0]], 1.8, INK, { smooth: false });
  g.beginPath(); g.ellipse(cx, ry, w, 9 * s, 0, 0, 6.3); g.fillStyle = "#d9cfbd"; g.fill(); g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
  g.restore();
}

// the orbit's extra light, in 129.96 px (re-projected per frame): a warm yellow sun tint over the left third (multiply) and
// a warm shade over the near desk at the bottom right. Strengths from zone means of render vs source (129.8-130.4: the
// left third b* 3-4.5 low, the near desk L +3 and b* 3-5 low).
// fix 2: the sun beam's ray streaks on the left wall during the orbit (129.96 px; the zone tone already matches, so the
// streaks are light bands 20-40 px wide with faint darker gaps between them, which keep the zone means)
export function paintOrbitBeam() {
  const light = canvas(2206, 946), g = light.getContext("2d");
  const dark = canvas(2206, 946), h = dark.getContext("2d");
  const band = (c, a, b, w, col) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2; poly(c, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], col); };
  g.filter = "blur(5px)"; h.filter = "blur(6px)";
  // direction measured on 130.00: the streaks run from the window (top, x 500-880) down-left to the left edge (y 275-770)
  for (const [x0, w, al] of [[560, 34, 0.2], [650, 24, 0.17], [760, 40, 0.2], [860, 26, 0.15]]) band(g, [x0, -40], [x0 - 900, 640 + (x0 - 560) * 0.55], w, `rgba(255,230,140,${al})`);
  for (const [x0, w, al] of [[610, 18, 0.1], [710, 22, 0.1], [815, 18, 0.09]]) band(h, [x0, -40], [x0 - 900, 640 + (x0 - 560) * 0.55], w, `rgba(150,120,90,${al})`);
  // faint vertical wall hatching (panel seams and light pencil lines)
  h.filter = "none";
  vlines(h, 20, 700, 0, 800, { sp: 28, w: 1, color: "rgba(120,90,70,0.14)", seed: 991, jitter: 6, broken: 0.5 });
  return { light, dark };
}
export function paintOrbitGlow() {
  const screen = canvas(2206, 946), g = screen.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 760, 0, [[0, "rgba(255,226,150,0.36)"], [0.55, "rgba(255,226,150,0.16)"], [1, "rgba(255,226,150,0)"]]);
  g.fillRect(-300, -100, 1100, 1200);
  const shade = canvas(2206, 946), h = shade.getContext("2d");
  h.fillStyle = lin(h, 0, 720, 0, 946, [[0, "rgba(170,120,60,0)"], [0.4, "rgba(170,120,60,0.1)"], [1, "rgba(160,110,55,0.14)"]]);
  h.fillRect(1150, 700, 1400, 500);
  return { screen, shade };
}
