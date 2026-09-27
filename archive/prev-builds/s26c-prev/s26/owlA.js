// s26 — the standing owl painter, copied from s25/owl.js (s25 owner's code) so s26 owns its variant. Frame px.
// parametric face, headphones and bandage. Frame px. The face was measured on the source at 104.6 (head centre
// (1075, 440)); every other pose places it with its own measured head centre and scale.
// The kit (owlInk.js) supplies the ink/plumage primitives, so this owl shares the film's rendering of the bird:
// soft near-white plumage, a darker rim turned from the light (upper left), dark tapered ink.
import { LINE, gv, ink, plumage, rimHatch, edgeFlicks, regionFlicks, featherRow, setPPU, flick } from "../../lib/owlInk.js";
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const HC0 = [1075, 440];
const LIGHT = [-0.55, -0.83];

// polyline helpers
const pairs = (a) => { const p = []; for (let i = 0; i < a.length; i += 2) p.push([a[i], a[i + 1]]); return p; };
const polyPath = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };

// ---------------------------------------------------------------- the face (head-local = frame px at 104.6)
function inkPts(g, pts, w, col = LINE, o = {}) { ink(g, pts, w, col, { per: 6, ...o }); }

function almondEye(g, up, low, iris, ir, { closed = false } = {}) {
  if (closed) {
    // shut: a downward-curved lid line with a few lashes at the outer end
    inkPts(g, up, 3.2, LINE, { end: 0.15, bias: 0.5 });
    return;
  }
  // the white of the eye between the two lids
  g.save();
  g.beginPath(); g.moveTo(up[0][0], up[0][1]);
  for (const p of sampleCurve(up, 6)) g.lineTo(p[0], p[1]);
  for (const p of sampleCurve([...low].reverse(), 6)) g.lineTo(p[0], p[1]);
  g.closePath();
  g.fillStyle = gv(0.9); g.fill();
  g.clip();
  g.fillStyle = "#0a0a0a"; g.beginPath(); g.arc(iris[0], iris[1], ir, 0, TAU); g.fill();
  g.fillStyle = gv(0.96); g.beginPath(); g.arc(iris[0] - ir * 0.35, iris[1] - ir * 0.35, ir * 0.3, 0, TAU); g.fill();
  // lid shadow across the top of the eye
  g.fillStyle = gv(0.2, 0.35); g.beginPath(); g.moveTo(up[0][0], up[0][1]); for (const p of sampleCurve(up, 6)) g.lineTo(p[0], p[1] + 2.2); g.lineTo(up[up.length - 1][0], up[up.length - 1][1] - 3); g.lineTo(up[0][0], up[0][1] - 3); g.fill();
  g.restore();
  inkPts(g, up, 3.4, LINE, { end: 0.2, bias: 0.55, pow: 0.4 });
  inkPts(g, low, 1.5, gv(0.18, 0.9), { end: 0.2 });
}

function bandage(g) {
  // two crossed sticking plasters in outline: a long strip "/" under a shorter padded strip "\"
  const strip = (cx, cy, len, wd, ang, pad) => {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = gv(0.96); g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.fill();
    g.strokeStyle = gv(0.16, 0.95); g.lineWidth = 1.5; g.stroke();
    g.fillStyle = gv(0.35, 0.8);
    const r = rng(pad ? 7 : 3);
    for (let i = 0; i < (pad ? 10 : 12); i++) { const x = (pad ? -0.3 : -0.42) * len + r() * len * (pad ? 0.6 : 0.84), y = (r() - 0.5) * wd * 0.6; g.beginPath(); g.arc(x, y, 0.75, 0, TAU); g.fill(); }
    if (pad) { g.strokeStyle = gv(0.3, 0.7); g.lineWidth = 1; g.beginPath(); g.roundRect(-wd * 0.7, -wd * 0.38, wd * 1.4, wd * 0.76, 2); g.stroke(); }
    g.restore();
  };
  strip(1031, 376, 72, 16, -0.43, false);
  strip(1030, 384, 64, 17, 0.87, true);
}

function headphonesBack(g) {
  // band: dark strip over the crown (centre line measured at 104.6), lighter inner stripe, bright outer rim
  const band = [[955, 396], [962, 362], [978, 335], [1000, 314], [1025, 299], [1060, 289], [1100, 286], [1140, 290], [1175, 304], [1200, 325], [1213, 350], [1216, 374]];
  const q = sampleCurve(band, 8);
  taper(g, q, () => 14.5, gv(0.07));
  taper(g, q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [x - dy / l * 2.5, y + dx / l * 2.5]; }), () => 3.2, gv(0.34, 0.9));
  taper(g, q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [x + dy / l * 5.5, y - dx / l * 5.5]; }), () => 1.4, gv(0.5, 0.7));
  // far cup: a dark crescent showing left of the head
  g.save();
  g.translate(952, 440); g.rotate(0.08);
  const gr = g.createLinearGradient(-26, 0, 20, 0); gr.addColorStop(0, gv(0.3)); gr.addColorStop(0.5, gv(0.16)); gr.addColorStop(1, gv(0.08));
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 25, 50, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2; g.stroke();
  g.strokeStyle = gv(0.45, 0.6); g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 19, 43, 0, Math.PI * 0.6, Math.PI * 1.4); g.stroke();
  g.restore();
}

function headphonesFront(g) {
  // near cup (viewer's right): cushion against the head, dark shell, pale rim highlight, yoke on top
  g.save();
  g.translate(1219, 432); g.rotate(-0.12);
  // cushion
  g.fillStyle = gv(0.1); g.beginPath(); g.ellipse(-26, 2, 16, 50, 0, 0, TAU); g.fill();
  const r = rng(11);
  g.strokeStyle = gv(0.3, 0.8); g.lineWidth = 1;
  for (let i = -8; i <= 8; i++) { const y = i * 5.6; const hw = Math.sqrt(Math.max(0, 1 - (y / 50) ** 2)) * 13; g.beginPath(); g.moveTo(-26 - hw, y); g.lineTo(-26 + hw * (0.3 + 0.4 * r()), y + 1); g.stroke(); }
  // shell
  const gr = g.createLinearGradient(-20, -40, 40, 40);
  gr.addColorStop(0, gv(0.42)); gr.addColorStop(0.4, gv(0.24)); gr.addColorStop(1, gv(0.1));
  g.fillStyle = gr; g.beginPath(); g.ellipse(6, 0, 36, 52, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.stroke();
  // plate and rim
  g.fillStyle = gv(0.2); g.beginPath(); g.ellipse(12, 2, 25, 40, 0, 0, TAU); g.fill();
  g.strokeStyle = gv(0.55, 0.8); g.lineWidth = 1.6; g.beginPath(); g.ellipse(12, 2, 25, 40, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
  g.strokeStyle = gv(0.62, 0.7); g.lineWidth = 2.2; g.beginPath(); g.ellipse(6, 0, 33, 49, 0, Math.PI * 1.1, Math.PI * 1.55); g.stroke();
  g.fillStyle = gv(0.7, 0.5); g.beginPath(); g.ellipse(-2, -26, 5, 11, -0.3, 0, TAU); g.fill();
  // yoke / slider on top
  g.fillStyle = gv(0.22); g.beginPath(); g.roundRect(-8, -70, 18, 26, 4); g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.6; g.stroke();
  g.strokeStyle = gv(0.5, 0.7); g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-5, -66 + k * 6); g.lineTo(7, -66 + k * 6); g.stroke(); }
  g.restore();
}

function face(g, { eyes = "open" } = {}) {
  const closed = eyes === "closed";
  // brows
  inkPts(g, [[981.7, 416.7], [1003, 423], [1020, 436.7], [1031.7, 446.7]], 4.2, LINE, { end: 0.25, bias: 0.3 });
  inkPts(g, [[1058.3, 432.7], [1076.7, 430], [1096.7, 416.7], [1116.7, 404], [1133.3, 396.7], [1141, 396.5]], 5.2, LINE, { end: 0.15, bias: 0.35 });
  inkPts(g, [[1055, 428], [1060, 434], [1066, 437]], 1.8, LINE, { end: 0.3 });
  // frown creases between the brows and under the raised brow
  inkPts(g, [[1062, 420], [1066, 428], [1067, 437]], 1.1, gv(0.35, 0.7), { end: 0.2 });
  inkPts(g, [[1054, 424], [1057, 433]], 1.0, gv(0.4, 0.6), { end: 0.2 });
  inkPts(g, [[1082, 437], [1100, 427], [1118, 420]], 1.0, gv(0.45, 0.5), { end: 0.2 });
  inkPts(g, [[1005, 432], [1018, 440]], 1.0, gv(0.45, 0.5), { end: 0.2 });
  if (closed) {
    almondEye(g, [[982, 454], [995, 461], [1010, 463], [1028, 458]], null, null, 0, { closed: true });
    almondEye(g, [[1088, 449], [1104, 455], [1124, 456], [1146, 449]], null, null, 0, { closed: true });
    for (const [x, y, dx, dy] of [[982, 454, -6, -2], [1146, 449, 6, -3], [1143, 452, 5, 2]]) inkPts(g, [[x, y], [x + dx, y + dy]], 1.2, LINE, { end: 0.1 });
  } else {
    almondEye(g, [[981.7, 449.3], [1000, 448], [1016.7, 450], [1031.7, 457.3]], [[986, 457], [1006.7, 462], [1026.7, 461], [1031, 458]], [1019, 454.5], 5.6);
    almondEye(g, [[1086.7, 445], [1106.7, 441.7], [1126.7, 442.7], [1146.7, 449.3], [1150, 446]], [[1092, 453], [1116.7, 457.3], [1140, 455], [1146, 450]], [1116.7, 448.7], 6.4);
  }
  // under-eye and cheek feather strokes
  const r = rng(21);
  for (let i = 0; i < 9; i++) { const x = 1076 + i * 7 + r() * 3, y = 490 + r() * 10; flick(g, [x, y], [0.35, 1], 7 + r() * 5, 1.0, gv(0.5, 0.5), 0.1); }
  for (let i = 0; i < 6; i++) { const x = 990 + i * 7 + r() * 3, y = 478 + r() * 10; flick(g, [x, y], [-0.3, 1], 6 + r() * 5, 1.0, gv(0.5, 0.45), -0.1); }
  // beak: upper mandible (pale, outlined), dark mouth, lower mandible, smirk line
  const up = [[1036.7, 466], [1030, 476.7], [1031, 493.3], [1036.7, 505], [1041.7, 510]];
  const upR = [[1041.7, 510], [1050, 499], [1060, 489], [1071.7, 481.7], [1068.3, 473.3], [1056.7, 465], [1046, 463]];
  g.fillStyle = "#141414"; g.beginPath(); smoothPath(g, [[1041.7, 510], [1056.7, 506.7], [1070, 498.3], [1080, 488.3], [1071.7, 481.7], [1060, 489]], true); g.fill();
  g.fillStyle = gv(0.62); g.beginPath(); smoothPath(g, [[1046, 507], [1060, 503], [1072, 495], [1066, 494], [1054, 500]], true); g.fill();
  g.beginPath(); smoothPath(g, [...up, ...upR.slice(1)], true);
  const bg = g.createLinearGradient(1030, 465, 1072, 505); bg.addColorStop(0, gv(0.96)); bg.addColorStop(0.6, gv(0.86)); bg.addColorStop(1, gv(0.66));
  g.fillStyle = bg; g.fill();
  inkPts(g, up, 2.6, LINE, { end: 0.35, bias: 0.6 });
  inkPts(g, upR, 2.0, LINE, { end: 0.3, bias: 0.3 });
  inkPts(g, [[1041.7, 510], [1056.7, 506.7], [1070, 498.3], [1080, 488.3]], 1.8, LINE, { end: 0.3 });
  inkPts(g, [[1071.7, 481.7], [1083.3, 483.3], [1090, 480], [1093.3, 476]], 2.4, LINE, { end: 0.2, bias: 0.4 });
  g.fillStyle = LINE; g.beginPath(); g.ellipse(1041.7, 471.7, 2.2, 1.5, 0.3, 0, TAU); g.fill();
  bandage(g);
}

// ---------------------------------------------------------------- the whole figure
// pose: an entry of POSES; o: { eyes: "open" | "closed" (paint shut lids over the traced open eyes), face: true
// (the parametric face instead of the traced one) }. Returns nothing; draws in frame px.
export function paintOwl(g, pose, o = {}) {
  const [hx, hy, hs] = pose.head;
  const headT = (fn) => { g.save(); g.translate(hx, hy); g.scale(hs, hs); g.translate(-HC0[0], -HC0[1]); fn(); g.restore(); };
  setPPU(1);
  g.lineCap = "round"; g.lineJoin = "round";
  headT(() => headphonesBack(g));
  const sils = pose.sil.map(pairs);
  const silPath = (c) => { for (const P of sils) polyPath(P)(c); };
  // 1. tone: the silhouette at the base value, then the traced tone bands (darker toward the edges and under the
  //    wings), softened by a small blur inside the silhouette
  const tl = document.createElement("canvas"); tl.width = g.canvas.width; tl.height = g.canvas.height;
  const tg = tl.getContext("2d");
  tg.fillStyle = gv(pose.base); tg.beginPath(); silPath(tg); tg.fill();
  for (const b of pose.tone) {
    tg.fillStyle = gv(b.v); tg.beginPath();
    for (const q of b.p) { tg.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) tg.lineTo(q[i], q[i + 1]); tg.closePath(); }
    tg.fill("evenodd");
  }
  g.save(); g.beginPath(); silPath(g); g.clip();
  g.filter = "blur(2.2px)"; g.drawImage(tl, 0, 0); g.filter = "none";
  g.restore();
  // 2. ink: every traced stroke, its measured width (the ridge is wider than the stroke: ×0.55) and darkness
  for (const L of pose.ink) {
    const pts = []; for (let i = 0; i < L.length; i += 4) pts.push([L[i], L[i + 1], L[i + 2], L[i + 3]]);
    if (pts.length < 2) continue;
    const q = pts.map((p) => [p[0], p[1]]);
    const ws = pts.map((p) => Math.max(0.8, Math.min(4.5, p[2] * 1.0)));
    let v = 1; for (const p of pts) v = Math.min(v, p[3]);
    const vm = pts.reduce((a, p) => a + p[3], 0) / pts.length;
    taper(g, q, (u) => { const f = u * (ws.length - 1), i = Math.min(ws.length - 2, Math.floor(f)); const k = f - i; return (ws[i] * (1 - k) + ws[i + 1] * k) * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.35); }, gv(Math.max(0.04, (v + vm) / 2)));
  }
  // 3. the outline: a dark ink keyline round the silhouette
  g.strokeStyle = LINE; g.lineWidth = 2.6;
  g.beginPath(); for (const P of sils) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); } g.stroke();
  headT(() => {
    face(g, { eyes: o.eyes });
    headphonesFront(g);
  });
}
// shut lids painted over the traced open eyes (the rise at 103.44–103.52 reuses the standing drawing)
function shutEyes(g) {
  g.save();
  g.fillStyle = gv(0.97);
  g.filter = "blur(1.5px)";
  g.beginPath(); g.ellipse(1007, 455, 30, 12, 0.1, 0, TAU); g.ellipse(1117, 450, 36, 13, 0, 0, TAU); g.fill();
  g.filter = "none";
  g.restore();
  inkPts(g, [[982, 452], [995, 460], [1010, 462], [1030, 456]], 3.4, LINE, { end: 0.15, bias: 0.5 });
  inkPts(g, [[1088, 448], [1104, 455], [1124, 456], [1148, 448]], 3.6, LINE, { end: 0.15, bias: 0.5 });
}
