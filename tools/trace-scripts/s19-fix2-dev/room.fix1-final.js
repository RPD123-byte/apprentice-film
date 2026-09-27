// s19 room: the floor-level view among the gear (57.32–63.12). Locked-off camera (camtrack: drift < 0.3 px), so the
// room is one engraved plate in frame coordinates. Traced from 1:1 gridded source frames at 57.36 (card in place)
// and 63.08 (card gone: the speaker, the plank, the scissors and the jack panel behind it).
//   paintRoom(P)       the static room (everything the card light does not change)
//   paintFloorRays(g)  the floor lit from under the card: bright radial rays (drawn straight onto a 2D canvas)
// The source is a dense, bold scratchboard: every surface is a field of white strokes whose weight follows the light
// and whose direction follows the form (grain along the guitar case, rings on the woofer, vertical boards), with
// bold white rims. Here each surface is a value + direction field drawn as streamline strokes (flow()) on P.o,
// over the engraved black plate, plus rims and details.
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const circ = (x, y, r) => (c) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); };
const ell = (x, y, rx, ry, a = 0) => (c) => { c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };
const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const A = (dx, dy) => Math.atan2(dy, dx);
const W_ = (a) => `rgba(242,240,234,${a})`;
const K_ = (a) => `rgba(6,6,6,${a})`;
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const gs = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
const TAU = Math.PI * 2;

// a swelling ink line through control points
export function line(o, pts, w, color = INK, per = 6, end = 0.3) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.5)), color);
}
function arcPts(cx, cy, rx, ry, a0, a1, n = 40) { const q = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; q.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return q; }

// Direction field from a few control directions (inverse-distance weighting of axial angles).
function idw(ctrl, pw = 2) {
  return (x, y) => {
    let sx = 0, sy = 0;
    for (const [cx, cy, a, w = 1] of ctrl) { const k = w / Math.pow((x - cx) ** 2 + (y - cy) ** 2 + 900, pw / 2); sx += Math.cos(2 * a) * k; sy += Math.sin(2 * a) * k; }
    return Math.atan2(sy, sx) / 2;
  };
}
// Scratchboard strokes: seeds on a jittered grid; from each a streamline of the direction field is traced both ways
// and drawn as a tapered white stroke whose weight (and how often it appears) follows the value field val(x, y).
function flow(o, clip, box, { dir, val, sp = 9, len = [40, 160], w = 2.4, seed = 1, alpha = 1, color = INK, step = 5, dens = 1, gamma = 0.8, aspect = 1.6, brk = 0 }) {
  const r = rng(seed);
  o.save(); if (clip) { o.beginPath(); clip(o); o.clip(); }
  const [x0, y0, x1, y1] = box;
  const trace = (px, py, d0, L) => {
    const q = []; let p = [px, py], prev = d0;
    for (let s = 0; s < L; s += step) {
      const a = dir(p[0], p[1]); let d = [Math.cos(a), Math.sin(a)];
      if (d[0] * prev[0] + d[1] * prev[1] < 0) d = [-d[0], -d[1]];
      prev = d; p = [p[0] + d[0] * step, p[1] + d[1] * step]; q.push(p);
    }
    return q;
  };
  for (let y = y0; y < y1; y += sp) for (let x = x0; x < x1; x += sp * aspect) {
    const px = x + (r() - 0.5) * sp * aspect, py = y + (r() - 0.5) * sp;
    const v = val(px, py), rr = r(), L = len[0] + (len[1] - len[0]) * r(), wr = 0.55 + 0.9 * r(), ar = 0.5 + 0.5 * r();
    if (v <= 0.01 || rr > dens * (0.2 + 1.3 * v)) continue;
    const a0 = dir(px, py), d0 = [Math.cos(a0), Math.sin(a0)];
    const pts = [...trace(px, py, [-d0[0], -d0[1]], L / 2).reverse(), [px, py], ...trace(px, py, d0, L / 2)];
    if (pts.length < 3) continue;
    const ww = w * Math.pow(Math.min(1, v), gamma) * wr;
    o.globalAlpha = alpha * ar;
    if (brk > 0 && r() < brk) { const k = Math.floor(pts.length * (0.3 + 0.4 * r())); taper(o, pts.slice(0, k), (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.5), color); taper(o, pts.slice(k + 2), (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.5), color); }
    else taper(o, pts, (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.5), color);
  }
  o.globalAlpha = 1;
  o.restore();
}

// ---------------------------------------------------------------- geometry (frame px, measured at 57.36 / 63.08)
const AMP = [[0, 0], [256, 0], [205, 194], [0, 112]];
const PBOX = [[0, 118], [205, 200], [230, 206], [198, 330], [150, 434], [0, 446]];
const CASE = [[500, 0], [690, 0], [652, 110], [602, 205], [560, 292], [530, 352], [470, 420], [400, 500], [350, 580], [322, 680], [310, 768], [250, 773], [140, 767], [80, 744], [46, 702], [38, 640], [58, 578], [98, 520], [148, 470], [198, 402], [222, 342], [256, 262], [300, 236], [358, 228], [404, 206], [456, 130]];
const CASE_RIM = [[500, 0], [456, 130], [404, 206], [358, 228], [300, 236], [256, 262], [222, 342], [198, 402], [148, 470], [98, 520], [58, 578], [38, 640], [46, 702], [80, 744], [140, 767], [250, 773], [310, 768]];
const CASE_HANDLE = [[256, 298], [262, 250], [300, 224], [346, 226], [366, 256]];
const LATCHES = [[460, 142, 58, 34, -0.35], [248, 370, 54, 32, -0.25], [75, 648, 48, 40, -0.05]];
const BACKWALL = [[640, 0], [930, 0], [900, 360], [700, 330]];
const CR = { ftl: [365, 380], ftr: [690, 370], fbr: [700, 772], fbl: [335, 766], btr: [905, 425], bbr: [906, 762], rimB: 474 };
const CAB = [[660, 0], [1330, 0], [1326, 778], [900, 780], [880, 700], [700, 660]];
const WOOF = { x: 1026, y: 355, r: 236, sx: 0.97 };       // measured at 63.08: outer rim x 787–1262, y 118–592
const CAP = { x: 1040, y: 350, r: 78 };                   // dust cap (dark) with its highlight at (1040, 330)
const TWEET = { x: 905, y: 22, r: 60 };
const PLANK = [[1318, 0], [1484, 0], [1545, 720], [1330, 732]];
const JACK = [[1495, 122], [1650, 205], [1652, 280], [1497, 200]];
const RCAB = [[1586, 40], [1650, 100], [1760, 350], [1860, 770], [1650, 790]];
const BOXES = [
  [[2020, 12], [2072, 0], [2102, 192], [2050, 204]],
  [[2098, 72], [2206, 40], [2206, 300], [2142, 330]],
  [[2046, 300], [2132, 272], [2176, 532], [2092, 556]],
  [[2140, 214], [2206, 192], [2206, 498], [2172, 510]],
  [[2118, 500], [2206, 470], [2206, 748], [2160, 762]],
];
const TOPBOX = [[1652, 0], [1900, 0], [1896, 40], [1660, 44]];

// ---------------------------------------------------------------- the room plate
export function paintRoom(P) {
  const o = P.o;
  P.fill(poly([[0, 0], [2206, 0], [2206, 946], [0, 946]]), 0.0, Math.PI / 2, { spacing: 0.3 });
  paintGrille(P);
  paintPlankBox(P);
  // wall panel between the case and the speaker: black with vertical streaks
  flow(o, poly(BACKWALL), [640, 0, 930, 360], { dir: () => Math.PI / 2 + 0.03, val: (x, y) => 0.16 * clamp(1 - y / 380) * (0.5 + 0.5 * gs(x, y, 720, 120, 70, 200)), sp: 11, len: [60, 220], w: 2.2, seed: 3, aspect: 1.2 });
  line(o, [[672, 0], [676, 160], [680, 330]], 2.4, W_(0.55));
  paintCabinet(P);
  paintWoofer(P);
  paintTweeter(P);
  paintPlank(P);
  paintScissors(P);
  paintJack(P);
  paintRightCabinet(P);
  for (const [x, y, a, s] of [[1488, 22, 0.8, 1], [1520, 8, -0.4, 0.8], [1540, 62, 1.2, 0.9], [1470, 60, 2.2, 0.7]]) leaf(P, x, y, a, s);
  line(o, [TOPBOX[3], TOPBOX[2], TOPBOX[1]], 2.2, W_(0.6));
  o.fillStyle = W_(0.6); o.beginPath(); o.arc(1670, 30, 3, 0, 7); o.fill();
  paintBoxes(P);
  paintCase(P);
  paintCrate(P);
  paintFloor(P);
}

// --- top-left: the amp grille (dense, slightly irregular mesh) over the plank box
function paintGrille(P) {
  const o = P.o, r = rng(4);
  o.save(); o.beginPath(); poly(AMP)(o); o.clip();
  for (const [ang, pitch, a0] of [[1.78, 7.2, 0.5], [0.22, 7.0, 0.42]]) {
    const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
    for (let s = -420; s < 420; s += pitch * (0.9 + 0.2 * r())) {
      let t = -420;
      while (t < 420) {
        const L = 40 + r() * 120, c = [128 + n[0] * s + d[0] * t, 100 + n[1] * s + d[1] * t];
        o.globalAlpha = a0 * (0.5 + 0.7 * r());
        taper(o, [c, [c[0] + d[0] * L, c[1] + d[1] * L]], () => 1.1 + 0.9 * r(), INK);
        t += L + r() * 10;
      }
    }
  }
  o.globalAlpha = 1;
  // the mesh is darker toward the bottom right (in the frame's shadow)
  const g = o.createLinearGradient(40, 40, 230, 190); g.addColorStop(0, K_(0)); g.addColorStop(1, K_(0.6));
  o.fillStyle = g; o.fillRect(0, 0, 260, 200);
  o.restore();
  // dark bottom frame with a lit lower lip, and the right edge
  taper(o, [[0, 116], [100, 156], [207, 198]], () => 13, K_(1));
  line(o, [[0, 124], [100, 164], [207, 204]], 2.2, W_(0.45));
  line(o, [[256, 0], [236, 90], [207, 194]], 2.5, W_(0.55));
}
// --- below the grille: a box of vertical wooden boards, grain lit from above, fading into the dark
function paintPlankBox(P) {
  const o = P.o;
  const seams = [[52, 150, 30, 440], [112, 170, 88, 436], [170, 192, 150, 432]];
  flow(o, poly(PBOX), [0, 110, 235, 450], { dir: () => Math.PI / 2 + 0.1, val: (x, y) => { let v = 0.34 * clamp(1.1 - (y - 150) / 300); for (const [ax, ay, bx, by] of seams) { const sx = ax + (bx - ax) * (y - ay) / (by - ay); v *= 0.4 + 0.6 * clamp(Math.abs(x - sx) / 14); } return v; }, sp: 7, len: [30, 120], w: 2.6, seed: 5, aspect: 1.1, brk: 0.3 });
  for (const [ax, ay, bx, by] of seams) { taper(o, [[ax, ay], [bx, by]], () => 4, K_(1)); line(o, [[ax + 3, ay], [bx + 3, by]], 1.2, W_(0.3)); }
}
// --- the speaker cabinet: dark wood with bold vertical grain, lit toward the woofer's right and low down
function paintCabinet(P) {
  const o = P.o;
  flow(o, poly(CAB), [660, 0, 1330, 780], {
    dir: () => Math.PI / 2 + 0.015,
    val: (x, y) => 0.08 + 0.36 * gs(x, y, 1270, 520, 70, 260) + 0.2 * gs(x, y, 760, 200, 90, 220) + 0.18 * gs(x, y, 1000, 700, 260, 70),
    sp: 8, len: [60, 260], w: 2.6, seed: 7, aspect: 1.05, brk: 0.35,
  });
}
// --- the woofer: fine rings, lit in a crescent on the lower left (the card light), shadowed top right; a thick
// surround, a thin bright outer rim with screws, and a glossy black dust cap with a soft highlight
function paintWoofer(P) {
  const o = P.o, W = WOOF, r = rng(23);
  P.fill((c) => c.ellipse(W.x, W.y, W.r * W.sx, W.r, 0, 0, TAU), 0.0, 0, { style: 2 });
  const lit = (a) => Math.pow(clamp((Math.cos(a - 2.45) + 0.25) / 1.25), 1.6);   // brightest at the lower left
  o.save(); o.translate(W.x, W.y); o.scale(W.sx, 1);
  const rings = (r0, r1, sp, V, seed, w = 1) => {
    const rr = rng(seed);
    for (let R = r0; R <= r1; R += sp * (0.75 + 0.5 * rr())) {
      const n = Math.max(40, Math.round(R * 0.6)), ph = rr() * TAU;
      // each ring is broken into arcs of different weight (scratchy, not a clean circle)
      let k = 0;
      while (k < n) {
        const m = Math.min(n - k, 4 + Math.floor(rr() * 14)), pts = [], ws = [];
        for (let j = 0; j <= m; j++) {
          const a = ph + ((k + j) / n) * TAU, cx = (CAP.x - W.x) * (1 - (R - r0) / (r1 - r0 + 1)) * 0.6;
          pts.push([cx + Math.cos(a) * R, Math.sin(a) * R]);
          ws.push(sp * w * Math.pow(clamp(V(R, a) * (0.8 + 0.4 * rr())), 0.9));
        }
        if (rr() > 0.12) taper(o, pts, (u) => ws[Math.min(m, Math.round(u * m))] * Math.pow(Math.sin(Math.PI * u), 0.3), INK);
        k += m;
      }
    }
  };
  // cone
  rings(CAP.r + 6, 186, 6.2, (R, a) => 0.06 + 0.82 * lit(a) * (0.75 + 0.25 * (R - 90) / 100), 23);
  // surround: a thick ring with a broad highlight on its left
  rings(190, 224, 5.2, (R, a) => 0.08 + 0.9 * Math.pow(clamp((Math.cos(a - 2.9) + 0.1) / 1.1), 1.4) * (0.6 + 0.4 * Math.sin(Math.PI * (R - 190) / 34)), 29, 1.1);
  // outer rim (the basket frame): thin bright ring, brighter on the left, screws
  line(o, arcPts(0, 0, W.r - 2, W.r - 2, Math.PI * 0.4, Math.PI * 1.6, 60), 3.4, W_(0.85), 2, 0.3);
  line(o, arcPts(0, 0, W.r - 2, W.r - 2, -Math.PI * 0.4, Math.PI * 0.4, 60), 2.2, W_(0.45), 2, 0.3);
  line(o, arcPts(0, 0, 228, 228, Math.PI * 0.55, Math.PI * 1.45, 60), 1.6, W_(0.4), 2, 0.3);
  for (const a of [-2.35, -0.8, 0.8, 2.35]) { const x = Math.cos(a) * (W.r - 12), y = Math.sin(a) * (W.r - 12); o.fillStyle = W_(0.7); o.beginPath(); o.arc(x, y, 5, 0, 7); o.fill(); o.fillStyle = K_(1); o.beginPath(); o.arc(x, y, 2.5, 0, 7); o.fill(); }
  o.restore();
  // dust cap: glossy black, a rim catching light on the lower left, a soft highlight with fine hatching round it
  o.fillStyle = "#050505"; o.beginPath(); o.arc(CAP.x, CAP.y, CAP.r, 0, 7); o.fill();
  line(o, arcPts(CAP.x, CAP.y, CAP.r, CAP.r, 1.4, 3.6, 40), 2.4, W_(0.45), 2, 0.3);
  const hx = CAP.x, hy = CAP.y - 22;
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d0 = 8 + r() * 10, L = 14 + r() * 36;
    o.globalAlpha = 0.18 + 0.3 * r() * clamp(1 - Math.abs(Math.sin(a - 0.6)) * 0.6);
    line(o, [[hx + Math.cos(a) * d0, hy + Math.sin(a) * d0], [hx + Math.cos(a) * (d0 + L), hy + Math.sin(a) * (d0 + L)]], 1.0 + r(), INK, 2, 0.4);
  }
  o.globalAlpha = 1;
  o.save(); o.filter = "blur(5px)"; o.fillStyle = W_(0.75); o.beginPath(); o.ellipse(hx, hy, 15, 10, -0.4, 0, TAU); o.fill(); o.filter = "none";
  o.fillStyle = W_(0.9); o.beginPath(); o.ellipse(hx, hy, 5, 3.5, -0.4, 0, TAU); o.fill(); o.restore();
}
function paintTweeter(P) {
  const o = P.o, T = TWEET, r = rng(29);
  P.fill(circ(T.x, T.y, T.r), 0.0, 0, { style: 2 });
  for (let i = 0; i < 12; i++) {
    const rr = 34 + i * 3.2, a0 = -Math.PI * 1.15, a1 = a0 + Math.PI * (1.0 + 0.5 * r());
    line(o, arcPts(T.x, T.y, rr, rr, a0, a1, 24), 1.2 + r() * 1.4, W_(0.35 + 0.5 * r()), 2, 0.2);
  }
  line(o, arcPts(T.x, T.y, T.r, T.r, -Math.PI, Math.PI, 50), 3, W_(0.75), 2, 0.7);
  o.fillStyle = W_(0.95); o.beginPath(); o.arc(T.x + 12, T.y - 8, 9, 0, 7); o.fill();
}
function leaf(P, x, y, a, s) {
  const o = P.o, c = Math.cos(a), sn = Math.sin(a), L = 38 * s, Wd = 16 * s;
  const pts = [[0, 0], [L * 0.4, -Wd], [L, 0], [L * 0.4, Wd]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
  P.fill(blob(pts), 0.45, a, { style: 2 });
  line(o, [...pts, pts[0]], 2, K_(1), 4, 0.8);
  line(o, [pts[0], pts[2]], 1.2, K_(1));
}

// --- the guitar case: black, long grain strokes following its contour, a bold double white rim, metal clasps
function paintCase(P) {
  const o = P.o;
  P.fill(blob(CASE), 0.0, 0, { style: 2 });
  const dir = idw([[590, 60, 2.03], [520, 170, 2.08], [420, 270, 2.14], [300, 330, 2.16], [240, 420, 2.1], [170, 500, 2.05], [110, 570, 1.95], [74, 650, 1.7], [100, 728, 1.0], [190, 756, 0.25], [280, 700, 1.75], [260, 560, 1.95], [340, 470, 2.05], [460, 360, 2.1]]);
  const val = (x, y) => 0.13 + 0.42 * gs(x, y, 565, 160, 45, 100) + 0.24 * gs(x, y, 140, 520, 60, 70) + 0.1 * gs(x, y, 200, 640, 110, 110) - 0.06 * gs(x, y, 300, 600, 60, 200);
  flow(o, blob(CASE), [30, 0, 700, 780], { dir, val, sp: 7.5, len: [50, 220], w: 2.8, seed: 21, aspect: 1.3, brk: 0.25, gamma: 0.9 });
  // bold outer rim and the lid seam inside it
  line(o, CASE_RIM, 4.6, W_(0.88), 5, 0.5);
  line(o, CASE_RIM.map(([x, y], i) => [x + 13 + (i > 10 ? 6 : 0), y + (i > 12 ? -12 : i > 10 ? -6 : 4)]), 2.2, W_(0.6), 5, 0.3);
  line(o, [[690, 0], [652, 110], [602, 205], [560, 292], [530, 352]], 3, W_(0.6), 5, 0.6);
  line(o, [[662, 0], [626, 112], [578, 208], [540, 290]], 1.6, W_(0.4), 5, 0.4);
  // scratch marks in the neck highlight
  const rs = rng(24);
  for (let i = 0; i < 9; i++) { const x = 520 + rs() * 60, y = 100 + rs() * 70; line(o, [[x, y], [x + 18 + rs() * 10, y + 30 + rs() * 16]], 1.4, W_(0.5 + 0.3 * rs()), 2, 0.3); }
  // handle: a dark arched tube with a white rim line
  line(o, CASE_HANDLE, 12, K_(1)); line(o, CASE_HANDLE, 3.4, W_(0.85));
  line(o, CASE_HANDLE.map(([x, y]) => [x + 2, y + 9]), 2, W_(0.45));
  for (const [x, y] of [[256, 300], [366, 258]]) { o.fillStyle = W_(0.6); o.beginPath(); o.roundRect(x - 9, y - 6, 18, 12, 3); o.fill(); o.strokeStyle = K_(1); o.lineWidth = 2; o.stroke(); }
  // clasps: a hinged metal plate with a lever and a slot
  for (const [x, y, w, h, a] of LATCHES) {
    o.save(); o.translate(x, y); o.rotate(a);
    const gr = o.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); gr.addColorStop(0, "rgb(210,208,200)"); gr.addColorStop(1, "rgb(110,108,104)");
    o.fillStyle = gr; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 5); o.fill();
    o.strokeStyle = "#080808"; o.lineWidth = 2.4; o.stroke();
    o.fillStyle = "rgb(60,58,56)"; o.beginPath(); o.roundRect(-w * 0.18, -h * 0.28, w * 0.5, h * 0.56, 3); o.fill(); o.stroke();
    o.fillStyle = "rgb(225,222,214)"; o.beginPath(); o.roundRect(-w / 2 - 6, -h * 0.22, 10, h * 0.44, 2); o.fill(); o.stroke();
    o.fillStyle = "#080808"; o.beginPath(); o.arc(w * 0.36, 0, 2.6, 0, 7); o.fill();
    o.restore();
  }
}

// --- the milk crate: a framed slatted top rail with a dark border, lattice sides with thick bars, corner posts and
// metal corner protectors, a coiled black cable heaped on top
function paintCrate(P) {
  const o = P.o, c = CR;
  P.fill(poly([c.ftl, c.ftr, [c.btr[0], c.btr[1]], c.bbr, c.fbr, c.fbl]), 0.0, Math.PI / 2, { spacing: 0.3 });
  // coiled cable heaped on the lid (behind the rail)
  const r = rng(47);
  for (let k = 0; k < 5; k++) {
    const cx = 715 + (r() - 0.5) * 50, cy = 368 - k * 7, rx = 150 - k * 14 + r() * 16, ry = 44 - k * 3;
    tube(o, arcPts(cx, cy, rx, ry, Math.PI * (1.0 + 0.04 * r()), Math.PI * (1.98 - 0.04 * r()), 30), 15 - k * 0.8);
  }
  tube(o, [[560, 350], [600, 322], [660, 312], [720, 318]], 13);
  // front top rail: dark frame, bright slats inside
  const rimF = [c.ftl, c.ftr, [c.ftr[0], c.rimB - 6], [c.ftl[0] - 6, c.rimB]];
  P.fill(poly(rimF), 0.0, Math.PI / 2, { spacing: 0.3 });
  const inF = [[c.ftl[0] + 12, c.ftl[1] + 14], [c.ftr[0] - 14, c.ftr[1] + 12], [c.ftr[0] - 14, c.rimB - 18], [c.ftl[0] + 8, c.rimB - 12]];
  flow(o, poly(inF), [360, 380, 700, 480], { dir: () => Math.PI / 2, val: (x) => 0.36 + 0.3 * clamp(1 - (x - 380) / 300), sp: 6.5, len: [40, 90], w: 3.6, seed: 41, aspect: 0.9, gamma: 1 });
  line(o, [...inF, inF[0]], 2.2, W_(0.5), 2, 0.9);
  line(o, [c.ftl, c.ftr], 4.2, W_(0.85)); line(o, [[c.ftl[0] - 6, c.rimB], [c.ftr[0], c.rimB - 6]], 4, W_(0.8));
  line(o, [[c.ftl[0] - 4, c.rimB + 12], [c.ftr[0], c.rimB + 6]], 2, W_(0.45));
  line(o, [[c.ftl[0] - 26, c.ftl[1] + 8], c.ftl, [c.ftl[0] - 6, c.rimB]], 3, W_(0.6));
  // front lattice with thick bars
  latt(o, [[c.ftl[0] - 16, c.rimB + 12], [c.ftr[0] - 24, c.rimB + 6], [c.fbr[0] - 24, 740], [c.fbl[0] + 12, 738]], 84, 3.4, 0.85);
  // front left post (dark, lit edge) and front right corner post (lit)
  line(o, [[c.fbl[0] + 6, c.rimB], [c.fbl[0], 742]], 3, W_(0.55));
  line(o, [[c.fbl[0] + 24, c.rimB + 8], [c.fbl[0] + 20, 740]], 1.6, W_(0.3));
  const postR = [[c.ftr[0] - 36, c.ftr[1]], [c.ftr[0] + 12, c.ftr[1] - 2], [c.fbr[0] + 6, c.fbr[1] - 20], [c.fbr[0] - 40, c.fbr[1] - 20]];
  P.fill(poly(postR), 0.05, Math.PI / 2, { style: 2 });
  flow(o, poly(postR), [640, 360, 710, 760], { dir: () => Math.PI / 2 + 0.01, val: (x) => 0.35 + 0.45 * clamp((x - 650) / 50), sp: 5.5, len: [80, 260], w: 3, seed: 44, aspect: 0.8 });
  line(o, [postR[0], postR[3]], 2.6, K_(0.9)); line(o, [postR[1], postR[2]], 2.8, W_(0.8));
  // right (short) face: rim band with a raised slatted panel, the handle hole, lattice, lit back post
  const rtl = [c.ftr[0] + 12, c.ftr[1]], rbl = [c.fbr[0] + 6, c.fbr[1] - 20];
  const rimR = [rtl, c.btr, [c.btr[0], c.btr[1] + 100], [rtl[0], rtl[1] + 150]];
  P.fill(poly(rimR), 0.02, Math.PI / 2, { style: 2 });
  const pan = [[722, 392], [852, 418], [852, 470], [722, 452]];
  flow(o, poly(pan), [720, 385, 855, 475], { dir: () => Math.PI / 2, val: () => 0.5, sp: 6, len: [40, 80], w: 3.4, seed: 43, aspect: 0.9, gamma: 1 });
  line(o, [...pan, pan[0]], 2.4, W_(0.7), 2, 0.9);
  line(o, [rtl, c.btr], 3.8, W_(0.9)); line(o, [[rtl[0], rtl[1] + 150], [c.btr[0], c.btr[1] + 100]], 3, W_(0.75));
  P.fill(blob([[740, 478], [858, 500], [862, 562], [744, 544]]), 0.0, 0, { style: 2 });
  line(o, [[734, 472], [864, 494], [868, 568], [740, 552], [734, 472]], 2.6, W_(0.7));
  latt(o, [[rtl[0] + 4, 574], [c.btr[0] - 36, 562], [c.bbr[0] - 30, c.bbr[1] - 22], [rbl[0] + 6, rbl[1] - 10]], 56, 3.6, 0.95);
  const bp = [[c.btr[0] - 40, c.btr[1] + 10], [c.btr[0] + 6, c.btr[1] + 10], [c.bbr[0] + 4, c.bbr[1]], [c.bbr[0] - 40, c.bbr[1]]];
  P.fill(poly(bp), 0.05, Math.PI / 2, { style: 2 });
  flow(o, poly(bp), [860, 420, 915, 765], { dir: () => Math.PI / 2, val: (x) => 0.3 + 0.4 * clamp((905 - x) / 40), sp: 5.5, len: [80, 240], w: 3, seed: 45, aspect: 0.8 });
  line(o, [bp[0], bp[3]], 2.2, K_(0.9)); line(o, [bp[1], bp[2]], 2.4, W_(0.7));
  // bottom rails and corner protectors
  line(o, [[c.fbl[0], c.fbl[1] - 10], [c.fbr[0] - 40, c.fbr[1] - 16]], 3.4, W_(0.6));
  line(o, [[c.fbl[0] + 4, c.fbl[1] - 26], [c.fbr[0] - 40, c.fbr[1] - 30]], 1.6, W_(0.35));
  line(o, [[rbl[0], rbl[1] + 4], [c.bbr[0], c.bbr[1] - 6]], 3.4, W_(0.85));
  for (const [x, y, w, h, v] of [[300, 722, 50, 48, 0.3], [640, 724, 64, 52, 0.85], [856, 722, 44, 42, 0.8]]) {
    P.fill(poly([[x, y], [x + w, y + 3], [x + w, y + h], [x, y + h - 2]]), v, 0, { style: 2 });
    line(o, [[x, y], [x + w, y + 3], [x + w, y + h], [x, y + h - 2], [x, y]], 2, K_(1), 2, 0.9);
    o.fillStyle = K_(1); o.beginPath(); o.arc(x + w * 0.55, y + h * 0.55, 4.5, 0, 7); o.fill();
    o.fillStyle = W_(0.6); o.beginPath(); o.arc(x + w * 0.55 - 1, y + h * 0.55 - 1, 1.5, 0, 7); o.fill();
  }
  // the braided cable over the right corner, down to the floor
  cableRope(o, [[722, 330], [742, 350], [752, 457], [758, 564], [769, 671], [797, 743], [840, 779]], 11);
}
// a lattice of diamond bars inside a quad (bilinear), bar spacing in px
function latt(o, q, sp, w, a) {
  const [p0, p1, p2, p3] = q;
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), H = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
  const n = Math.max(2, Math.round(L / sp)), m = Math.max(1, (H / L) * n);
  const P = (u, v) => lerp2(lerp2(p0, p1, u), lerp2(p3, p2, u), v);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  for (let k = -Math.ceil(m) - 1; k <= n + 1; k++) {
    for (const s of [1, -1]) {
      const u0 = k / n, u1 = u0 + s * m / n;
      const A0 = P(u0, 0), A1 = P(u1, 1);
      const d = [A1[0] - A0[0], A1[1] - A0[1]];
      const B0 = [A0[0] - d[0] * 0.05, A0[1] - d[1] * 0.05], B1 = [A1[0] + d[0] * 0.05, A1[1] + d[1] * 0.05];
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], () => w + 2.8, K_(0.95));
      o.globalAlpha = a;
      taper(o, [B0, lerp2(B0, B1, 0.5), B1], (u) => w * (0.75 + 0.25 * Math.sin(Math.PI * u)), INK);
      o.globalAlpha = 1;
    }
  }
  o.restore();
}
// a thick black rubber cable: dark tube with a bright rim highlight along its top
function tube(o, pts, w) {
  const q = sampleCurve(pts, 8);
  taper(o, q, () => w + 3, "#040404");
  taper(o, q.map(([x, y]) => [x, y - w * 0.28]), (u) => w * 0.18 * Math.pow(Math.sin(Math.PI * u), 0.4), W_(0.8));
  taper(o, q.map(([x, y]) => [x, y + w * 0.3]), (u) => w * 0.08 * Math.pow(Math.sin(Math.PI * u), 0.4), W_(0.35));
}
// a braided cable: dark core, pale body, alternating ridges
function cableRope(o, pts, w) {
  const q = sampleCurve(pts, 10);
  taper(o, q, () => w + 3, "#050505");
  taper(o, q, () => w * 0.7, "rgba(150,148,142,0.8)");
  for (let i = 1; i < q.length - 1; i++) {
    const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    o.strokeStyle = i % 2 ? W_(0.9) : K_(0.95); o.lineWidth = 1.4;
    o.beginPath(); o.moveTo(q[i][0] - nx * w * 0.5, q[i][1] - ny * w * 0.5); o.lineTo(q[i][0] + nx * w * 0.5 + dx / d * 3, q[i][1] + ny * w * 0.5 + dy / d * 3); o.stroke();
  }
}

// --- the pale plank (vertical grain), falling into shadow at the bottom
function paintPlank(P) {
  const o = P.o;
  P.fill(poly(PLANK), (g) => { const r = g.createLinearGradient(0, 0, 0, 740); r.addColorStop(0, grey(0.7)); r.addColorStop(0.72, grey(0.62)); r.addColorStop(1, grey(0.1)); return r; }, Math.PI / 2 - 0.05, { style: 2 });
  flow(o, poly(PLANK), [1310, 0, 1550, 740], { dir: () => Math.PI / 2 - 0.045, val: (x, y) => 0.5 * clamp(1.2 - y / 700), sp: 7, len: [80, 380], w: 1.8, seed: 11, color: K_(0.8), aspect: 0.8, brk: 0.4 });
  line(o, [[1318, 0], [1324, 400], [1330, 732]], 3, K_(1));
  line(o, [[1484, 0], [1515, 360], [1545, 720]], 3, K_(1));
}
// --- the scissors leaning on the plank: chrome handles (bright rims, dark insides), solid rusty blades, cobwebs
function paintScissors(P) {
  const o = P.o;
  const piv = [1384, 450];
  const ring = (cx, cy, rx, ry, a, th) => (c) => { c.ellipse(cx, cy, rx, ry, a, 0, TAU); c.ellipse(cx + 2, cy + 3, rx - th, ry - th * 1.05, a, 0, TAU, true); };
  const chrome = (cx, cy, rx, ry) => lin(cx - rx, cy - ry, cx + rx, cy + ry, [[0, 0.95], [0.35, 0.78], [0.55, 0.9], [1, 0.4]]);
  // shanks from the rings down to the pivot
  const sh1 = [[1262, 300], [1302, 306], [piv[0] + 10, piv[1] - 10], [piv[0] - 20, piv[1] + 8]];
  const sh2 = [[1400, 290], [1436, 294], [piv[0] + 24, piv[1] + 2], [piv[0] - 8, piv[1] - 14]];
  P.fill(poly(sh1), lin(1260, 300, 1390, 450, [[0, 0.85], [1, 0.55]]), 0, { style: 2 });
  P.fill(poly(sh2), lin(1400, 290, 1400, 450, [[0, 0.9], [1, 0.6]]), 0, { style: 2 });
  for (const s of [sh1, sh2]) line(o, [...s, s[0]], 2.4, K_(1), 2, 0.9);
  // handle rings
  for (const [cx, cy, rx, ry, a, th] of [[1225, 238, 72, 100, -0.42, 22], [1436, 230, 56, 72, 0.12, 18]]) {
    P.fill(ring(cx, cy, rx, ry, a, th), chrome(cx, cy, rx, ry), 0, { style: 2 });
    o.lineWidth = 2.8; o.strokeStyle = "#080808";
    o.beginPath(); o.ellipse(cx, cy, rx, ry, a, 0, TAU); o.stroke();
    o.beginPath(); o.ellipse(cx + 2, cy + 3, rx - th, ry - th * 1.05, a, 0, TAU); o.stroke();
    // dark inner bevel and a bright specular streak
    o.lineWidth = 4; o.strokeStyle = K_(0.5); o.beginPath(); o.ellipse(cx + 2, cy + 3, rx - th + 4, ry - th * 1.05 + 4, a, 0.3, 2.6); o.stroke();
    o.lineWidth = 3; o.strokeStyle = W_(0.95); o.beginPath(); o.ellipse(cx, cy, rx - th * 0.45, ry - th * 0.5, a, 3.4, 4.6); o.stroke();
  }
  // blades: two broad blades from the pivot to the tip, opaque, darker toward the tip, dark edges, rust speckle
  const b2 = [[piv[0] - 36, piv[1] + 34], [piv[0] + 24, piv[1] + 24], [1478, 772], [1456, 792]];
  const b1 = [[piv[0] - 50, piv[1] + 14], [piv[0] + 30, piv[1] - 20], [1504, 772], [1488, 800], [1440, 700]];
  P.fill(poly(b2), lin(1360, 470, 1470, 790, [[0, 0.55], [1, 0.3]]), 0, { style: 2 });
  P.fill(poly(b1), lin(1360, 450, 1500, 790, [[0, 0.72], [0.6, 0.55], [1, 0.36]]), 0, { style: 2 });
  for (const b of [b2, b1]) line(o, [...b, b[0]], 2.8, K_(1), 2, 0.9);
  line(o, [[piv[0] + 26, piv[1] - 16], [1452, 600], [1500, 770]], 2.2, W_(0.95));
  const rs = rng(55);
  o.save(); o.beginPath(); poly(b1)(o); poly(b2)(o); o.clip();
  for (let i = 0; i < 260; i++) {
    const t = 0.15 + rs() * 0.85, x = piv[0] - 30 + (1500 - piv[0] + 30) * t + (rs() - 0.5) * 60 * (1 - t * 0.6), y = piv[1] + (790 - piv[1]) * t + (rs() - 0.5) * 20;
    o.fillStyle = rs() < 0.7 ? K_(0.12 + rs() * 0.35) : W_(0.2 + 0.3 * rs()); o.beginPath(); o.arc(x, y, 0.8 + rs() * 2.6, 0, 7); o.fill();
  }
  o.restore();
  // pivot screw and rivet
  o.fillStyle = "rgb(222,220,212)"; o.beginPath(); o.arc(piv[0], piv[1], 13, 0, 7); o.fill();
  o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.5; o.stroke();
  o.beginPath(); o.moveTo(piv[0] - 8, piv[1] + 3); o.lineTo(piv[0] + 8, piv[1] - 3); o.stroke();
  o.fillStyle = "rgb(200,198,190)"; o.beginPath(); o.arc(1368, 424, 6, 0, 7); o.fill(); o.stroke();
  // cobwebs strung between the handles, the blades and the plank edges
  const rc = rng(61);
  const anchors = [[1284, 160], [1300, 250], [1318, 200], [1350, 330], [1405, 320], [1440, 410], [1478, 560], [1520, 700], [1420, 680], [1380, 760], [1560, 790], [1330, 610], [1290, 700], [1262, 780], [1480, 300], [1330, 120], [1470, 160], [1500, 480]];
  o.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const a = anchors[Math.floor(rc() * anchors.length)], b = anchors[Math.floor(rc() * anchors.length)];
    if (a === b || Math.hypot(a[0] - b[0], a[1] - b[1]) > 260) continue;
    const m = [(a[0] + b[0]) / 2 + (rc() - 0.5) * 20, (a[1] + b[1]) / 2 + 10 + rc() * 15];
    o.strokeStyle = W_(0.3 + 0.4 * rc());
    o.beginPath(); o.moveTo(a[0], a[1]); o.quadraticCurveTo(m[0], m[1], b[0], b[1]); o.stroke();
  }
}
// --- the jack panel with holes, cables hanging from it, on the dark cabinet right of the plank
function paintJack(P) {
  const o = P.o;
  P.fill(poly(JACK), lin(1491, 126, 1676, 336, [[0, 0.72], [1, 0.5]]), 0.36, { style: 2 });
  line(o, [...JACK, JACK[0]], 3, K_(1), 3, 0.8);
  for (let rr = 0; rr < 2; rr++) for (let k = 0; k < 6; k++) {
    const u = (k + 0.5) / 6, v = (rr + 0.5) / 2;
    const top = lerp2(JACK[0], JACK[1], u), bot = lerp2(JACK[3], JACK[2], u), p = lerp2(top, bot, v);
    o.fillStyle = "#070707"; o.beginPath(); o.ellipse(p[0], p[1], 8, 9, 0.3, 0, 7); o.fill();
    o.fillStyle = W_(0.75); o.beginPath(); o.arc(p[0] - 2, p[1] - 3, 2.2, 0, 7); o.fill();
  }
  for (const [x0, bow] of [[1560, 30], [1590, 60], [1618, 40]]) line(o, [[x0, 300], [x0 + bow, 420], [x0 + bow * 0.8, 600], [x0 + 10, 740]], 2.6, W_(0.7));
}
// --- the right cabinet: dark wood; a band of vertical scratch strokes lit by the card along its front edge
// (measured at 57.36: 105–180 grey at x 1640–1700, fading out by x ≈ 1850)
function paintRightCabinet(P) {
  const o = P.o;
  const edge = (y) => 1640 + 0.13 * (y - 100);
  flow(o, poly(RCAB), [1580, 30, 1870, 790], { dir: () => Math.PI / 2 - 0.13, val: (x, y) => 0.62 * Math.pow(clamp(1 - (x - edge(y)) / 190), 1.3) * clamp((y - 60) / 80), sp: 7, len: [80, 300], w: 2.8, seed: 13, aspect: 0.9, brk: 0.3 });
  line(o, [[1586, 40], [1650, 100], [1760, 350], [1860, 770]], 2.4, W_(0.5));
  line(o, arcPts(1768, 330, 30, 60, -2.0, 1.2, 24), 2.2, W_(0.45));
}
// --- far right: upright boxes stacked and leaning against each other, faces of bold strokes
function paintBoxes(P) {
  const o = P.o;
  BOXES.forEach((b, i) => {
    const xs = b.map((p) => p[0]), ys = b.map((p) => p[1]);
    const ang = Math.atan2(b[2][1] - b[1][1], b[2][0] - b[1][0]);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    flow(o, poly(b), [Math.min(...xs) - 20, y0 - 10, Math.max(...xs) + 20, y1 + 10], { dir: () => ang, val: (x, y) => 0.42 * (0.55 + 0.45 * clamp(1 - (y - y0) / (y1 - y0))), sp: 8, len: [60, 200], w: 3.2, seed: 30 + i, aspect: 0.7, brk: 0.2 });
    line(o, [...b, b[0]], 3, K_(1), 3, 0.9);
    line(o, [b[0], b[1]], 1.8, W_(0.45));
  });
}
// --- the floor: black with faint plank lines (the card's light is a separate layer)
function paintFloor(P) {
  const o = P.o, rf = rng(77);
  for (let i = 0; i < 70; i++) {
    const y0 = 792 + rf() * 150, x0 = rf() * 2206;
    const L = 80 + rf() * 260, sl = (x0 - 1300) / 2600 * 0.2;
    o.globalAlpha = 0.1 + 0.2 * rf();
    line(o, [[x0, y0], [x0 + L, y0 + L * sl]], 1 + rf() * 1.4);
  }
  o.globalAlpha = 1;
  cableRope(o, [[800, 740], [840, 779], [897, 793], [1004, 786], [1120, 780], [1220, 774], [1310, 758]], 9);
}

// ---------------------------------------------------------------- floor light (card spill)
// Bright rays fanning across the floor from a point under the card. Measured at 57.36 (blurred): 185 grey at
// y 800 under the card (x 1080–1380), 110–120 at y 860, 60–90 at y 890–946 in the middle; the sides fall off fast
// (x 1680: 74 → 30; x > 1800 and x < 600: < 30).
export function paintFloorRays(g, fx = 1300, fy = 645) {
  const r = rng(91);
  g.save();
  g.beginPath(); g.rect(0, 784, 2206, 162); g.clip();
  const N = 460, y0 = 786;
  for (let i = 0; i < N; i++) {
    const xb = -900 + (4000 * (i + r())) / N;
    const d = [xb - fx, 946 - fy], L = Math.hypot(d[0], d[1]); d[0] /= L; d[1] /= L;
    const tA = (y0 - fy) / d[1], tB = (960 - fy) / d[1];
    const th = Math.abs(Math.atan2(d[0], d[1]));                 // angle of the ray from straight down
    const bright = clamp(1.3 - th / 0.95, 0, 1) * (0.55 + 0.45 * r());
    if (bright < 0.03) continue;
    const w = (1.4 + 3.4 * r()) * (0.5 + 0.5 * clamp(1 - th / 1.2));
    let u = r() * 0.15;
    while (u < 1) {
      const u1 = Math.min(1, u + 0.25 + r() * 0.9);
      if (r() > 0.18) {
        const p = [fx + d[0] * (tA + (tB - tA) * u), fy + d[1] * (tA + (tB - tA) * u)], q = [fx + d[0] * (tA + (tB - tA) * u1), fy + d[1] * (tA + (tB - tA) * u1)];
        g.globalAlpha = clamp(bright * 0.95, 0.03, 0.95);
        taper(g, [p, lerp2(p, q, 0.5), q], (t) => w * (0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.6 + 0.8 * (u + (u1 - u) * t)), INK);
      }
      u = u1 + 0.02 + r() * 0.1;
    }
  }
  // the haze right under the card edge
  g.globalAlpha = 1;
  const hz = g.createLinearGradient(0, 786, 0, 900);
  hz.addColorStop(0, "rgba(242,240,234,0.55)"); hz.addColorStop(1, "rgba(242,240,234,0)");
  g.fillStyle = hz; g.beginPath(); g.moveTo(1000, 786); g.lineTo(1680, 786); g.lineTo(1850, 900); g.lineTo(840, 900); g.closePath(); g.fill();
  g.restore();
}
