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
function half(g, s, grime, r, loops, wide = 1) {
  const L = loops ? { cx: s * loops[0], cy: loops[1], rx: loops[2], ry: loops[3], rot: 0 } : s < 0 ? { cx: -56, cy: -226, rx: 44, ry: 84, rot: -0.12 } : { cx: 56, cy: -196, rx: 40, ry: 68, rot: 0.1 };
  // blade: back edge bows out, tip at (s*2, 305)
  const blade = [[s * 4, -18], [s * 24 * wide, -4], [s * 24 * wide, 40], [s * 20 * wide, 150], [s * 12 * wide, 250], [s * 3, 306], [s * -2, 300], [s * -3, 150], [s * -2, 20]];
  g.save();
  g.beginPath(); blade.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  const gr = g.createLinearGradient(s * 26, 0, s * -3, 0);
  gr.addColorStop(0, WH(0.7 - 0.1 * grime)); gr.addColorStop(0.35, WH(0.96 - 0.12 * grime)); gr.addColorStop(0.7, WH(0.86 - 0.12 * grime)); gr.addColorStop(1, WH(0.62 - 0.1 * grime));
  g.fillStyle = gr; g.fill();
  g.lineWidth = 3; g.strokeStyle = K(0.95); g.lineJoin = "round"; g.stroke();
  g.restore();
  // bevel line and reflection streaks
  line(g, [[s * 8, 0], [s * 9, 150], [s * 4, 290]], 1.2, K(0.35));
  line(g, [[s * 13, 20], [s * 12, 130], [s * 8, 230]], 2.5, WH(0.98 - 0.3 * grime), { end: 0.1 });
  g.save(); g.beginPath(); blade.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  g.fillStyle = K(0.35); g.beginPath(); g.moveTo(s * 18, 0); g.lineTo(s * 26, 0); g.lineTo(s * 14, 250); g.lineTo(s * 9, 250); g.closePath(); g.fill(); g.restore();
  if (grime > 0.01) for (let i = 0; i < 26; i++) {
    const y = 20 + r() * 270, x = s * (2 + r() * 18);
    g.fillStyle = K(0.35 + 0.4 * r()) ; g.globalAlpha = grime; g.beginPath(); g.ellipse(x, y, 1.5 + r() * 4, 1 + r() * 2.5, r() * 3, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  // shank from the pivot to the loop
  const sh = [[s * 6, -8], [s * 32, -22], [L.cx + s * 24, L.cy + L.ry * 0.8], [L.cx - s * 10, L.cy + L.ry * 0.97], [s * -6, -26]];
  g.save(); g.beginPath(); sh.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = WH(0.85 - 0.12 * grime); g.fill(); g.lineWidth = 3; g.strokeStyle = K(0.95); g.stroke(); g.restore();
  line(g, [[s * 12, -22], [L.cx + s * 8, L.cy + L.ry * 0.8]], 2, WH(0.97 - 0.3 * grime));
  // loop (a thick metal ring)
  g.save(); g.translate(L.cx, L.cy); g.rotate(L.rot);
  g.beginPath(); g.ellipse(0, 0, L.rx, L.ry, 0, 0, TAU); g.ellipse(0, 0, L.rx - 17, L.ry - 18, 0, 0, TAU, true);
  g.fillStyle = WH(0.88 - 0.14 * grime); g.fill("evenodd");
  g.lineWidth = 4; g.strokeStyle = K(0.95);
  g.beginPath(); g.ellipse(0, 0, L.rx, L.ry, 0, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(0, 0, L.rx - 17, L.ry - 18, 0, 0, TAU); g.stroke();
  g.lineWidth = 2.2; g.strokeStyle = WH(1 - 0.3 * grime);
  g.beginPath(); g.ellipse(0, 0, L.rx - 7, L.ry - 7, 0, Math.PI * 0.95, Math.PI * 1.7); g.stroke();
  g.strokeStyle = K(0.45); g.beginPath(); g.ellipse(0, 0, L.rx - 11, L.ry - 12, 0, Math.PI * 0.05, Math.PI * 0.7); g.stroke();
  g.restore();
}

// draw the scissors in local units under the current transform. o: { open (rad), grime, alpha }
export function drawScissorsLocal(g, { open = 0, grime = 0, loops = null, wide = 1 } = {}) {
  const r = rng(9);
  g.save(); g.rotate(-open / 2); half(g, -1, grime, r, loops, wide); g.restore();
  g.save(); g.rotate(open / 2); half(g, 1, grime, r, loops, wide); g.restore();
  // pivot screw
  g.fillStyle = WH(0.85 - 0.3 * grime); g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = K(0.95); g.stroke();
  seg(g, [-5, -3], [5, 3], 2, K(0.9));
}

export const LEAN = { x: 744, y: 563, rot: -0.3386, s: 1 };
// hold (B2 frame px): pivot hidden behind the head at (1000, 410), tips (1165, 120) / (1230, 110), loops (822, 575) /
// (900, 650), seen face-on here (round loops)
export const HOLD = { x: 1000, y: 410, rot: -2.554, s: 1.15, open: 0.15, loops: [47, -208, 50, 52], wide: 1.35 };

export function drawScissors(g, place, o = {}) {
  g.save(); g.translate(place.x, place.y); g.rotate(place.rot); g.scale(place.s, place.s);
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  drawScissorsLocal(g, { open: place.open || 0, loops: place.loops || null, wide: place.wide || 1, ...o });
  g.restore();
}

// cobwebs strung between the scissors, the speaker's side panel and the rack (A frame coords); a = 0..1 visibility
export function drawCobwebs(g, a = 1) {
  if (a <= 0.01) return;
  const r = rng(77);
  g.save(); g.globalAlpha *= a; g.lineCap = "round";
  const anchors = [[640, 330], [700, 300], [748, 330], [760, 420], [780, 560], [820, 650], [860, 760], [700, 700], [760, 820], [880, 850], [650, 450], [868, 560]];
  for (let i = 0; i < 70; i++) {
    const A = anchors[Math.floor(r() * anchors.length)], B = anchors[Math.floor(r() * anchors.length)];
    if (A === B) continue;
    const mx = (A[0] + B[0]) / 2 + (r() - 0.5) * 30, my = (A[1] + B[1]) / 2 + 10 + r() * 30;
    g.strokeStyle = WH(0.55 + r() * 0.35, 0.35 + r() * 0.45); g.lineWidth = 0.7 + r() * 1.1;
    g.beginPath(); g.moveTo(A[0] + (r() - 0.5) * 20, A[1] + (r() - 0.5) * 20); g.quadraticCurveTo(mx, my, B[0] + (r() - 0.5) * 20, B[1] + (r() - 0.5) * 20); g.stroke();
  }
  // a small radial web between the loops
  const [cx, cy] = [668, 335];
  for (let k = 0; k < 9; k++) { const t = k / 9 * TAU; g.strokeStyle = WH(0.8, 0.5); g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(t) * 40, cy + Math.sin(t) * 34); g.stroke(); }
  for (let q = 1; q < 4; q++) { g.beginPath(); for (let k = 0; k <= 9; k++) { const t = k / 9 * TAU; const R = q * 11; (k ? g.lineTo : g.moveTo).call(g, cx + Math.cos(t) * R, cy + Math.sin(t) * R * 0.85); } g.stroke(); }
  g.restore();
}
