// s19 room (57.32–63.12), redrawn by hand in code. Floor-level view among the gear; the camera is locked off
// (camtrack drift < 0.3 px), so the room is one engraved plate in frame coordinates, built once.
// Every shape below was placed from gridded crops of the source (57.36 with the card standing, 63.08 with it
// carried away) and every value from blurred, un-graded measurements of those frames (region means and a few
// profiles). Nothing of the source is stored: the plate is polygons, gradients, directions and ink strokes.
//   roomPlate()  -> canvas: the static room with the floor dark (as at 63.08)
//   litFloor()   -> canvas: the floor as lit from under the standing card (bright rays), composited "lighten"
import { Plate, grey } from "../../../lib/engrave.js";
import { taper, INK } from "../../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng, clamp, noise1 } from "../../../lib/rng.js";

const W = 2206, H = 946;
const TAU = Math.PI * 2;
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const ell = (x, y, rx, ry, a = 0) => (c) => { c.ellipse(x, y, rx, ry, a, 0, TAU); };
const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const rad = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const A = (dx, dy) => Math.atan2(dy, dx);
const Wc = (a) => `rgba(242,240,234,${a})`;
const Kc = (a) => `rgba(5,5,5,${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function arcPts(cx, cy, rx, ry, a0, a1, n = 40, rot = 0) {
  const q = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; q.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return q;
}

// ---------------------------------------------------------------- mark primitives (white on black unless a colour is given)
// a swelling line through control points
function line(o, pts, w, color = INK, per = 6, end = 0.3) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.5)), color);
}
// an even line (edges of hard objects)
function edge(o, pts, w, color = INK, per = 6) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, () => w, color);
}
// streaks: tapered strokes along a direction inside a clip, spacing sp, with brightness from a value function
// val(x, y) -> 0..1 (alpha of each stroke), lengths len, width w; broken and jittered, seeded
function streaks(o, clip, box, ang, sp, w, seed, { val = () => 1, len = [60, 220], brk = 0.25, jit = 0.5, curve = 0, color = null, gap = [6, 40], wv = 0.8, soft = 0 } = {}) {
  const r = rng(seed);
  // soft (fix pass 3): grain rather than rain: more, longer, thinner, dimmer strokes with a gentle bend (the same mean
  // tone, less contrast: the source's case and cabinet wood read as fine grey grain)
  if (soft) { const v0 = val; val = (x, y) => v0(x, y) * (1 - 0.15 * soft); sp *= 1 - 0.3 * soft; w *= 1 - 0.2 * soft; len = [len[0] * (1 + 0.3 * soft), len[1] * (1 + 0.4 * soft)]; curve = Math.max(curve, 0.04 * soft); brk = Math.min(0.5, brk + 0.08 * soft); }
  o.save(); o.beginPath(); clip(o); o.clip();
  const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 20;
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  for (let s = -R; s <= R; s += sp * (0.6 + 0.8 * r())) {
    let t = -R - r() * len[1];
    while (t < R) {
      const L = len[0] + (len[1] - len[0]) * r();
      if (r() > brk) {
        const off = s + (r() - 0.5) * sp * jit;
        const a = [cx + n[0] * off + d[0] * t, cy + n[1] * off + d[1] * t], b = [a[0] + d[0] * L, a[1] + d[1] * L];
        const m = mix(a, b, 0.5), v = clamp(val(m[0], m[1]));
        if (v > 0.02) {
          const bend = curve * L * (r() - 0.5);
          const mm = [m[0] + n[0] * bend, m[1] + n[1] * bend];
          const ww = w * (1 - wv / 2 + wv * r());
          const al = v * (0.55 + 0.45 * r());
          taper(o, sampleCurve([a, mm, b], 4), (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.45), color ? color(al) : Wc(al));
        }
      }
      t += L + gap[0] + r() * (gap[1] - gap[0]);
    }
  }
  o.restore();
}
// concentric engraved rings (a speaker cone): each ring a tapered white arc whose width follows val(rn, a)
// (rn = 0..1 across the band, a = angle); broken in places. Ellipse centre moves from c0 to c1 across the band.
function rings(o, c0, c1, r0, r1, sx, sy, sp, val, seed, { brk = 0.12, wmax = 0.9 } = {}) {
  const r = rng(seed);
  for (let rr = r0; rr <= r1; rr += sp * (0.75 + 0.5 * r())) {
    const f = (rr - r0) / Math.max(1, r1 - r0), cx = c0[0] + (c1[0] - c0[0]) * f, cy = c0[1] + (c1[1] - c0[1]) * f;
    const N = Math.max(40, Math.round(rr * 0.9)), ph = r() * TAU;
    // split each ring into a few arcs with gaps
    let a = ph;
    const end = ph + TAU;
    while (a < end) {
      const span = 0.6 + r() * 2.4, a1 = Math.min(end, a + span);
      if (r() > brk) {
        const n = Math.max(6, Math.round(N * (a1 - a) / TAU)), pts = [], ws = [];
        for (let k = 0; k <= n; k++) {
          const t = a + (a1 - a) * k / n;
          pts.push([cx + Math.cos(t) * rr * sx, cy + Math.sin(t) * rr * sy]);
          const v = clamp(val(f, t) * (0.8 + 0.35 * noise1(t * 3 + rr * 0.13, seed)));
          ws.push(sp * wmax * Math.pow(v, 0.85));
        }
        taper(o, pts, (u) => ws[Math.min(n, Math.round(u * n))] * Math.min(1, Math.sin(Math.PI * u) * 4), INK);
      }
      a = a1 + 0.03 + r() * 0.25;
    }
  }
}
// a braided cable: dark body, pale sides, alternating ridge ticks
function cable(o, pts, w, { light = 0.75, seed = 3 } = {}) {
  const q = sampleCurve(pts, 10);
  taper(o, q, () => w + 3, "#040404");
  const r = rng(seed);
  for (let i = 1; i < q.length - 1; i++) {
    const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d, tx = dx / d, ty = dy / d;
    // ridges slanting across the cable
    o.strokeStyle = Wc(light * (0.55 + 0.45 * r())); o.lineWidth = 1.6;
    o.beginPath(); o.moveTo(q[i][0] - nx * w * 0.42 - tx * 2, q[i][1] - ny * w * 0.42 - ty * 2); o.lineTo(q[i][0] + nx * w * 0.42 + tx * 2, q[i][1] + ny * w * 0.42 + ty * 2); o.stroke();
  }
  // lit edge on the upper side
  taper(o, q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [p[0] + dy / d * w * 0.45, p[1] - dx / d * w * 0.45]; }), () => 1.6, Wc(light));
}
// a lattice of diamond bars inside a quad (bilinear): bars bright on one diagonal family, dimmer on the other
function lattice(o, q, n, m, w, al = [0.8, 0.6], seed = 5) {
  const [p0, p1, p2, p3] = q;
  const P = (u, v) => mix(mix(p0, p1, u), mix(p3, p2, u), v);
  const r = rng(seed);
  o.save(); o.beginPath(); poly(q)(o); o.clip();
  for (const s of [1, -1]) for (let k = -m - 1; k <= n + 1; k++) {
    const u0 = k / n, u1 = u0 + s * m / n;
    const a = P(u0, -0.05), b = P(u1, 1.05);
    taper(o, [a, mix(a, b, 0.5), b], () => w + 3.4, Kc(0.95));
    taper(o, [a, mix(a, b, 0.5), b], (u) => w * (0.7 + 0.3 * Math.sin(Math.PI * u)), Wc(al[s > 0 ? 0 : 1] * (0.75 + 0.25 * r())));
  }
  o.restore();
}

// ---------------------------------------------------------------- geometry (frame px; 63.08 / 57.36 grids)
const GRILLE = [[0, 0], [250, 0], [200, 172], [0, 124]];
const PANEL = [[0, 124], [200, 172], [214, 200], [180, 335], [60, 480], [0, 500]];
// guitar case: outline down the left side from the top, round the lower bout, and back up behind the crate
const CASE = [[455, 0], [430, 95], [405, 160], [370, 210], [330, 220], [285, 235], [258, 262], [248, 300], [226, 335], [196, 385], [150, 445],
  [100, 500], [60, 560], [38, 620], [36, 680], [56, 730], [100, 760], [180, 770], [318, 768], [338, 700], [344, 560], [356, 470],
  [392, 392], [450, 345], [520, 305], [560, 250], [595, 160], [630, 60], [650, 0]];
const HANDLE = [[256, 300], [262, 262], [285, 240], [330, 226], [362, 238]];
const LATCH = [[462, 140, 50, 30, -0.45], [252, 371, 50, 32, -0.3], [75, 646, 44, 34, -0.1]];
const CAB = [[664, 0], [1330, 0], [1330, 780], [905, 782], [905, 740], [700, 700]];
const WOOF = { cx: 1004, cy: 344, rx: 208, ry: 234 };        // outer rim (63.08)
const CONE = { cx: 1012, cy: 362, rx: 170, ry: 176 };
const HOLE = { cx: 1024, cy: 352, rx: 74, ry: 78 };
const TWEET = { cx: 1000, cy: 18, rx: 70, ry: 62 };
const PLANK = [[1312, 0], [1500, 0], [1520, 500], [1545, 790], [1385, 800], [1352, 500]];
const JACK = [[1497, 122], [1655, 222], [1676, 346], [1503, 250]];
const RCAB = [[1560, 0], [1640, 0], [1705, 170], [1762, 790], [1545, 795], [1540, 400]];
// far right cartons (57.36): slanted panel faces of dense stripes
const BOXES = [
  [[2022, 12], [2070, 0], [2112, 96], [2080, 202]],
  [[2096, 80], [2150, 60], [2206, 190], [2206, 300], [2142, 292]],
  [[2150, 205], [2206, 188], [2206, 470], [2160, 330]],
  [[2050, 392], [2092, 286], [2152, 480], [2112, 542]],
  [[2112, 542], [2170, 480], [2206, 520], [2206, 740], [2182, 746]],
];
// milk crate (63.08): front (long) face, corner post, right (short) face
const CR = {
  rimTop: [[357, 380], [705, 372]], rimBot: [[352, 470], [705, 466]], botY: 765,
  post: [[652, 372], [705, 372], [705, 770], [650, 772]],
  rTop: [[705, 372], [772, 392], [898, 408]], rRim: [[705, 372], [898, 408], [900, 490], [705, 470]],
  rPost: [[860, 405], [905, 410], [905, 765], [858, 765]],
};

// ---------------------------------------------------------------- the plate
let ROOM = null, LIT = null;
export function roomPlate() {
  if (ROOM) return ROOM;
  const P = new Plate(W, H, 1);
  paintBack(P);
  paintTopLeft(P);
  paintCase(P);
  paintCabinet(P);
  paintPlank(P);
  paintScissors(P);
  paintRight(P);
  paintCrate(P);
  paintFloorDark(P);
  ROOM = P.engrave({ spacing: 8, seed: 19, contrast: 1.0 });
  return ROOM;
}
export function releaseRoom() { ROOM = null; LIT = null; }

function paintBack(P) {
  const o = P.o;
  P.fill(poly([[0, 0], [W, 0], [W, H], [0, H]]), 0.0, 0, { style: 2 });
  // the wall between the case and the speaker: black, sparse vertical rain (63.08: 0.06 mean incl. strokes)
  streaks(o, poly([[640, 0], [700, 0], [700, 330], [600, 330]]), [600, 0, 700, 330], Math.PI / 2 + 0.1, 11, 2.2, 3, { val: (x, y) => 0.8 * (1 - y / 450), len: [60, 200], brk: 0.3, gap: [10, 60], soft: 1 });
}

function paintTopLeft(P) {
  const o = P.o;
  // amp grille: grey cells between black bars (63.08: mean 0.14)
  P.fill(poly(GRILLE), 0.0, 0, { style: 2 });
  o.save(); o.beginPath(); poly(GRILLE)(o); o.clip();
  const r = rng(4);
  for (let j = 0; j < 16; j++) for (let i = 0; i < 24; i++) {
    const x = -6 + i * 12.2 - j * 0.9, y = -4 + j * 11.6 + i * 2.35;
    const v = clamp(0.46 + 0.14 * (r() - 0.5) - 0.12 * (j / 16));
    o.fillStyle = grey(v); o.beginPath(); o.moveTo(x + 2, y + 2); o.lineTo(x + 10, y + 3.8); o.lineTo(x + 9.4, y + 11.2); o.lineTo(x + 1.3, y + 9.6); o.closePath(); o.fill();
  }
  o.restore();
  edge(o, [[0, 126], [200, 173]], 5, Kc(1));
  line(o, [[0, 133], [110, 158], [205, 181]], 2.2, Wc(0.35));
  line(o, [[250, 0], [226, 90], [201, 172]], 2.0, Wc(0.4));
  // the panel under it: long diagonal streaks down-left, fading down (63.08: 0.075)
  P.fill(poly(PANEL), 0.0, 0, { style: 2 });
  streaks(o, poly(PANEL), [0, 124, 214, 500], A(-0.45, 1), 8, 3.2, 5, { val: (x, y) => 0.8 * clamp(1.2 - (y - 150) / 260), len: [50, 160], brk: 0.25, gap: [4, 30], curve: 0.05, soft: 1 });
}

function paintCase(P) {
  const o = P.o;
  // body: black with long grain streaks along the case (63.08 un-graded: lower bout 0.094, neck 0.176)
  const ang = A(0.4, -0.92);
  P.fill(blob(CASE), 0.0, 0, { style: 2 });
  streaks(o, blob(CASE), [30, 0, 700, 770], ang, 6.5, 3.0, 21, {
    val: (x, y) => {
      // lit down the middle of the lower bout and up the neck; dark along the rims and behind the crate
      const bout = y > 330 ? clamp(1 - Math.abs(x - (230 - (y - 560) * 0.25)) / 140) : 0;
      const neck = y < 360 ? clamp(1 - Math.abs(x - (590 - y * 0.42)) / 110) : 0;
      return 0.18 + 0.45 * bout + 0.85 * neck;
    }, len: [80, 300], brk: 0.22, gap: [3, 30], curve: 0.03, wv: 1, soft: 1,
  });
  // outline and the lid seam just inside it: pale even lines
  edge(o, CASE.slice(0, 18), 2.4, Wc(0.6));
  edge(o, [[430, 0], [408, 90], [385, 150], [350, 196], [300, 210]], 1.6, Wc(0.4));
  edge(o, [[210, 360], [168, 420], [118, 480], [78, 540], [56, 610], [54, 676], [72, 718], [112, 745], [190, 754], [300, 754]], 1.8, Wc(0.45));
  edge(o, CASE.slice(22), 2.4, Wc(0.55));
  edge(o, [[610, 0], [585, 100], [560, 180], [520, 250], [460, 300], [400, 350], [370, 390]], 1.8, Wc(0.45));
  // handle: a dark loop with a pale rim
  // the handle (fix pass 3): a padded loop standing off the upper bout, grey with a bright top edge and a pale inner
  // contour, its two feet bolted to the lid
  const HL = [[262, 266], [270, 236], [298, 218], [334, 216], [352, 232]];
  edge(o, HL, 17, Kc(1)); edge(o, HL, 12, grey(0.3)); line(o, HL.map(([x, y]) => [x, y - 4]), 2.6, Wc(0.85)); line(o, HL.map(([x, y]) => [x + 2, y + 5]), 1.4, Wc(0.4));
  for (const [x, y] of [[262, 268], [352, 234]]) { o.fillStyle = grey(0.5); o.beginPath(); o.roundRect(x - 9, y - 5, 18, 12, 3); o.fill(); o.strokeStyle = Kc(1); o.lineWidth = 2; o.stroke(); }
  line(o, HANDLE, 1.6, Wc(0.35));
  // latches
  for (const [x, y, w, h, a] of LATCH) {
    o.save(); o.translate(x, y); o.rotate(a);
    o.fillStyle = "rgba(150,148,142,0.95)"; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 5); o.fill();
    o.fillStyle = "#0a0a0a"; o.beginPath(); o.roundRect(-w * 0.22, -h * 0.22, w * 0.44, h * 0.44, 3); o.fill();
    o.strokeStyle = Wc(0.9); o.lineWidth = 2; o.beginPath(); o.roundRect(-w / 2, -h / 2, w, h, 5); o.stroke();
    o.strokeStyle = Kc(1); o.lineWidth = 2; o.beginPath(); o.moveTo(-w / 2 - 4, h / 2 + 2); o.lineTo(w / 2 + 4, h / 2 + 2); o.stroke();
    o.restore();
  }
}

function paintCabinet(P) {
  const o = P.o;
  // the speaker cabinet: black wood with vertical grain, brighter in the upper right and along the base
  P.fill(poly(CAB), 0.0, 0, { style: 2 });
  streaks(o, poly(CAB), [664, 0, 1330, 790], Math.PI / 2 + 0.015, 10, 2.2, 7, {
    // (fix pass 3, 63.00 region means: the cabinet's right edge behind the scissors reads 30–110 graded down to y ≈ 450)
    val: (x, y) => 0.3 + 0.5 * clamp(1 - y / 140) + 0.4 * clamp((x - 1150) / 150) * clamp(1 - y / 260) + 0.45 * clamp((x - 1130) / 110) * clamp(1 - (y - 250) / 250) + 0.3 * clamp((y - 560) / 150) * clamp((x - 700) / 200),
    len: [40, 240], brk: 0.35, gap: [8, 60], wv: 1, soft: 1,
  });
  // the cabinet's lit right edge behind the scissors (63.00: 40–110 graded over x 1215–1330, fading out by y ≈ 480)
  streaks(o, poly([[1212, 0], [1330, 0], [1330, 480], [1212, 480]]), [1212, 0, 1330, 480], Math.PI / 2 + 0.015, 6, 2.6, 17, {
    val: (x, y) => 0.85 * clamp(1 - (y - 220) / 260) * (0.6 + 0.4 * clamp((x - 1212) / 60)), len: [60, 260], brk: 0.15, gap: [4, 24], wv: 1, soft: 1,
  });
    // the dotted "rain" low on the cabinet (63.08: dotted vertical streaks x 800–1300, y 590–760)
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = 800 + r() * 500, y0 = 590 + r() * 90, L = 40 + r() * 110;
    for (let y = y0; y < y0 + L && y < 760; y += 5 + r() * 5) { o.fillStyle = Wc(0.25 + 0.45 * r()); o.fillRect(x + (y - y0) * 0.01, y, 1.4, 2.2); }
  }
  edge(o, [[905, 745], [1300, 745]], 1.4, Wc(0.3));
  edge(o, [[905, 752], [1300, 752]], 1.4, Wc(0.25));
  paintTweeter(P);
  paintWoofer(P);
  // the cable along the cabinet base (bright braided, 63.08: from the crate's post out to the plank)
  cable(o, [[850, 770], [900, 786], [960, 781], [1020, 776], [1080, 780], [1160, 783], [1240, 781], [1300, 770], [1330, 762]], 8, { light: 0.85, seed: 12 });
}

function paintTweeter(P) {
  const o = P.o, T = TWEET;
  P.fill(ell(T.cx, T.cy, T.rx, T.ry), 0.0, 0, { style: 2 });
  o.fillStyle = "#000"; o.beginPath(); o.ellipse(T.cx, T.cy, T.rx + 2, T.ry + 2, 0, 0, TAU); o.fill();
  rings(o, [T.cx + 8, T.cy - 4], [T.cx, T.cy], 22, T.rx - 12, 1, T.ry / T.rx, 4.5, (f, a) => 0.8 * (0.35 + 0.6 * clamp(Math.cos(a - 2.2) * 0.8 + 0.3) * (0.4 + 0.6 * f)), 29, { brk: 0.14 });
  edge(o, arcPts(T.cx, T.cy, T.rx, T.ry, 0, TAU, 60), 3, Wc(0.5));
  edge(o, arcPts(T.cx, T.cy, T.rx - 9, T.ry - 8, 0.2, 3.3, 40), 1.6, Wc(0.4));
  const g = o.createRadialGradient(T.cx + 12, T.cy - 4, 0, T.cx + 12, T.cy - 4, 22);
  g.addColorStop(0, Wc(0.95)); g.addColorStop(0.5, Wc(0.5)); g.addColorStop(1, Wc(0));
  o.fillStyle = g; o.beginPath(); o.arc(T.cx + 12, T.cy - 4, 22, 0, TAU); o.fill();
}

// periodic linear interpolation through [angle°, value] knots
const perio = (K) => (a) => { let d = ((a * 180 / Math.PI) % 360 + 360) % 360; for (let i = 0; i < K.length; i++) { const [a0, v0] = K[i], [a1, v1] = K[(i + 1) % K.length]; const e = a1 > a0 ? a1 : a1 + 360, dd = d < a0 ? d + 360 : d; if (dd >= a0 && dd <= e) return v0 + (v1 - v0) * (dd - a0) / (e - a0); } return K[0][1]; };
// the cone's measured angular profile (un-graded blurred values at 63.08 round the hole, 0° = right, 90° = down):
// bright on the left and lower left, mid below, dark over the top and upper right
const CONE_A = perio([[0, 0.24], [45, 0.55], [90, 0.58], [135, 0.74], [165, 0.95], [195, 0.85], [225, 0.58], [255, 0.33], [285, 0.12], [315, 0.06], [345, 0.13]]);
function paintWoofer(P) {
  const o = P.o, R = WOOF, Hh = HOLE;
  P.fill(ell(R.cx, R.cy, R.rx, R.ry), 0.0, 0, { style: 2 });
  o.fillStyle = "#000"; o.beginPath(); o.ellipse(R.cx, R.cy, R.rx + 2, R.ry + 2, 0, 0, TAU); o.fill();
  // cone + surround: concentric rings from the hole (f = 0) to the rim (f = 1); coverage = the measured value
  const k = (f) => (f < 0.6 ? 1 : f < 0.76 ? 1 - (f - 0.6) / 0.16 * 0.7 : f < 0.86 ? 0.3 - (f - 0.76) / 0.1 * 0.25 : 0.05);
  // a soft base tone under the rings (the source cone reads as a grey gradient crossed by fine rings)
  o.save(); o.globalAlpha = 0.68; ringsE(o, R, Hh, 0.33, 0.97, 7, (f, a) => Math.min(1, CONE_A(a) * k(f) * 1.1), 34, 1.25); o.restore();
  ringsE(o, R, Hh, 0.33, 0.97, 3.2, (f, a) => CONE_A(a) * k(f) * 0.55, 33);
  // the surround: a raised ring round the cone, lit over the upper left and the top (63.08 rim profile)
  // the surround (fix pass 3): a thick near-black rubber roll between the cone and the frame, one soft highlight
  // along its top left; outside it the grey metal frame ring (the source's heavy black rim)
  o.save(); o.lineWidth = R.ry * 0.085; o.strokeStyle = "#060606"; o.beginPath(); o.ellipse(R.cx - 3, R.cy + 2, R.rx * 0.91, R.ry * 0.91, 0, 0, TAU); o.stroke(); o.restore();
  edge(o, arcPts(R.cx - 3, R.cy + 2, R.rx * 0.9, R.ry * 0.9, 3.5, 5.3, 40), 3.2, Wc(0.35));
  edge(o, arcPts(R.cx - 3, R.cy + 2, R.rx * 0.93, R.ry * 0.93, 3.7, 5.0, 30), 1.4, Wc(0.25));
  o.save(); o.lineWidth = R.ry * 0.045; o.strokeStyle = grey(0.24); o.beginPath(); o.ellipse(R.cx, R.cy, R.rx * 0.985, R.ry * 0.985, 0, 0, TAU); o.stroke(); o.restore();
  // the throat: black, a hazy cross-hatched highlight on the dust cap
  o.fillStyle = "#030303"; o.beginPath(); o.ellipse(Hh.cx, Hh.cy, Hh.rx, Hh.ry, 0, 0, TAU); o.fill();
  const hx = 1045, hy = 322, g = o.createRadialGradient(hx, hy, 0, hx, hy, 40);
  g.addColorStop(0, Wc(1)); g.addColorStop(0.2, Wc(0.8)); g.addColorStop(0.55, Wc(0.2)); g.addColorStop(1, Wc(0));
  o.fillStyle = g; o.beginPath(); o.arc(hx, hy, 40, 0, TAU); o.fill();
  o.save(); o.beginPath(); o.arc(hx, hy + 6, 42, 0, TAU); o.clip();
  for (let i = -8; i <= 8; i++) for (const s of [1, -1]) { o.strokeStyle = Wc(0.18); o.lineWidth = 1; o.beginPath(); o.moveTo(hx - 50, hy + i * 7 - s * 30); o.lineTo(hx + 50, hy + i * 7 + s * 30); o.stroke(); }
  o.restore();
  // rim: the surround's outer edge catches light over the top right and on the left; screws
  edge(o, arcPts(R.cx, R.cy, R.rx, R.ry, 4.2, 6.1, 50), 3.0, Wc(0.6));
  edge(o, arcPts(R.cx, R.cy, R.rx - 12, R.ry - 12, 3.2, 4.4, 40), 2.2, Wc(0.45));
  edge(o, arcPts(R.cx, R.cy, R.rx, R.ry, 1.9, 3.3, 40), 1.6, Wc(0.3));
  for (const a of [-2.3, 2.35]) { const x = R.cx + Math.cos(a) * (R.rx - 14), y = R.cy + Math.sin(a) * (R.ry - 14); o.fillStyle = Wc(0.7); o.beginPath(); o.arc(x, y, 5.5, 0, TAU); o.fill(); o.fillStyle = Kc(1); o.beginPath(); o.arc(x, y, 2.5, 0, TAU); o.fill(); }
}
// rings between two ellipses: outer E (f = 1) and inner I (f = 0 at fraction f0 of E's size)
function ringsE(o, E, I, f0, f1, sp, val, seed, wk = 1.3) {
  const r = rng(seed);
  const n = Math.round(((f1 - f0) * E.ry) / sp);
  for (let k = 0; k <= n; k++) {
    const f = f0 + (f1 - f0) * (k + 0.2 * (r() - 0.5)) / Math.max(1, n);
    const t = (f - f0) / Math.max(1e-6, f1 - f0);
    const cx = I.cx + (E.cx - I.cx) * t, cy = I.cy + (E.cy - I.cy) * t;
    const rx = E.rx * f, ry = E.ry * f;
    let a = r() * TAU; const end = a + TAU;
    while (a < end) {
      const a1 = Math.min(end, a + 0.5 + r() * 2.6);
      if (r() > 0.04) {
        const m = Math.max(8, Math.round(Math.max(rx, ry) * (a1 - a) * 0.6)), pts = [], ws = [];
        for (let j = 0; j <= m; j++) {
          const q = a + (a1 - a) * j / m;
          pts.push([cx + Math.cos(q) * rx, cy + Math.sin(q) * ry]);
          ws.push(sp * wk * clamp(val(t, q) * (0.85 + 0.3 * noise1(q * 4 + k * 1.7, seed))));
        }
        taper(o, pts, (u) => ws[Math.min(m, Math.round(u * m))] * Math.min(1, Math.sin(Math.PI * u) * 5), INK);
      }
      a = a1 + 0.01 + r() * 0.08;
    }
  }
}

function paintPlank(P) {
  const o = P.o;
  // pale wood board (63.08 un-graded: 0.6–0.75 across the top, 0.45 down its left edge, 0.6–0.75 down its right part)
  P.fill(poly(PLANK), lin(1310, 0, 1505, 0, [[0, 0.48], [0.12, 0.62], [0.45, 0.66], [0.7, 0.62], [1, 0.55]]), 0, { style: 2 });
  streaks(o, poly(PLANK), [1305, 0, 1525, 800], Math.PI / 2 - 0.012, 9, 1.6, 12, { val: () => 0.35, len: [100, 400], brk: 0.45, gap: [30, 120] });
  streaks(o, poly(PLANK), [1305, 0, 1525, 800], Math.PI / 2 - 0.012, 8, 1.6, 11, { val: () => 0.6, len: [80, 300], brk: 0.35, color: (a) => Kc(0.4 * a), gap: [20, 90] });
  edge(o, [[1312, 0], [1352, 500], [1385, 800]], 3, Kc(1));
  edge(o, [[1500, 0], [1520, 500], [1545, 790]], 2.4, Kc(0.9));
}

function paintScissors(P) {
  const o = P.o;
  // measured on 63.08 (1.2x boosted grid of the un-graded frame): two thick loops (bows) at the top, shanks meeting
  // at the pivot screw (1385, 452), two long blades down to the tips at (1470–1505, 790–800)
  // the bows (fix pass 3): open rings (what is behind shows through the holes: the woofer on the left, the plank
  // on the right), ≈ 14–18 px of engraved steel: a grey band, a bright bevel over the top, a dark bevel low inside,
  // rust speckle, dark keylines
  const ring = (cx, cy, rx, ry, a, th) => {
    const ann = (q) => { q.ellipse(cx, cy, rx, ry, a, 0, TAU); q.moveTo(cx + 2 + Math.cos(a) * (rx - th), cy + 3 + Math.sin(a) * (rx - th)); q.ellipse(cx + 2, cy + 3, rx - th, ry - th * 1.1, a, 0, TAU, true); };
    P.fill(ann, 0.6, a + 1.2, { style: 2 });
    o.fillStyle = grey(0.62); o.beginPath(); ann(o); o.fill();
    o.save(); o.beginPath(); ann(o); o.clip();
    o.lineWidth = th * 0.5; o.strokeStyle = grey(0.32); o.beginPath(); o.ellipse(cx + 3, cy + 5, rx - th * 0.55, ry - th * 0.6, a, 0.1, 2.8); o.stroke();
    o.lineWidth = th * 0.3; o.strokeStyle = grey(0.95); o.beginPath(); o.ellipse(cx - 1, cy - 2, rx - th * 0.3, ry - th * 0.3, a, 3.5, 5.7); o.stroke();
    const rs = rng(Math.round(cx));
    for (let i = 0; i < 70; i++) { const t = rs() * TAU, k = 1 - th * (0.2 + 0.6 * rs()) / rx; o.fillStyle = Kc(0.15 + 0.35 * rs()); o.beginPath(); o.arc(cx + Math.cos(t) * rx * k * Math.cos(a) - Math.sin(t) * ry * k * Math.sin(a), cy + Math.cos(t) * rx * k * Math.sin(a) + Math.sin(t) * ry * k * Math.cos(a), 0.8 + rs() * 1.8, 0, TAU); o.fill(); }
    o.restore();
    o.lineWidth = 3.0; o.strokeStyle = "#0a0a0a"; o.beginPath(); o.ellipse(cx, cy, rx, ry, a, 0, TAU); o.stroke();
    o.lineWidth = 2.4; o.beginPath(); o.ellipse(cx + 2, cy + 3, rx - th, ry - th * 1.1, a, 0, TAU); o.stroke();
  };
  // shanks from the loops down to the pivot (behind the loops' lower ends)
  const shL = [[1238, 318], [1292, 300], [1372, 420], [1350, 446], [1318, 430]];
  const shR = [[1362, 316], [1416, 322], [1404, 400], [1392, 440], [1356, 432]];
  for (const [q, v] of [[shR, 0.7], [shL, 0.82]]) { P.fill(poly(q), v, 1.0, { style: 2 }); o.fillStyle = grey(v); o.beginPath(); poly(q)(o); o.fill(); edge(o, [...q, q[0]], 2.8, Kc(1)); }
  edge(o, [[1250, 322], [1300, 360], [1340, 410]], 2.2, Wc(0.95));
  ring(1222, 232, 70, 96, -0.35, 18);
  ring(1426, 230, 54, 80, 0.12, 15);
  // blades: the back blade (right) behind, the front blade (left) over it
  const back = [[1395, 400], [1442, 392], [1506, 786], [1494, 800], [1452, 640]];
  const front = [[1305, 402], [1400, 440], [1424, 500], [1482, 790], [1470, 802], [1400, 600]];
  P.fill(poly(back), 0.45, A(64, 386), { style: 2 });
  o.fillStyle = lin(1420, 400, 1500, 790, [[0, 0.5], [1, 0.36]])(o); o.beginPath(); poly(back)(o); o.fill();
  P.fill(poly(front), 0.55, A(170, 400), { style: 2 });
  o.fillStyle = lin(1340, 420, 1470, 800, [[0, 0.66], [0.5, 0.52], [1, 0.42]])(o); o.beginPath(); poly(front)(o); o.fill();
  // engraved grain along the blades
  streaks(o, (q) => { poly(front)(q); poly(back)(q); }, [1300, 390, 1510, 805], A(120, 390), 5, 1.2, 57, { val: () => 0.35, len: [40, 160], brk: 0.3, gap: [6, 30], color: (al) => Kc(0.5 * al) });
  // the ricasso step and the bright cutting edges
  o.fillStyle = grey(0.28); o.beginPath(); poly([[1362, 478], [1410, 486], [1420, 502], [1370, 494]])(o); o.fill();
  line(o, [[1306, 404], [1400, 600], [1470, 800]], 2.4, Wc(1));
  line(o, [[1442, 394], [1480, 600], [1505, 786]], 1.8, Wc(0.9));
  edge(o, [...back, back[0]], 2.4, Kc(1)); edge(o, [...front, front[0]], 2.6, Kc(1));
  // rust and grime speckles, heavier toward the tips
  const rs = rng(55);
  o.save(); o.beginPath(); poly(front)(o); poly(back)(o); o.clip();
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(rs(), 0.7), y = 440 + (800 - 440) * t, x = 1330 + (1470 - 1330) * t + (rs() - 0.3) * (130 - 90 * t);
    o.fillStyle = rs() < 0.25 ? `rgba(120,86,60,${0.3 + 0.3 * rs()})` : Kc(0.15 + rs() * 0.45 * t); o.beginPath(); o.ellipse(x, y, 0.8 + rs() * 3, 0.8 + rs() * 5, 0.4, 0, TAU); o.fill();
  }
  o.restore();
  // the pivot screw and a rivet
  o.fillStyle = grey(0.9); o.beginPath(); o.ellipse(1385, 452, 14, 11, 0.4, 0, TAU); o.fill();
  o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.4; o.stroke();
  o.beginPath(); o.moveTo(1377, 456); o.lineTo(1393, 448); o.stroke();
  o.beginPath(); o.ellipse(1376, 424, 5, 4, 0.4, 0, TAU); o.stroke();
  // cobwebs (fix pass 3): sagging strands strung between the bows, the blades and the plank (each sags by ≈ 8–15 % of
  // its span, hanging down), and two small webs: in the right bow's corner against the plank, and low between the
  // back blade and the plank's edge (the source's dense grey webbing, 1300–1540 × 200–780)
  const rc = rng(61);
  const anchors = [[1262, 158], [1290, 300], [1340, 214], [1372, 318], [1452, 300], [1478, 320], [1500, 250], [1512, 420], [1486, 540], [1520, 690], [1452, 700],
    [1420, 560], [1540, 780], [1470, 790], [1395, 470], [1440, 420], [1528, 330], [1360, 400]];
  let nS = 0;
  for (let i = 0; i < 200 && nS < 26; i++) {
    const a = anchors[Math.floor(rc() * anchors.length)], b = anchors[Math.floor(rc() * anchors.length)];
    const L = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (a === b || L > 240 || L < 40) continue;
    nS++;
    const m = [(a[0] + b[0]) / 2 + (rc() - 0.5) * 12, (a[1] + b[1]) / 2 + L * (0.08 + 0.08 * rc())];
    o.lineWidth = 0.9 + rc() * 0.7; o.strokeStyle = Wc(0.3 + 0.35 * rc());
    o.beginPath(); o.moveTo(a[0], a[1]); o.quadraticCurveTo(m[0], m[1], b[0], b[1]); o.stroke();
  }
  const web = (cx, cy, R, a0, a1, n, seed) => {
    const r = rng(seed), sp = [];
    for (let k = 0; k <= n; k++) { const t = a0 + (a1 - a0) * k / n + (r() - 0.5) * 0.1; sp.push(t); o.strokeStyle = Wc(0.45); o.lineWidth = 1.0; o.beginPath(); o.moveTo(cx, cy); o.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); o.stroke(); }
    for (let j = 1; j <= 6; j++) {
      const rr = R * j / 6.5;
      o.strokeStyle = Wc(0.3 + 0.2 * r()); o.lineWidth = 0.9; o.beginPath();
      sp.forEach((t, k) => { const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr; if (k) { const tm = (t + sp[k - 1]) / 2, sag = rr * 0.9; o.quadraticCurveTo(cx + Math.cos(tm) * sag, cy + Math.sin(tm) * sag, x, y); } else o.moveTo(x, y); });
      o.stroke();
    }
  };
  web(1478, 318, 70, -0.9, 1.9, 6, 71);
  web(1500, 640, 90, 1.4, 4.0, 7, 73);
  web(1436, 470, 60, -1.2, 1.5, 5, 77);
}

function paintRight(P) {
  const o = P.o;
  // the right cabinet: a black box face with a rounded lit frame (x 1508–1762, y 300–778), its top face streaked and
  // lit (x 1585–1720, y 40–330), a dark round-fronted thing beyond it at x 1700–1800
  // its lit left face: a band of bright vertical strokes ≈70 px wide right of the card's edge, from (1600, 40) at the
  // top to (1690–1765, 760) at the foot (lit and dark frames agree: un-graded 0.2–0.45)
  const face = [[1588, 36], [1650, 38], [1700, 140], [1766, 770], [1740, 792], [1640, 790], [1600, 400]];
  P.fill(poly(face), 0.0, 0, { style: 2 });
  streaks(o, poly(face), [1580, 30, 1770, 795], Math.PI / 2 - 0.1, 6.5, 2.6, 13, { val: (x, y) => 0.55 + 0.3 * clamp((y - 300) / 400), len: [80, 300], brk: 0.18, gap: [4, 24], soft: 1 });
  edge(o, [[1650, 38], [1700, 140], [1766, 770]], 2.2, Wc(0.5));
  const front = [[1536, 330], [1600, 330], [1640, 790], [1556, 786]];      // (fix pass 3: the plank shows to x ≈ 1550 low down)
  P.fill(poly(front), 0.0, 0, { style: 2 });
  edge(o, [[1520, 772], [1640, 780], [1740, 790]], 2.4, Wc(0.5));
  edge(o, [[1540, 340], [1548, 560], [1556, 780]], 1.8, Wc(0.4));
  streaks(o, poly([[1766, 330], [1800, 330], [1810, 780], [1770, 780]]), [1760, 330, 1810, 780], A(0.12, 1), 8, 2.4, 14, { val: (x, y) => 0.4 * clamp((y - 400) / 150), len: [60, 220], brk: 0.3 });
  edge(o, arcPts(1765, 340, 34, 60, -2.2, 1.6, 30), 2.0, Wc(0.45));
  streaks(o, poly([[1740, 420], [1880, 420], [1930, 780], [1770, 790]]), [1740, 420, 1930, 790], Math.PI / 2 - 0.25, 12, 2.2, 15, { val: (x, y) => 0.45 * clamp((y - 440) / 200), len: [60, 220], brk: 0.35 });
  // jack panel: a pale slanted plate with two rows of jacks, a ribbed strip under it, cables hanging down
  P.fill(poly(JACK), lin(1497, 122, 1676, 346, [[0, 0.72], [1, 0.55]]), 0.56, { style: 2 });
  edge(o, [...JACK, JACK[0]], 2.6, Kc(1));
  const row = [[1515, 160], [1545, 178], [1575, 194], [1604, 210], [1632, 226], [1508, 205], [1540, 222], [1572, 238], [1602, 252], [1630, 268], [1655, 282]];
  for (const [x, y] of row) { o.fillStyle = "#070707"; o.beginPath(); o.ellipse(x, y, 10, 11, 0.4, 0, TAU); o.fill(); o.fillStyle = Wc(0.7); o.beginPath(); o.arc(x - 3, y - 4, 2.4, 0, TAU); o.fill(); }
  const vent = [[1503, 256], [1676, 350], [1680, 380], [1506, 290]];
  P.fill(poly(vent), 0.4, 0.5, { spacing: 0.25 });
  edge(o, [...vent, vent[0]], 1.6, Kc(0.9));
  for (const [x0, y0, bow, w] of [[1540, 222, 30, 13], [1572, 238, 62, 12], [1602, 252, 48, 11]]) {
    const pts = [[x0, y0], [x0 + 4, y0 + 40], [x0 + bow * 0.5, 420], [x0 + bow, 600], [x0 + bow * 0.8, 710]];
    edge(o, pts, w + 4, Kc(1)); edge(o, pts, w, grey(0.1));
    const q = sampleCurve(pts, 8), side = (k) => q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [p[0] - dy / d * k, p[1] + dx / d * k]; });
    taper(o, side(w * 0.38), () => 1.6, Wc(0.7)); taper(o, side(-w * 0.38), () => 1.2, Wc(0.4));
    o.fillStyle = grey(0.6); o.beginPath(); o.roundRect(x0 - 8, y0 - 6, 16, 22, 3); o.fill(); o.strokeStyle = Kc(1); o.lineWidth = 2; o.stroke();
  }
  // leaves at the top, the small framed sign
  for (const [x, y, a, s] of [[1492, 12, 1.2, 0.8], [1520, 62, 1.9, 1.0], [1548, 30, 0.6, 0.8]]) leaf(P, x, y, a, s);
  line(o, [[1500, -5], [1510, 30], [1528, 70]], 1.6, Wc(0.5));
  edge(o, [[1652, 0], [1656, 34], [1700, 36], [1800, 40]], 2.6, Wc(0.6));
  edge(o, [[1658, 42], [1800, 47]], 1.4, Wc(0.3));
  // far right carton faces: dense slanted stripes
  BOXES.forEach((b, i) => {
    P.fill(poly(b), 0.0, 0, { style: 2 });
    streaks(o, poly(b), [2020, 0, 2206, 760], A(0.36, 1), 6.5, 3.8, 30 + i, { val: () => 0.85, len: [80, 300], brk: 0.08, gap: [3, 12] });
    edge(o, [...b, b[0]], 1.8, Kc(1));
  });
}
function leaf(P, x, y, a, s) {
  const o = P.o, c = Math.cos(a), sn = Math.sin(a), L = 44 * s, Wd = 17 * s;
  const pts = [[0, 0], [L * 0.35, -Wd], [L, 0], [L * 0.35, Wd]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
  P.fill(blob(pts), 0.62, a, { style: 2 });
  edge(o, [...pts, pts[0]], 2, Kc(1), 4);
  line(o, [pts[0], pts[2]], 1.4, Kc(0.9));
}

function paintCrate(P) {
  const o = P.o;
  // measured on 63.08 (1.5x and 2.2x grids): the crate stands with its long face to us (x 357–655), the lit corner
  // post at x 650–705, its short right face going back to the rear post at x 860–905. Un-graded means: front face
  // 0.03, front rim 0.16, corner post 0.28, right rim 0.49, right lattice 0.19, rear post 0.38.
  // the coiled cable heaped on the lid (the rim hides its lower half)
  const r = rng(47);
  // (63.08 grid: loops from x ≈ 430 to 880, tops at y 300–340) fix pass 3: a heap of thick black cable (18–24 px)
  // coiled on the lid, each loop dark with a thin pale rim along its top and a few ridge ticks, not a fan of arcs
  for (let k = 0; k < 6; k++) {
    const cx = 640 + (r() - 0.5) * 40 + k * 10, cy = 384 - k * 4, rx = 215 - k * 14 + r() * 10, ry = 58 - k * 3;
    const q = arcPts(cx, cy, rx, ry, Math.PI * (1.02 + 0.03 * r()), Math.PI * (1.98 - 0.03 * r()), 40);
    const w = 22 - k * 1.2;
    taper(o, q, () => w + 4, "#030303"); taper(o, q, () => w, grey(0.08));
    const top = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [p[0] + dy / d * w * 0.34, p[1] - dx / d * w * 0.34]; });
    taper(o, top, (u) => 2.2 * Math.pow(Math.sin(Math.PI * u), 0.4), Wc(0.55 + 0.1 * r()));
    for (let i = 3; i < q.length - 3; i += 3) { const p = q[i]; o.strokeStyle = Wc(0.18); o.lineWidth = 1.2; o.beginPath(); o.moveTo(p[0] - 3, p[1] - w * 0.3); o.lineTo(p[0] + 3, p[1] + w * 0.3); o.stroke(); }
  }
  // front (long) face: black, a finned rim band, a faint diamond lattice
  const front = [[357, 382], [660, 372], [650, 760], [352, 762]];
  P.fill(poly(front), 0.0, Math.PI / 2, { style: 2 });
  o.fillStyle = "#020202"; o.beginPath(); poly(front)(o); o.fill();
  const rimF = [[357, 382], [660, 372], [660, 468], [352, 472]];
  streaks(o, poly(rimF), [350, 370, 660, 472], Math.PI / 2, 6, 2.4, 41, { val: (x) => 0.5 + 0.35 * clamp((x - 380) / 280), len: [40, 90], brk: 0.1, gap: [2, 6] });
  edge(o, [[357, 382], [662, 372]], 2.6, Wc(0.7));
  edge(o, [[366, 394], [650, 386]], 1.2, Wc(0.35));
  edge(o, [[352, 470], [650, 466]], 2.4, Wc(0.55));
  edge(o, [[352, 482], [650, 478]], 1.4, Wc(0.3));
  edge(o, [[357, 382], [352, 472], [350, 760]], 2.0, Wc(0.35));
  lattice(o, [[354, 486], [650, 482], [650, 748], [352, 750]], 4, 3.6, 1.8, [0.5, 0.42], 7);
  // bottom rail
  edge(o, [[340, 752], [650, 750]], 2.0, Wc(0.5));
  streaks(o, poly([[340, 752], [650, 750], [650, 778], [340, 780]]), [340, 750, 650, 780], 0, 5, 1.4, 43, { val: () => 0.45, len: [40, 160], brk: 0.25 });
  // the corner post: dark with two lit edges and fluting, slanting in toward the foot
  const post = [[672, 376], [705, 378], [690, 748], [650, 748]];
  P.fill(poly(post), 0.06, Math.PI / 2, { style: 2 });
  o.fillStyle = grey(0.16); o.beginPath(); poly(post)(o); o.fill();
  edge(o, [[674, 380], [652, 746]], 3.0, Wc(0.85)); edge(o, [[703, 382], [688, 746]], 2.6, Wc(0.75));
  edge(o, [[684, 384], [666, 744]], 2.4, Wc(0.6)); edge(o, [[694, 384], [678, 744]], 2.0, Wc(0.5));
  corner(o, P, 625, 742, 58, 36, 0.8);
  // right (short) face: rim band with a finned panel, a handle slot, lattice, the rear post
  const rimR = [[705, 376], [872, 402], [872, 506], [705, 482]];
  P.fill(poly(rimR), 0.06, 0, { style: 2 });
  o.fillStyle = grey(0.24); o.beginPath(); poly(rimR)(o); o.fill();
  streaks(o, poly(rimR), [705, 376, 872, 506], Math.PI / 2, 7, 2.2, 44, { val: () => 0.7, len: [30, 90], brk: 0.15, gap: [2, 8] });
  const fins = [[768, 400], [852, 412], [852, 494], [768, 482]];
  o.fillStyle = grey(0.78); o.beginPath(); poly(fins)(o); o.fill();
  for (let k = 0; k < 14; k++) { const x = 772 + k * 6; edge(o, [[x, 402 + (x - 768) * 0.14], [x, 484 + (x - 768) * 0.14]], 1.8, Kc(0.8)); }
  edge(o, [...fins, fins[0]], 2.2, Kc(1));
  edge(o, [[705, 376], [872, 402]], 3.0, Wc(0.85));
  edge(o, [[740, 480], [872, 504]], 2.6, Wc(0.75));
  edge(o, [[712, 392], [712, 478]], 2.0, Wc(0.6)); edge(o, [[734, 396], [734, 480]], 1.6, Wc(0.5));
  // the handle slot plate
  const slot = [[775, 560], [855, 566], [855, 588], [775, 582]];
  o.fillStyle = grey(0.55); o.beginPath(); poly(slot)(o); o.fill(); edge(o, [...slot, slot[0]], 1.8, Kc(1));
  lattice(o, [[706, 500], [862, 520], [862, 748], [700, 748]], 3, 3.2, 3.0, [0.85, 0.75], 9);
  // rear post: lit, fluted
  const rp = [[862, 506], [904, 512], [898, 760], [856, 760]];
  P.fill(poly(rp), 0.1, Math.PI / 2, { style: 2 });
  o.fillStyle = grey(0.34); o.beginPath(); poly(rp)(o); o.fill();
  edge(o, [[864, 508], [858, 758]], 2.6, Wc(0.8)); edge(o, [[902, 514], [896, 758]], 2.2, Wc(0.6));
  edge(o, [[876, 510], [871, 756]], 1.2, Kc(0.6)); edge(o, [[888, 512], [884, 756]], 1.2, Kc(0.6));
  corner(o, P, 850, 742, 44, 34, 0.75);
  edge(o, [[700, 762], [856, 758]], 2.6, Wc(0.65));
  // the braided cable down the right face to the floor, then out along the cabinet base
  cable(o, [[700, 336], [736, 350], [748, 450], [756, 560], [764, 670], [786, 750], [850, 780]], 22, { light: 0.7, seed: 60 });
}
function corner(o, P, x, y, w, h, v) {
  P.fill(poly([[x, y], [x + w, y + 2], [x + w, y + h], [x, y + h - 2]]), v, 0, { style: 2 });
  edge(o, [[x, y], [x + w, y + 2], [x + w, y + h], [x, y + h - 2], [x, y]], 2, Kc(1), 2);
  o.fillStyle = Kc(1); o.beginPath(); o.arc(x + w * 0.45, y + h * 0.5, 5, 0, TAU); o.fill();
  o.fillStyle = Wc(0.6); o.beginPath(); o.arc(x + w * 0.45 - 1.5, y + h * 0.5 - 1.5, 1.6, 0, TAU); o.fill();
}

function paintFloorDark(P) {
  const o = P.o;
  // black floor boards: a few faint streaks fanning from the far end (63.08: ≈0.01–0.03)
  const r = rng(77);
  for (let i = 0; i < 110; i++) {
    const x0 = r() * W, y0 = 792 + r() * 154, L = 60 + r() * 280;
    const dx = x0 - 1340, dy = y0 - 700, d = Math.hypot(dx, dy);
    const ux = dx / d, uy = dy / d;
    const a = 0.06 + 0.18 * r() * clamp((y0 - 780) / 160);
    line(o, [[x0, y0], [x0 + ux * L, y0 + uy * L]], 1 + r() * 1.6, Wc(a));
  }
}

// ---------------------------------------------------------------- the lit floor (card standing)
// Bright rays across the floor from under the standing card. Measured on the un-graded 57.32/57.36 frames: the rays'
// directions (structure tensor at 44 points) meet at (1365, 725); along each ray the light is A(x0) * B(y), with x0
// where the ray crosses y = 788 (just under the card's foot) and B the fall-off down the frame (a separable fit,
// residual 13/255 on the blurred floor).
const RAY_A = [[-400, 0], [200, 0.022], [500, 0.028], [650, 0.048], [700, 0.076], [800, 0.148], [900, 0.242], [1000, 0.439], [1100, 0.485], [1200, 0.652],
  [1300, 0.803], [1400, 0.85], [1500, 0.753], [1600, 0.352], [1650, 0.214], [1700, 0.14], [1800, 0.073], [1900, 0.071], [2000, 0.019], [2200, 0.059], [2800, 0]];
const RAY_B = [[788, 1.0], [800, 1.0], [820, 0.887], [850, 0.573], [880, 0.355], [910, 0.297], [946, 0.274]];
// the central rays (x0 ≈ 1350) fall off less (a non-separable refit there)
const RAY_BC = [[788, 0.9], [800, 1.0], [820, 0.95], [850, 0.75], [880, 0.5], [910, 0.45], [946, 0.45]];
const pl = (K, x) => { if (x <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) { const [a, va] = K[i - 1], [b, vb] = K[i]; return va + (vb - va) * (x - a) / (b - a); } return K[K.length - 1][1]; };
export function litFloor() {
  if (LIT) return LIT;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const VX = 1365, VY = 725, Y0 = 786, GAIN = 0.96;
  // The source's floor is broken, tapering white streaks (2–5 px wide, 40–250 px long) laid along the rays, a few
  // px apart everywhere in the picture: dense and merging under the card, sparse and grey out on the dark sides.
  // Rays are spaced in angle round the vanishing point with a rank scheme (ray i of rank k starts where the spacing
  // of the rank-k rays reaches SMIN), so the spacing never drops under SMIN px near the horizon (no hairline moiré).
  // Along a ray each streak's width carries the measured level: level × spacing / (brightness × fill); where that
  // would be under WMIN the streak keeps WMIN and is dropped at random instead (sparse, visible strokes).
  const level = (x, y) => {
    const f = (y - VY) / (Y0 - VY), x0 = VX + (x - VX) / Math.max(0.2, f);
    const wc = clamp(1 - Math.abs(x0 - 1350) / 260);
    const v = GAIN * pl(RAY_A, x0) * (pl(RAY_B, y) * (1 - wc) + pl(RAY_BC, y) * wc);
    return v * (0.4 + 0.6 * clamp(v / 0.16)) * clamp(0.12 + x / 440);      // the dark sides: sparser than the separable fit, darker to the left edge
  };
  const SMIN = 7, WMIN = 1.5, RMAX = 1420, DT = SMIN / RMAX;
  const TH0 = 0.02, TH1 = Math.PI - 0.02, N = Math.ceil((TH1 - TH0) / DT);
  const r = rng(91);
  g.save(); g.beginPath(); g.rect(0, Y0, W, H - Y0); g.clip();
  g.lineCap = "round";
  for (let i = 0; i < N; i++) {
    let k = 0; while (k < 7 && ((i >> k) & 1) === 0) k++;          // rank = trailing zeros
    const th = TH0 + (i + (r() - 0.5) * 0.7) * DT, dx = Math.cos(th), dy = Math.sin(th);
    // how lit this ray is (its level near the bottom edge): lit rays may crowd closer (they merge into light)
    const rb = (H - VY) / dy, lb = level(VX + dx * rb, H - 1), cen = clamp((lb - 0.12) / 0.2), mid = clamp((lb - 0.02) / 0.1);
    const smin = SMIN - 1.5 * mid - 2.3 * cen;
    const rs = smin / (DT * (1 << k)) * (0.8 + 0.5 * r());            // where this ray may start
    const rin = Math.max(rs, (Y0 - VY) / dy);
    const rx = dx > 0 ? (W + 4 - VX) / dx : dx < 0 ? (-4 - VX) / dx : 1e9, ry = (H + 4 - VY) / dy, rout = Math.min(rx, ry);
    if (rout <= rin) continue;
    let s = rin - r() * 160;
    while (s < rout) {
      const L = cen > 0.5 ? 150 + 300 * r() : mid > 0.5 ? 90 + 260 * r() : 60 + 200 * r() * r() + 60 * r(), gap = cen > 0.5 ? 3 + 22 * r() * r() : mid > 0.5 ? 6 + 40 * r() * r() : 8 + 60 * r() * r();
      const a = Math.max(s, rin), b = Math.min(s + L, rout);
      if (b - a > 8) {
        const m = (a + b) / 2, px = VX + dx * m, py = VY + dy * m;
        const lv = level(px, py);
        if (lv > 0.003) {
          const sv = m * DT * (1 << Math.max(0, Math.ceil(Math.log2(Math.max(1, smin / (m * DT))))));
          const bright = lv > 0.3 ? 0.94 : 0.4 + 0.45 * r();
          const fill = L / (L + gap);
          let w = lv * sv / (bright * fill * 0.9);
          let keep = true;
          if (w < WMIN) { keep = r() < w / WMIN; w = WMIN * (0.9 + 0.5 * r()); }
          else w = Math.min(w * (0.85 + 0.3 * r()), sv * 1.2, 3.2 + 6 * cen);
          if (keep) {
            const n = Math.max(4, Math.round((b - a) / 10)), pts = [], ws = [];
            for (let j = 0; j <= n; j++) {
              const q = a + (b - a) * j / n, qy = VY + dy * q;
              pts.push([VX + dx * q, qy]);
              // the width follows the level along the streak (long lit rays thin out down the frame)
              ws.push(Math.min(w * Math.sqrt(level(VX + dx * q, qy) / Math.max(1e-3, lv)), sv * 1.2));
            }
            taper(g, pts, (u) => ws[Math.min(n, Math.round(u * n))] * Math.pow(Math.min(1, 2.6 * Math.sin(Math.PI * u)), 0.55), `rgba(242,240,234,${bright})`);
          }
        }
      }
      s += L + gap;
    }
  }
  g.restore();
  // soft grey fall-off at the streak edges (the source's rays are soft, not binary)
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const o = out.getContext("2d"); o.filter = "blur(0.9px)"; o.drawImage(c, 0, 0); o.filter = "none";
  LIT = out;
  return LIT;
}
