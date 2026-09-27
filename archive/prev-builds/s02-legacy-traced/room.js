// s02 room: the dark studio behind him and the stack of cartons the owl sits on, as one engraved world.
// World coordinates = the 6.04 s source frame; the boxes framing (14.44–16.5 s) is the frame at world offset
// BOX_OFF (camera table, cam.js). Measured from the stitched study panorama (snapshots/s02-study/pano-*.jpg)
// and 2x grids of the source at 8.0, 12.8, 13.2 and 14.6 s.
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const PI = Math.PI, V = PI / 2;
export const BOX_OFF = [2203.3, -1893.4];      // boxes-framing frame coords + BOX_OFF = world coords
const bx = ([x, y]) => [x + BOX_OFF[0], y + BOX_OFF[1]];

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const rect = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const rad = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
function line(o, pts, w, color, per = 6) { const q = pts.length > 2 ? sampleCurve(pts, per) : pts; taper(o, q, (u) => w * (0.35 + 0.65 * Math.pow(Math.sin(PI * u), 0.5)), color); }
const wc = (a) => `rgba(242,240,234,${a})`;

// ---------- furniture ----------
function post(P, x0, x1, y0, y1, v, seed) {
  v *= 0.8;
  P.fill(rect(x0, y0, x1, y1), lin(x0, 0, x1, 0, [[0, v * 0.6], [0.35, v * 1.2], [1, v * 0.5]]), V, { spacing: 0.1, style: 0 });
  const r = rng(seed);
  for (let i = 0; i < Math.round((x1 - x0) / 7); i++) {
    const x = x0 + 3 + r() * (x1 - x0 - 6), a = y0 + r() * (y1 - y0) * 0.3, b = y1 - r() * (y1 - y0) * 0.3;
    line(P.o, [[x, a], [x + (r() - 0.5) * 4, (a + b) / 2], [x + (r() - 0.5) * 4, b]], 1 + r() * 1.4, wc(0.08 + v * 0.5 * r()));
  }
}
function board(P, x0, x1, y0, y1, v, seed) {
  P.fill(rect(x0, y0, x1, y1), lin(0, y0, 0, y1, [[0, v * 1.3], [0.5, v], [1, v * 0.4]]), 0, { spacing: 0.1, style: 0 });
  const r = rng(seed);
  for (let i = 0; i < Math.round((y1 - y0) / 5); i++) {
    const y = y0 + 2 + r() * (y1 - y0 - 4), a = x0 + r() * (x1 - x0) * 0.4, b = x1 - r() * (x1 - x0) * 0.4;
    line(P.o, [[a, y], [(a + b) / 2, y + (r() - 0.5) * 3], [b, y + (r() - 0.5) * 3]], 1 + r() * 1.5, wc(0.1 + v * 0.6 * r()));
  }
  line(P.o, [[x0, y0 + 1], [x1, y0 + 1]], 1.6, wc(Math.min(0.5, v * 1.4)));
}
// mesh panels are dim in the source (region means 6–15 / 255 behind his head): scale the requested value down
const MESH_K = 0.3;
function mesh(P, path, v, ang = 0) { P.fill(path, v * MESH_K, ang, { spacing: 0.02, style: 1 }); }
function cable(P, pts, w, v, beaded, seed) {
  const o = P.o, q = sampleCurve(pts, 10);
  if (!beaded) { line(o, pts, w, wc(v), 10); return; }
  const r = rng(seed);
  for (let i = 1; i < q.length; i++) {
    const [x0, y0] = q[i - 1], [x1, y1] = q[i], a = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0);
    for (let s = 0; s < d; s += w * 1.1) {
      const x = x0 + Math.cos(a) * s, y = y0 + Math.sin(a) * s;
      o.save(); o.translate(x, y); o.rotate(a + V); o.fillStyle = wc(v * (0.7 + 0.3 * r())); o.fillRect(-w / 2, -w * 0.25, w, w * 0.5); o.restore();
    }
  }
}
function books(P, x0, x1, y0, y1, v, seed) {
  // dim spines and cartons on a shelf: soft, irregular, mostly lost in the dark
  const r = rng(seed);
  let x = x0;
  v *= 0.5;
  while (x < x1) {
    const w = r() < 0.6 ? 90 + r() * 220 : 20 + r() * 30, h = (y1 - y0) * (0.5 + 0.5 * r()), vv = v * (0.2 + 1.0 * r());
    P.fill(rect(x, y1 - h, Math.min(x1, x + w - 3), y1), lin(x, 0, x + w, 0, [[0, vv * 0.5], [0.4, vv], [1, vv * 0.4]]), V, { spacing: 0.1, style: 0 });
    x += w;
  }
}
// a carton, frame-facing: front quad f=[tl,tr,br,bl], optional side quad s and top quad t (world coords);
// vF/vS/vT values (numbers or gradient fns); dark drips run down from the top edge; tape flaps
function carton(P, f, s, t, vF, vS, vT, seed, { tape = [], drips = 1, streak = 1 } = {}) {
  // lit front: a flat tone with a fine print dot (screentone) and dark drips hanging from the top edge; the side in
  // shadow: near-black with pale vertical streaks (the corrugation catching light); a black ink outline
  const r = rng(seed);
  if (s) P.fill(poly(s), 0.03, V, { spacing: 0.08, style: 2 });
  if (t) P.fill(poly(t), vT, 0.15, { spacing: 0.1, style: 2 });
  P.fill(poly(f), vF, V, { spacing: 0.05, style: 2 });
  const o = P.o;
  const [tl, tr, br, bl] = f;
  o.save(); o.beginPath(); poly(f)(o); o.clip();
  // screentone dots
  const xs = f.map((p) => p[0]), ys = f.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  o.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = y0 + 2; y < y1; y += 4.2) for (let x = x0 + ((y / 4.2) % 2) * 2.1; x < x1; x += 4.2) { o.beginPath(); o.arc(x, y, 0.95, 0, 6.283); o.fill(); }
  // drips
  for (let i = 0; i < 30 * drips; i++) {
    const u = r(), x = tl[0] + (tr[0] - tl[0]) * u, y = tl[1] + (tr[1] - tl[1]) * u;
    const H = (bl[1] - tl[1]) * (0.08 + 0.6 * r() * r()) * streak;
    const w = 2 + r() * 6;
    taper(o, [[x, y - 2], [x + (r() - 0.5) * 3, y + H * 0.5], [x + (r() - 0.5) * 3, y + H]], (uu) => w * (1 - uu * 0.85), `rgba(6,6,6,${0.35 + 0.5 * r()})`);
  }
  // dark streaks rising from the bottom edge too (the source's heavy corrugation shadows)
  for (let i = 0; i < 16 * drips; i++) {
    const u = r(), x = bl[0] + (br[0] - bl[0]) * u, y = bl[1] + (br[1] - bl[1]) * u;
    const H = (bl[1] - tl[1]) * (0.1 + 0.4 * r() * r());
    taper(o, [[x, y + 2], [x + (r() - 0.5) * 3, y - H]], (uu) => (2 + r() * 4) * (1 - uu * 0.85), `rgba(6,6,6,${0.3 + 0.4 * r()})`);
  }
  o.restore();
  if (s) {
    const [a, b, c, d] = s;
    o.save(); o.beginPath(); poly(s)(o); o.clip();
    const lum = Math.min(0.75, 0.25 + vS * 1.6);
    for (let i = 0; i < 40; i++) {
      const u = r(), x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      const H = (d[1] - a[1]) * (0.2 + 0.8 * r());
      taper(o, [[x, y], [x + (r() - 0.5) * 3, y + H]], (uu) => (1 + r() * 2.2) * (1 - uu * 0.7), wc(lum * (0.4 + 0.6 * r())));
    }
    o.restore();
  }
  // tape flaps over the top edge
  for (const [x, w, h] of tape) {
    const u = (x - tl[0]) / (tr[0] - tl[0]), y = tl[1] + (tr[1] - tl[1]) * u;
    o.fillStyle = "rgba(235,233,228,0.5)"; o.fillRect(x, y - 2, w, h);
    o.strokeStyle = "rgba(10,10,10,0.9)"; o.lineWidth = 2;
    o.beginPath(); o.moveTo(x, y); o.lineTo(x, y + h); o.lineTo(x + w * 0.3, y + h - 4); o.lineTo(x + w * 0.55, y + h + 2); o.lineTo(x + w * 0.8, y + h - 3); o.lineTo(x + w, y + h); o.lineTo(x + w, y); o.stroke();
  }
  // edges: dark ink outline, a pale hairline on the lit top edge
  o.strokeStyle = "rgba(4,4,4,0.95)"; o.lineWidth = 3.4; o.lineJoin = "round";
  o.beginPath(); poly(f)(o); o.stroke();
  if (s) { o.lineWidth = 2.5; o.beginPath(); poly(s)(o); o.stroke(); }
  line(o, [f[0], f[1]], 2.2, wc(Math.min(0.7, vT + 0.1)));
  if (t) line(o, [t[0], t[1]], 1.6, wc(0.4));
}

// ---------- the room behind his face (visible 6.04–12.5 s and 18.2–19.12 s) ----------
function paintFaceRoom(P) {
  const o = P.o;
  // left: a lit post of vertical grain at the frame edge, a mesh panel, a thin post, the shelf board, cables
  post(P, -40, 90, 40, 780, 0.3, 11);
  // the left post is lit only between y 120 and 640 (measured); the right post fades out below y 420
  P.light(rect(-40, -700, 100, 946), (g) => { const r = g.createLinearGradient(0, 60, 0, 740); r.addColorStop(0, 'rgba(0,0,0,0.95)'); r.addColorStop(0.12, 'rgba(0,0,0,0)'); r.addColorStop(0.82, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,0.95)'); return r; });
  mesh(P, rect(55, -60, 140, 350), 0.16);
  post(P, 188, 216, -700, 450, 0.34, 12);
  mesh(P, rect(230, 360, 350, 520), 0.16);
  mesh(P, rect(350, 425, 590, 470), 0.07);
  board(P, 215, 600, 355, 425, 0.18, 13);
  mesh(P, rect(0, -560, 560, -140), 0.07, 0.3);
  cable(P, [[275, -200], [268, 0], [255, 100], [230, 200], [200, 290], [160, 360], [115, 440]], 6, 0.3, false, 21);
  cable(P, [[500, -200], [495, 0], [478, 100], [440, 180], [350, 255], [255, 300], [200, 330]], 6, 0.36, true, 22);
  cable(P, [[410, -200], [418, 0], [428, 120], [436, 230], [438, 300], [435, 345]], 6, 0.4, true, 23);
  cable(P, [[100, 272], [140, 285], [175, 310]], 5, 0.35, true, 24);
  cable(P, [[100, 352], [150, 368], [172, 382]], 5, 0.3, true, 25);
  // right: mesh panels, the big post, shelf boards, the amp with its knob, the low mesh box
  mesh(P, rect(1500, -130, 1800, 450), 0.15);
  P.fill(rect(1640, -130, 1700, 450), 0.03, V, { spacing: 0.3 });
  post(P, 1848, 1898, -1400, 560, 0.26, 14);
  P.light(rect(1848, 300, 1898, 946), (g) => { const r = g.createLinearGradient(0, 330, 0, 520); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,0.97)'); return r; });
  mesh(P, rect(2020, -230, 2400, 230), 0.16);
  board(P, 1898, 2900, 238, 286, 0.24, 15);
  board(P, 1898, 2900, -262, -236, 0.2, 16);
  board(P, 1330, 1848, -138, -114, 0.2, 17);
  board(P, 900, 1848, -448, -428, 0.14, 18);
  books(P, 1340, 1840, -428, -140, 0.12, 19);
  P.fill(rect(1914, -118, 2194, 182), lin(1914, 0, 2194, 0, [[0, 0.12], [1, 0.05]]), V, { spacing: 0.1 });
  board(P, 1918, 2400, 405, 440, 0.3, 20);
  mesh(P, rect(1918, 440, 2400, 700), 0.14);
  o.strokeStyle = wc(0.45); o.lineWidth = 2.4; o.beginPath(); o.arc(1975, 475, 12, 0, 2 * PI); o.stroke();
  o.beginPath(); o.arc(1975, 475, 5, 0, 2 * PI); o.stroke();
  mesh(P, rect(2050, 800, 2400, 1000), 0.13);
  post(P, 2890, 2940, -1400, 946, 0.12, 26);
  cable(P, [[2360, 150], [2390, 260], [2440, 360], [2470, 430]], 5, 0.4, false, 27);
  // dim shapes on the upper shelves toward the boxes
  books(P, 1910, 2880, -700, -262, 0.08, 28);
  board(P, 1898, 2890, -720, -700, 0.1, 29);
  books(P, 950, 1840, -900, -448, 0.06, 30);
}

// ---------- the dark middle of the pan ----------
function paintMid(P) {
  // shelving continues up and right: posts and boards at the spacing of the lower shelves, dim books and cartons
  post(P, 3900, 3950, -1960, 946, 0.1, 41);
  for (const [x0, x1, y] of [[1898, 2890, -1150], [2940, 3900, -1150], [2940, 3900, -700], [2940, 3900, -262], [2940, 3900, 238], [950, 1848, -1300]]) board(P, x0, x1, y, y + 24, 0.1, 42 + y);
  books(P, 2950, 3890, -1130, -720, 0.07, 43);
  books(P, 1910, 2880, -1130, -740, 0.06, 44);
  books(P, 2950, 3890, -680, -270, 0.06, 45);
  P.fill(rect(2960, -240, 3300, 230), 0.07, V, { spacing: 0.1 });
  P.fill(rect(3350, -240, 3880, 230), 0.05, V, { spacing: 0.1 });
}

// ---------- the carton stack (boxes framing, 14.44–16.5 s) ----------
// box geometry in boxes-framing FRAME coords (converted with bx()); light falls off from the owl's box
const LIGHT = [1050, 470];
function lit(v, q) {
  // front value: brighter near the light centre, a soft radial falloff
  const cx = (q[0][0] + q[1][0]) / 2, cy = (q[0][1] + q[3][1]) / 2;
  const d = Math.hypot(cx - LIGHT[0], (cy - LIGHT[1]) * 1.2);
  return Math.min(0.97, v * Math.max(0.3, 1 - d / 1600));
}
const BOXES = [
  // far, dim cartons first
  { f: [[100, 430], [240, 440], [240, 620], [100, 610]], v: 0.14, s: null },
  { f: [[60, 590], [290, 600], [290, 790], [60, 785]], v: 0.12 },
  { f: [[230, 770], [460, 775], [460, 960], [230, 960]], v: 0.1 },
  { f: [[1760, 690], [2000, 680], [2000, 860], [1760, 870]], v: 0.12 },
  { f: [[1800, 850], [2150, 840], [2150, 960], [1800, 960]], v: 0.1 },
  { f: [[1730, 520], [1880, 500], [1880, 720], [1730, 725]], v: 0.5, s: [[1880, 500], [1990, 545], [1990, 700], [1880, 720]], vs: 0.12, tape: [[1800, 26, 48]] },
  { f: [[470, 575], [720, 560], [720, 770], [470, 775]], v: 0.14 },
  { f: [[440, 160], [560, 170], [560, 560], [440, 560]], v: 0.08 },
  // the stack
  { f: [[706, 441], [801, 470], [801, 592], [706, 582]], v: 1.0, t: [[706, 441], [947, 519], [920, 530], [801, 470]] },
  { f: [[729, 330], [883, 294], [883, 492], [729, 480]], v: 0.9, s: [[883, 294], [985, 346], [985, 520], [883, 492]], vs: 0.25, tape: [[787, 30, 40]] },
  { f: [[952, 352], [1161, 321], [1161, 525], [952, 515]], v: 1.1, s: [[1161, 321], [1279, 385], [1279, 560], [1161, 525]], vs: 0.2 },
  { f: [[1290, 510], [1433, 497], [1433, 610], [1290, 615]], v: 0.95, s: [[1433, 497], [1600, 568], [1600, 652], [1433, 610]], vs: 0.2, tape: [[1397, 22, 40]] },
  { f: [[801, 541], [1078, 495], [1078, 701], [801, 717]], v: 0.98, s: [[1078, 495], [1238, 566], [1238, 792], [1078, 701]], vs: 0.04, tape: [[905, 34, 56]] },
  { f: [[1240, 625], [1390, 605], [1390, 701], [1240, 705]], v: 0.85, s: [[1390, 605], [1630, 690], [1630, 750], [1390, 701]], vs: 0.15 },
  { f: [[1240, 705], [1460, 690], [1460, 795], [1240, 800]], v: 0.45, s: [[1460, 690], [1650, 760], [1650, 830], [1460, 795]], vs: 0.1 },
  { f: [[750, 700], [1010, 690], [1010, 960], [750, 960]], v: 0.0, s: [[1010, 690], [1205, 745], [1205, 960], [1010, 960]], vs: 0.4 },
  { f: [[820, 1000], [960, 995], [960, 1210], [820, 1210]], v: 0.4 },
  { f: [[1150, 1000], [1360, 990], [1360, 1215], [1150, 1222]], v: 0.48, tape: [[1250, 30, 50]] },
  { f: [[1320, 770], [1540, 752], [1540, 1010], [1320, 1010]], v: 0.62, tape: [[1440, 36, 56]] },
  { f: [[1100, 830], [1352, 822], [1352, 1000], [1100, 1000]], v: 0.42, tape: [[1260, 32, 52]] },
  { f: [[1540, 820], [1760, 810], [1760, 1060], [1540, 1060]], v: 0.22 },
];
function paintBoxes(P) {
  // background of the boxes framing: black, dim mesh panels, a post, a lit board, hanging cables
  const B = (pts) => pts.map(bx);
  mesh(P, poly(B([[1230, 90], [1380, 90], [1380, 300], [1230, 300]])), 0.13);
  mesh(P, poly(B([[1380, 90], [1500, 90], [1500, 480], [1380, 480]])), 0.1);
  mesh(P, poly(B([[1600, 330], [1900, 330], [1900, 500], [1600, 500]])), 0.09);
  mesh(P, poly(B([[500, 330], [700, 330], [700, 450], [500, 450]])), 0.1);
  { const [x0, y0] = bx([1500, -120]), [x1, y1] = bx([1542, 960]); post(P, x0, x1, y0, y1, 0.1, 61); }
  { const [x0, y0] = bx([1560, 258]), [x1, y1] = bx([1900, 300]); board(P, x0, x1, y0, y1, 0.12, 62); }
  { const [x0, y0] = bx([640, 0]), [x1, y1] = bx([1500, 30]); board(P, x0, x1, y0, y1, 0.07, 63); }
  for (const [pts, seed] of [[[[600, -100], [640, 60], [700, 180], [760, 330]], 64], [[[700, -100], [690, 80], [640, 200], [600, 340]], 65], [[[780, -100], [800, 100], [790, 250]], 66]]) cable(P, B(pts), 3, 0.18, false, seed);
  // cartons
  let seed = 70;
  for (const b of BOXES) {
    const f = B(b.f), s = b.s ? B(b.s) : null, t = b.t ? B(b.t) : null;
    const vF = lit(b.v, b.f);
    const ff = b.f;
    const grad = lin(f[0][0], f[0][1], f[3][0], f[3][1], [[0, vF * 1.05], [1, vF * 0.8]]);
    const vS = (b.vs ?? 0.3) * lit(1, b.s || b.f);
    carton(P, f, s, t, grad, vS, vF * 0.85, seed++, { tape: (b.tape || []).filter((q) => q[1] > 0).map(([x, w, h]) => [x + BOX_OFF[0], w, h]) });
  }
  // the dark chair back in the lower left
  const ch = B([[600, 960], [615, 840], [650, 780], [700, 755], [750, 770], [760, 820], [730, 960]]);
  P.fill((c) => smoothPath(c, ch, true), 0.0, 1.2, { spacing: 0.2, style: 2 });
  line(P.o, B([[615, 900], [630, 820], [670, 775], [720, 760]]), 2.4, wc(0.4));
  line(P.o, B([[650, 950], [660, 860], [700, 800], [745, 790]]), 1.6, wc(0.25));
}

export function paintWorld(P, which = "all") {
  if (which === "all" || which === "face") paintFaceRoom(P);
  if (which === "all" || which === "mid") { paintMid(P); }
  if (which === "all" || which === "boxes") paintBoxes(P);
}
