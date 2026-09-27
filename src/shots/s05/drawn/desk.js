// s05 drawn: the desk layer (settled frame px): the desk top and its dark front, the left monitor speaker, the laptop
// (bezel and rim round the screen, deck, keyboard, trackpad, the base's sides with the ports) and the cables and plugs.
// The screen itself is ../screen.js, drawn over this layer. Geometry read off 2–5x labelled grids of the rest frame;
// light from coarse fitted fields (./deskvals.js, >= 40 px knots).
import { carve, drip, hatchPaint, ink, curve, fill, fillSoft, dot, ring, lgrad, rgrad, grey, lerp, clamp, sstep, rng, PI, TAU, ELL, cable, taper, sampleCurve, smoothPath, polyPath, blurDraw, invBil, bil } from "./kit.js";
import { DV } from "./deskvals.js";
import { DVP } from "./deskvalsP.js";

// coarse light field [x0, y0, S, nx, ny, vals] -> (x, y) => value
export function fieldV(Fd, gain = 1, add = 0) {
  const [x0, y0, S, nx, ny, a] = Fd;
  return (x, y) => {
    const fx = clamp((x - x0) / S, 0, nx - 1.001), fy = clamp((y - y0) / S, 0, ny - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const at = (ii, jj) => a[jj * nx + ii];
    return clamp(gain * lerp(lerp(at(i, j), at(i + 1, j), u), lerp(at(i, j + 1), at(i + 1, j + 1), u), v) + add);
  };
}
const edge = (g, pts, w = 1.4, v = 0.85, seed = 1, o = {}) => ink(g, pts, w, grey(v, o.a ?? 1), { seed, ends: o.ends ?? 0.5, jit: o.jit ?? 0.3, closed: o.closed, smooth: o.smooth });
const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#050505", { seed, ends: o.ends ?? 0.6, jit: o.jit ?? 0.3, closed: o.closed, smooth: o.smooth });

// ---- geometry (settled frame px)
export const LID = [[285, 243], [290, 228], [301, 219], [826, 143], [838, 147], [846, 158], [922, 537], [398, 700], [388, 690]];
export const SCREEN = [[313, 247], [832, 170], [898, 519], [409, 650]];
export const DECK = [[402, 695], [945, 549], [1225, 712], [705, 872]];     // back-left, back-right, front-right, front-left
// (the key grid's quad was fitted to the rest frame: a rasterised MacBook-like key layout correlated with the source's
// keyboard, hands masked; snapshots/s05-fix1d-study/kbfit.py)
export const KBD = [[464.9, 692.8], [925.1, 558.0], [1064.2, 611.9], [595.4, 769.6]];
// (fix pass 2: its right end re-measured: the front lip ends at x ~1050, not 1087)
export const PAD = [[838, 712], [995, 665], [1052, 752], [905, 790]];
const DESK_TOP = [[-130, 690], [240, 690], [330, 650], [395, 620], [930, 500], [1000, 488], [1130, 504], [1330, 505], [1520, 498], [1545, 640], [1250, 700], [1050, 780], [850, 946], [-130, 1090]];
const DESK_FRONT = [[990, 800], [1228, 728], [1250, 722], [1250, 1090], [990, 1090]];
const SPK_F = [[63, 393], [190, 333], [237, 722], [145, 832]];
const SPK_S = [[190, 334], [262, 350], [292, 650], [237, 722]];

// the desk top's grain direction (radians, image y down), from line orientations measured on the rest frame (structure
// tensor, 64 px cells, cables and hands left out), interpolated on doubled angles
const GRAIN = [[200, 850, -0.24], [450, 700, -0.26], [700, 580, -0.3], [850, 540, -0.24], [1030, 530, 0.12], [1150, 575, 0.25], [1250, 585, 0.08], [1250, 540, -0.22], [1400, 560, -0.15], [500, 880, 0.08], [620, 890, 0.45], [100, 700, -0.2]];
function grainAng(x, y) {
  let c = 0, sn = 0;
  for (const [gx, gy, a] of GRAIN) { const w = 1 / ((gx - x) ** 2 + (gy - y) ** 2 + 900); c += Math.cos(2 * a) * w; sn += Math.sin(2 * a) * w; }
  return Math.atan2(sn, c) / 2;
}
export function paintDesk(g) {
  // ---- the desk top: pale wood under hatching that thickens in the shadows (grain runs up to the right)
  // (fix pass 2: long, straight, closely spaced strokes, near-black ink, as the source's pen hatching; the field is
  // re-fitted at 40 px with only its true occluders left out, and held to <= 0.55 in the lid's shadow behind it)
  const vT0 = fieldV(DV.deskTop), pTop = fieldV(DVP.deskTop, 1.02);
  const vTop = (x, y) => { const v = vT0(x, y); return x > 930 && x < 1250 && y > 480 && y < 560 ? Math.min(v, 0.55) : v; };
  hatchPaint(g, DESK_TOP, { vf: vTop, paper: (x, y) => Math.max(vTop(x, y), pTop(x, y)), mix: 0.15, ang: grainAng, per: 2.8, len: [60, 200], w: [0.8, 1.7], dk: 0.95, seed: 101, jit: 0.03, bend: 0.01 });
  // the desk's front edge under the laptop's right half (profiles at x 1000-1200, 25.00): the desk top in the laptop's
  // shadow, its lit front edge, the cross-hatched front face, black under the desk
  fill(g, [[940, 890], [1250, 788], [1250, 1090], [940, 1090]], "#020202");
  const TOPSH = [[940, 805], [1245, 722], [1250, 744], [945, 838]], FACEF = [[945, 840], [1250, 746], [1250, 790], [945, 895]];
  // (fix pass 2: long fine parallel hatching, as the source's; the short vertical scribbles are gone)
  hatchPaint(g, TOPSH, { vf: (x, y) => 0.2, ang: -0.3, per: 2.4, len: [60, 160], w: [0.7, 1.2], dk: 0.95, top: 0.7, seed: 102, jit: 0.03, bend: 0.01 });
  hatchPaint(g, FACEF, { vf: (x, y) => 0.15, ang: -0.3, per: 2.4, len: [60, 160], w: [0.7, 1.2], dk: 0.95, top: 0.7, seed: 103, jit: 0.03, bend: 0.01 });
  ink(g, [[945, 839], [1100, 789], [1250, 745]], 3, grey(0.66), { seed: 105, jit: 0.2, ends: 0.8 });
  dark(g, [[940, 805], [1245, 722]], 2, 106); dark(g, [[945, 895], [1250, 790]], 2, 107);
  // ---- the left monitor speaker (front with a lit rim, tweeter and woofer; side with vertical grain)
  carve(g, null, { q: SPK_S, dir: "v", vf: fieldV(DV.spkSide), per: 5, seed: 111, wav: 0.3, bg: 0.25 });
  carve(g, null, { q: SPK_F, dir: "v", vf: fieldV(DV.spkFront), per: 5.5, seed: 112, wav: 0.35, streak: 0.4, bg: 0.3 });
  edge(g, [[65, 395], [188, 335], [236, 720]], 2.6, 0.75, 113);
  edge(g, [[65, 397], [147, 830]], 1.6, 0.5, 114);
  dark(g, [[190, 334], [237, 722]], 2, 115);
  driver(g, 138, 455, 40, 0.55, 116, 0.35);
  driver(g, 152, 612, 76, 0.75, 117, 0.35);
  // ---- the laptop lid: black bezel, the aluminium rim catching the light
  // (fix pass 2: straight edges joined by arcs, r 16, at the corners (the edge lines meet at (280, 222) and (842.5,
  // 140.6)); the smoothed spline overshot there. The bezel stays near black: measured 0.004-0.036 pre-grade.)
  const lidPath = (c, close) => { c.beginPath(); c.moveTo(398, 700); c.lineTo(386, 684); c.arcTo(280, 222, 842.5, 140.6, 16); c.arcTo(842.5, 140.6, 922, 537, 16); c.lineTo(922, 537); if (close) c.closePath(); };
  lidPath(g, true); g.fillStyle = grey(0.02); g.fill();
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  lidPath(g, false); g.strokeStyle = grey(0.66); g.lineWidth = 2.2; g.stroke();
  g.beginPath(); g.moveTo(296, 222); g.arcTo(842.5, 140.6, 922, 537, 16); g.strokeStyle = grey(0.76); g.lineWidth = 2.4; g.stroke();
  g.restore();
  // ---- the base: its left side (ports) and front edge, then the deck
  const SIDE = [[398, 692], [705, 874], [708, 891], [396, 710]];
  fill(g, SIDE, grey(0.55));
  carve(g, null, { q: SIDE, dir: "h", v: 0.55, per: 3.2, seed: 131, bg: 0.4, wav: 0.1 });
  const FRONT = [[705, 872], [1225, 712], [1228, 726], [708, 889]];
  fill(g, FRONT, grey(0.62));
  // (fix pass 2: its right half is in the hand's shadow: measured 0.11-0.15 at u 0.5-0.8, 0.39 at the left end)
  carve(g, null, { q: FRONT, dir: "h", vq: (u, v) => lerp(lerp(0.5, 0.36, v), 0.12, sstep(0.3, 0.45, u) * (1 - sstep(0.9, 1, u) * 0.6)), per: 3, seed: 132, bg: 0.45 });
  dark(g, [[396, 711], [700, 892], [712, 893], [1228, 728]], 2.4, 133);
  // the deck (aluminium palm rest), lighter toward us
  hatchPaint(g, DECK, { vf: fieldV(DV.deck), paper: fieldV(DVP.deck, 1.02), mix: 0.6, ang: -0.28, per: 4, len: [14, 50], w: [0.7, 1.4], dk: 0.6, seed: 134 });
  dark(g, [[402, 690], [705, 872]], 1.8, 135); dark(g, [[705, 872], [1225, 712]], 1.6, 136);
  // the lit strip along the hinge (the deck's back edge catches the screen's light: ~0.8 across 10 px at 25.00)
  ink(g, [[404, 693], [944, 548]], 7, grey(0.8), { seed: 137, jit: 0.1, ends: 0.9 });
  dark(g, [[404, 702], [944, 557]], 1.6, 138, { c: "rgba(10,10,10,0.8)" });
  // ports on the base's left side
  for (const [u, w] of [[0.1, 0.05], [0.22, 0.05], [0.36, 0.05], [0.5, 0.05], [0.66, 0.02]]) {
    const a = bil(SIDE, u, 0.25), b = bil(SIDE, u + w, 0.25), c = bil(SIDE, u + w, 0.75), d = bil(SIDE, u, 0.75);
    fill(g, [a, b, c, d], grey(0.05));
  }
  // ---- the keyboard: the well, the keys (black, rounded, a pale web between them)
  keyboard(g);
  // ---- the trackpad (a thin dark outline, a shade darker than the deck; a lit lip at its front)
  fill(g, PAD, grey(0.74));
  dark(g, PAD, 1.3, 141, { closed: true });
  edge(g, [bil(PAD, 0.02, 1.0), bil(PAD, 0.98, 1.0)], 1.2, 0.95, 142);
  // ---- cables and plugs
  cables(g);
}

// a driver in a speaker front seen at an angle (ellipse squeezed by sx)
function driver(g, cx, cy, R, lit, seed, sx = 0.4) {
  g.save(); g.translate(cx, cy); g.scale(sx + 0.5, 1); g.translate(-cx, -cy);
  dot(g, cx, cy, R, grey(0.02));
  ring(g, cx, cy, R - 1.2, 2.6, grey(0.45));
  const rc = R * 0.74;
  g.save(); g.beginPath(); g.arc(cx, cy, rc, 0, TAU); g.clip();
  g.fillStyle = lgrad(g, cx + rc * 0.4, cy - rc * 0.8, cx - rc * 0.2, cy + rc * 0.8, [[0, 0.02], [0.5, 0.1 * lit], [1, 0.65 * lit]]); g.fillRect(cx - rc, cy - rc, 2 * rc, 2 * rc);
  const r = rng(seed);
  for (let i = 0; i < 44; i++) { const rr = rc * (0.35 + r() * 0.65), a0 = 0.5 + r() * 2.4, da = 0.3 + r() * 0.9; g.strokeStyle = grey(0.55 + r() * 0.4, 0.2 + r() * 0.25); g.lineWidth = 0.9 + r() * 1.3; g.beginPath(); g.arc(cx, cy, rr, a0, a0 + da); g.stroke(); }
  g.restore();
  ring(g, cx, cy, rc, 1.5, grey(0.05));
  dot(g, cx + R * 0.02, cy - R * 0.02, R * 0.3, grey(0.03));
  fillSoft(g, ELL(cx - R * 0.08, cy - R * 0.15, R * 0.1, R * 0.07), grey(0.75), 1);
  g.restore();
}

// the keys: 6 rows (a thin function row) in the well's bilinear frame
function keyboard(g) {
  fill(g, KBD, grey(0.55));
  const rows = [[0, 0.105, 14], [0.135, 0.3, 14], [0.33, 0.495, 14], [0.525, 0.69, 13], [0.72, 0.885, 12], [0.915, 1.0, 11]];
  const r = rng(151);
  rows.forEach(([v0, v1, n], ri) => {
    // key widths per row (units), the MacBook layout roughly
    const W = ri === 0 ? Array(14).fill(1) : ri === 1 ? [...Array(13).fill(1), 1.5] : ri === 2 ? [1.5, ...Array(12).fill(1), 1] : ri === 3 ? [1.8, ...Array(11).fill(1), 1.8] : ri === 4 ? [2.3, ...Array(10).fill(1), 2.3] : [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1];
    const tot = W.reduce((a, b) => a + b, 0);
    let u = 0;
    for (const w of W) {
      const u0 = u + 0.006, u1 = u + w / tot - 0.006;
      u += w / tot;
      const q = [bil(KBD, u0, v0 + 0.012), bil(KBD, u1, v0 + 0.012), bil(KBD, u1, v1 - 0.012), bil(KBD, u0, v1 - 0.012)];
      g.beginPath(); smoothPath(g, q, true, 0.25); g.fillStyle = grey(0.035 + r() * 0.02); g.fill();
      // a lit top lip and a faint legend
      ink(g, [q[0], q[1]], 0.9, grey(0.3, 0.7), { seed: 152 + ri * 20 + Math.round(u * 100), jit: 0 });
      if (ri > 0 && w < 2.5) { const c = bil(q, 0.3, 0.35); dot(g, c[0], c[1], 0.9, grey(0.55, 0.6)); }
    }
  });
  dark(g, KBD, 1.2, 159, { closed: true });
}

// cables (fix pass 2: 6 px tubes, a dark grey body with a black edge and a 1 px lit edge) and their plugs (seated on the
// base's left side: a pale body with a lit top face, a ribbed strain relief, the metal tip in the port; measured at 4x:
// centres (437, 738), (480, 761), (535, 801))
function tube(g, pts, w = 6, seed = 1) {
  const q = sampleCurve(pts, 10), n = q.length;
  taper(g, q, () => w + 2, "#030303");
  taper(g, q, () => w, grey(0.3));
  const hl = [];
  for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; let nx = -dy / d, ny = dx / d; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } hl.push([q[i][0] + nx * w * 0.3, q[i][1] + ny * w * 0.3]); }
  const r = rng(seed), ph = r() * 10;
  taper(g, hl, (u) => 1 + 0.6 * Math.abs(Math.sin(u * 3.1 + ph)), grey(0.86, 0.9));
}
function cables(g) {
  const C = [
    // from the first plug, left, round and up behind the speaker
    [[[418, 742], [395, 746], [345, 748], [305, 735], [292, 705], [300, 670], [320, 650], [342, 632], [356, 600], [362, 560]], 6],
    // from the second plug, down-left, round the bottom and away to the right
    [[[455, 768], [430, 775], [405, 790], [390, 815], [383, 850], [385, 874], [398, 889], [430, 899], [488, 900], [560, 904], [640, 912], [700, 930], [730, 950]], 6.5],
    // from the third plug, left and down off the bottom edge
    [[[505, 808], [472, 815], [442, 830], [414, 855], [395, 885], [382, 915], [372, 950]], 6.5],
    // the long cable from behind the speaker down across the desk
    [[[335, 590], [322, 640], [298, 690], [270, 760], [240, 820], [215, 870], [207, 910], [210, 950]], 6.5],
    // the arc across the lower left
    [[[-40, 880], [40, 866], [120, 866], [180, 878], [230, 905], [260, 950]], 6],
    // behind the laptop: the loop by the hinge and the cables away to the right along the desk (measured at 1.3x)
    [[[905, 512], [960, 522], [1010, 528], [1033, 540], [1060, 550], [1115, 562], [1174, 583], [1260, 593], [1328, 614], [1400, 630]], 5.5],
    [[[920, 540], [980, 548], [1040, 524], [1080, 524], [1100, 540], [1096, 562], [1070, 570], [1030, 560]], 5],
    [[[1100, 566], [1160, 590], [1240, 600], [1300, 622], [1360, 640]], 5],
  ];
  C.forEach(([pts, w], i) => tube(g, pts, w, 170 + i));
  for (const [x, y, a, L] of [[437, 738, 0.07, 34], [480, 761, 0.1, 42], [535, 801, 0.1, 48]]) plug(g, x, y, a, L);
}
function plug(g, x, y, a, L) {
  g.save(); g.translate(x, y); g.rotate(a);
  const h = 15;
  // the metal tip in the port (right end), the body, the strain relief (left end)
  g.fillStyle = grey(0.08); g.fillRect(L / 2 - 2, -h / 2 + 3, 10, h - 5);
  g.beginPath(); g.roundRect(-L / 2 + 8, -h / 2, L - 8, h, 3); g.fillStyle = grey(0.5); g.fill();
  g.beginPath(); g.roundRect(-L / 2 + 8, -h / 2, L - 8, h * 0.55, 3); g.fillStyle = grey(0.8); g.fill();
  g.strokeStyle = "rgba(6,6,6,0.9)"; g.lineWidth = 1.6; g.beginPath(); g.roundRect(-L / 2 + 8, -h / 2, L - 8, h, 3); g.stroke();
  ink(g, [[-L / 2 + 10, -h / 2 + 1.2], [L / 2 - 3, -h / 2 + 1.2]], 1.2, grey(0.96, 0.9), { seed: Math.round(x), jit: 0 });
  g.beginPath(); g.roundRect(-L / 2 - 4, -h / 2 + 3, 13, h - 6, 2); g.fillStyle = grey(0.35); g.fill(); g.stroke();
  for (let i = 0; i < 3; i++) { g.strokeStyle = "rgba(6,6,6,0.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2 - 1 + i * 3.5, -h / 2 + 3); g.lineTo(-L / 2 - 1 + i * 3.5, h / 2 - 3); g.stroke(); }
  g.restore();
}
