// s20 (build 3): the big chrome scissors. One drawing in local units (pivot at the origin, blades toward +y,
// finger loops toward -y; 1 unit = 1 px at the setup-A lean), placed by a similarity per beat:
//   lean (A, measured on the owl-free median 63.84–64.24): pivot (744, 563), tip (845, 850), axis 19.4° off vertical;
//        finger loops centred at local (-53, -223) (elongated) and (55, -193) (round)
//   hold (B2, 67.80–69.40, median 67.60–69.36): loops (825, 592) / (902, 645), tips (1235, 95) / (1270, 115):
//        scale 1.25, axis -142.8°, pivot (1022, 409) (behind the owl's head), blades open ~6°
// grime (0..1): the dusty, cobwebbed look before the owl beats it clean (loops brighten 65.48–65.68, measured).
import { rng } from "../../../lib/rng.js";
import { line, seg, strokePath, wc, TAU } from "./util.js";

const WH = (v, a = 1) => wc(v, a);
const K = (a = 1) => `rgba(0,0,0,${a})`;

// one half: blade on side s (the cutting edge along the axis), shank, loop
function half(g, s, grime, r, loops, wide = 1, blen = 1) {
  const lp = loops && Array.isArray(loops[0]) ? loops[s < 0 ? 0 : 1] : null;
  const L = lp ? { cx: lp[0], cy: lp[1], rx: lp[2], ry: lp[3], rot: lp[4] || 0, th: lp[5] } : loops ? { cx: s * loops[0], cy: loops[1], rx: loops[2], ry: loops[3], rot: 0 } : s < 0 ? { cx: -56, cy: -226, rx: 44, ry: 84, rot: -0.12 } : { cx: 56, cy: -196, rx: 40, ry: 68, rot: 0.1 };
  // blade: back edge bows out, tip at (s*2, 305)
  const blade = [[s * 4, -18], [s * 24 * wide, -4], [s * 24 * wide, 40], [s * 20 * wide, 150 * blen], [s * 12 * wide, 250 * blen], [s * 3, 306 * blen], [s * -2, 300 * blen], [s * -3, 150 * blen], [s * -2, 20]];
  g.save();
  g.beginPath(); blade.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  const gr = g.createLinearGradient(s * 26 * wide, 0, s * -3, 0);
  gr.addColorStop(0, WH(0.74 - 0.14 * grime)); gr.addColorStop(0.3, WH(0.99 - 0.26 * grime)); gr.addColorStop(0.65, WH(0.93 - 0.26 * grime)); gr.addColorStop(1, WH(0.7 - 0.16 * grime));
  g.fillStyle = gr; g.fill();
  g.lineWidth = 3; g.strokeStyle = K(0.95); g.lineJoin = "round"; g.stroke();
  g.restore();
  // bevel line and reflection streaks
  line(g, [[s * 8, 0], [s * 9, 150], [s * 4, 290]], 1.2, K(0.35));
  line(g, [[s * 13, 20], [s * 12, 130], [s * 8, 230]], 2.5, WH(0.98 - 0.3 * grime), { end: 0.1 });
  g.save(); g.beginPath(); blade.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  g.fillStyle = K(0.35); g.beginPath(); g.moveTo(s * 18, 0); g.lineTo(s * 26, 0); g.lineTo(s * 14, 250); g.lineTo(s * 9, 250); g.closePath(); g.fill(); g.restore();
  // bevel: a bright line along the cutting edge side
  line(g, [[s * 3, 10], [s * 4, 150], [s * 2, 285]], 2.2, WH(1 - 0.2 * grime, 0.9), { end: 0.1 });
  if (grime > 0.01) {
    // grime: dark mottled blotches over a dulled blade (clipped to the blade)
    g.save(); g.beginPath(); blade.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
    g.globalAlpha = grime;
    for (let i = 0; i < 44; i++) {
      const y = 15 + r() * 280, x = s * (1 + r() * 22 * wide);
      g.fillStyle = K(0.35 + 0.45 * r()); g.beginPath(); g.ellipse(x, y, 2 + r() * 6, 1.2 + r() * 3.5, 1.1 + r() * 0.6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1; g.restore();
  }
  // shank from the pivot to the loop
  const sh = [[s * 6, -8], [s * 32, -22], [L.cx + s * 24, L.cy + L.ry * 0.8], [L.cx - s * 10, L.cy + L.ry * 0.97], [s * -6, -26]];
  g.save(); g.beginPath(); sh.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = WH(0.85 - 0.12 * grime); g.fill(); g.lineWidth = 3; g.strokeStyle = K(0.95); g.stroke(); g.restore();
  line(g, [[s * 12, -22], [L.cx + s * 8, L.cy + L.ry * 0.8]], 2, WH(0.97 - 0.3 * grime));
  // loop (a thick metal ring)
  g.save(); g.translate(L.cx, L.cy); g.rotate(L.rot);
  const th = L.th || 17;
  g.beginPath(); g.ellipse(0, 0, L.rx, L.ry, 0, 0, TAU); g.ellipse(0, 0, L.rx - th, L.ry - th, 0, 0, TAU, true);
  g.fillStyle = WH(0.88 - 0.14 * grime); g.fill("evenodd");
  g.lineWidth = 4; g.strokeStyle = K(0.95);
  g.beginPath(); g.ellipse(0, 0, L.rx, L.ry, 0, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(0, 0, L.rx - th, L.ry - th, 0, 0, TAU); g.stroke();
  g.lineWidth = 2.2; g.strokeStyle = WH(1 - 0.3 * grime);
  g.beginPath(); g.ellipse(0, 0, L.rx - 7, L.ry - 7, 0, Math.PI * 0.95, Math.PI * 1.7); g.stroke();
  g.strokeStyle = K(0.45); g.beginPath(); g.ellipse(0, 0, L.rx - 11, L.ry - 12, 0, Math.PI * 0.05, Math.PI * 0.7); g.stroke();
  g.restore();
}

// draw the scissors in local units under the current transform. o: { open (rad), grime, alpha }
export function drawScissorsLocal(g, { open = 0, grime = 0, loops = null, wide = 1, blen = null } = {}) {
  const r = rng(9);
  g.save(); g.rotate(-open / 2); half(g, -1, grime, r, loops, wide, blen ? blen[0] : 1); g.restore();
  g.save(); g.rotate(open / 2); half(g, 1, grime, r, loops, wide, blen ? blen[1] : 1); g.restore();
  // pivot screw
  g.fillStyle = WH(0.85 - 0.3 * grime); g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = K(0.95); g.stroke();
  seg(g, [-5, -3], [5, 3], 2, K(0.9));
}

export const LEAN = { x: 744, y: 563, rot: -0.3386, s: 1 };
// hold (B2 frame px): pivot hidden behind the head at (1000, 410), tips (1165, 120) / (1230, 110), loops (822, 575) /
// (900, 650), seen face-on here (round loops)
// fix pass 1 (measured on frame 1705, B2 px): pivot (1040, 418) behind the head, blades open 0.22 rad toward tips
// (1165, 110) / (1265, 95), about 40 px wide; the loops seen at an angle as two overlapping ovals, (765–890, 535–680)
// tilted and (840–955, 600–705), given per half (pre-rotated by the half's opening)
export const HOLD = { x: 1040, y: 418, rot: -2.64, s: 1.2, open: 0.22, loops: [[34, -228, 44, 40, 0, 12], [54, -231, 44, 64, -0.32, 12]], wide: 1.4, blen: [0.9, 1.07] };

export function drawScissors(g, place, o = {}) {
  g.save(); g.translate(place.x, place.y); g.rotate(place.rot); g.scale(place.s, place.s);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  drawScissorsLocal(g, { open: place.open || 0, loops: place.loops || null, wide: place.wide || 1, blen: place.blen || null, ...o });
  g.restore();
}

// cobwebs (A frame coords; a = 0..1 visibility), fix pass 1 after a 2x crop of frame 1600: a web hub on the blade near
// (805, 690) with long strands radiating down and right to (900–965, 760–835) and a few up to the rack, sagging cross
// threads between them, a tangle round the blade's lower half (700–800, 700–850), a few strands between the loops
export function drawCobwebs(g, a = 1) {
  if (a <= 0.01) return;
  const r = rng(77);
  g.save(); g.globalAlpha *= a; g.lineCap = "round";
  const thread = (A, B, sag, w, v, al) => { g.strokeStyle = WH(v, al); g.lineWidth = w; g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo((A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + sag, B[0], B[1]); g.stroke(); };
  const hub = [805, 690];
  const spokes = [[962, 832], [945, 820], [918, 812], [960, 790], [905, 770], [872, 845], [840, 860], [930, 700], [900, 650], [870, 610], [760, 610], [740, 700], [760, 800]];
  for (const q of spokes) thread([hub[0] + (r() - 0.5) * 16, hub[1] + (r() - 0.5) * 16], q, 4 + r() * 8, 0.8 + r() * 0.9, 0.62 + r() * 0.3, 0.45 + r() * 0.4);
  // cross threads: a loose spiral round the hub
  for (let k = 1; k <= 5; k++) {
    const R = 22 * k, pts = [];
    for (let j = 0; j <= 14; j++) { const t = -0.9 + j * (2.1 / 14) + k * 0.05, rr = R * (1 + 0.1 * Math.sin(j * 1.7 + k)); pts.push([hub[0] + Math.cos(t) * rr * 1.4, hub[1] + Math.sin(t) * rr]); }
    g.strokeStyle = WH(0.72, 0.35 + 0.1 * (5 - k)); g.lineWidth = 0.9;
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y + (i % 2) * 3) : g.moveTo(x, y))); g.stroke();
  }
  // long strands, the tangle round the lower blade, strands between the loops
  const long = [[[700, 700], [905, 700]], [[790, 640], [962, 835]], [[800, 655], [940, 830]], [[770, 610], [870, 860]], [[640, 330], [760, 420]], [[700, 300], [748, 350]], [[650, 450], [760, 560]]];
  for (const [A, B] of long) thread(A, B, 10 + r() * 15, 1 + r() * 0.8, 0.8, 0.55 + r() * 0.3);
  for (let i = 0; i < 26; i++) {
    const A = [700 + r() * 100, 700 + r() * 150], B = [A[0] + (r() - 0.3) * 90, A[1] + (r() - 0.5) * 90];
    thread(A, B, (r() - 0.5) * 20, 0.7 + r() * 0.9, 0.6 + r() * 0.3, 0.35 + r() * 0.4);
  }
  g.restore();
}
