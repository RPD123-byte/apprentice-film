// s26 — the colour owl of beat F (and the cream/grey owl it becomes behind the lens shard), drawn in code.
// Pose = the rig pose of s26/rig.js (frame px: head x, y, r = half the skull width, rot, yaw; body; wings; feet)
// plus per-frame face features measured on the source (s26/featF.js: beak, plaster and cup centres in head units,
// eye states). The look follows the source's painted owl (116.2–117.4 s crops): a warm-grey crown with a cream
// heart-shaped facial disc, big round amber eyes with a dark rim and catchlights, a small orange hooked beak, a
// crossed peach plaster on the crown, a slim dark band with orange cups, a cream fluffy chest with tan shoulders,
// grey layered wings with pale feather edges, orange feathered legs and toes, dark-brown ink.
import { wingGeom, bodyGeom, foldGeom, wingOutline } from "./rig.js";

const TAU = Math.PI * 2;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const nrm = (a) => { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; };
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const hsh = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// pre-grade inks (source samples at 116.2–117.4 s run back through the film's grade, then eyeballed on renders)
export const COL = {
  line: "#4a2c22", lineSoft: "rgba(74,44,34,0.55)",
  crown: "#baa69b", crownD: "#968076", crownL: "#cdb9ac",
  disc: "#f0e7d2", discSh: "#d9cbb0",
  body: "#e7cead", bodyL: "#efdabe", bodyWarm: "#dcb589", bodySh: "#c89669",
  tan: "#d6a26f", tanD: "#c98a4c", tanMid: "#c9ac92", covert: "#ab9c94", covertL: "#bfb2aa",
  wing: "#a8988f", wingL: "#b9aba3", wingD: "#85766f", wingEdge: "#ddd5cf",
  eyeRim: "#33201a", iris: "#9a6434", irisD: "#5a3519", irisL: "#c68d4d", pupil: "#150b07", sclera: "#fbf6ea",
  beak: "#f0a24e", beakD: "#c4702c",
  plaster: "#e6b19c", plasterD: "#c98f7a", plasterPad: "#d49b86",
  band: "#2f2725", bandL: "#6b605d", cup: "#c9832f", cupL: "#e2a652", cupD: "#8c4e17", cushion: "#2e2624", eyeRing: "rgba(122,106,98,0.85)",
  foot: "#e79a45", footD: "#b86b26", claw: "#3a241b", leg: "#eec48e",
  tail: "#e9c79a", tailD: "#cf9d63",
};
// the white owl of the blast (111.64–114.08): same drawing, B&W inks (white plumage, grey shading, black headphones)
export const INK = {
  line: "#262626", lineSoft: "rgba(40,40,40,0.5)",
  crown: "#e9e9e6", crownD: "#c9c9c5", crownL: "#f3f3f0",
  disc: "#f7f7f4", discSh: "#dcdcd8",
  body: "#efefec", bodyL: "#fafaf8", bodyWarm: "#d9d9d5", bodySh: "#b4b4b0",
  tan: "#e2e2de", tanD: "#bdbdb9",
  wing: "#e6e6e3", wingL: "#f7f7f5", wingD: "#b5b5b1", wingEdge: "#fbfbf9",
  eyeRim: "#161616", iris: "#2a2a2a", irisD: "#101010", irisL: "#4a4a4a", pupil: "#050505", sclera: "#f8f8f5",
  beak: "#e4e4e0", beakD: "#9c9c98",
  plaster: "#f1f1ee", plasterD: "#b8b8b4", plasterPad: "#d6d6d2",
  band: "#141414", bandL: "#5a5a5a", cup: "#3a3a3a", cupL: "#707070", cupD: "#161616", cushion: "#101010",
  foot: "#dcdcd8", footD: "#9a9a96", claw: "#1a1a1a", leg: "#f0f0ed",
  tail: "#ececea", tailD: "#bdbdb9", ink: true, cupHi: "rgba(200,200,200,0.35)", cupRing: "rgba(150,150,150,0.55)", bandEdge: "#5c5c5c", plasterLine: "rgba(70,70,70,0.8)", plasterDot: "rgba(90,90,90,0.5)", discRim: "rgba(90,90,90,0.3)", tick: "rgba(80,80,80,0.35)", beakLine: "rgba(60,60,60,0.7)", legTick: "rgba(90,90,90,0.4)", toeTick: "rgba(70,70,70,0.5)", covert: "#ededea", covertL: "#fafaf8", tailL: "#fafaf8", tuft: "#f1f1ee", tanMid: "#efefec", beakL: "#f4f4f2",
};
let PAL = COL;
let LW = 2;

function spath(g, pts, closed = true) {
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  const N = closed ? n : n - 1;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a0 = closed || i > 0 ? p0 : p1, a3 = closed || i < n - 2 ? p3 : p2;
    g.bezierCurveTo(p1[0] + (p2[0] - a0[0]) / 6, p1[1] + (p2[1] - a0[1]) / 6, p2[0] - (a3[0] - p1[0]) / 6, p2[1] - (a3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function poly(g, pts, close = true) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
function stroke(g, col, w) { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }

// a feather: lens from root to tip, width w, bowed by bend; round or pointed tip
function featherPoly(root, tip, w, bend = 0, n = 8, point = 0.35) {
  const d = sub(tip, root), L = len(d) || 1, u = [d[0] / L, d[1] / L], p = [-u[1], u[0]];
  const a = [], b = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const rise = Math.min(1, Math.pow(s / 0.15, 0.6));
    const q = Math.max(0, (s - 0.62) / 0.38);
    const fall = q <= 0 ? 1 : lerp(Math.sqrt(Math.max(0, 1 - q * q)), 1 - q, point);
    const hw = w * 0.5 * Math.max(0.12, rise) * fall;
    const c = add(add(root, u, L * s), p, w * bend * Math.sin(Math.PI * s));
    a.push(add(c, p, hw)); b.push(add(c, p, -hw));
  }
  return a.concat(b.reverse());
}
function paintFeather(g, root, tip, w, o) {
  const P = featherPoly(root, tip, w, o.bend ?? 0, 8, o.point ?? 0.35);
  poly(g, P);
  const d = sub(tip, root), pp = nrm([-d[1], d[0]]), c = mix(root, tip, 0.55);
  const gr = g.createLinearGradient(...add(c, pp, -w * 0.5), ...add(c, pp, w * 0.5));
  gr.addColorStop(0, o.dark); gr.addColorStop(0.5, o.fill); gr.addColorStop(1, o.light);
  g.fillStyle = gr; g.fill();
  // pale fringe toward the tip, darker root
  const tg = g.createLinearGradient(root[0], root[1], tip[0], tip[1]);
  tg.addColorStop(0, o.rootCol ?? "rgba(60,40,35,0.22)"); tg.addColorStop(0.45, "rgba(0,0,0,0)");
  tg.addColorStop(0.8, "rgba(255,250,240,0)"); tg.addColorStop(1, o.tipCol ?? "rgba(255,250,240,0.28)");
  g.fillStyle = tg; g.fill();
  if (o.vanes && w > 6) {
    // fine vane lines from the shaft out to the edges, leaning to the tip
    g.save(); poly(g, P); g.clip();
    const L = len(d), u = nrm(d), nV = Math.max(3, Math.round(L / (w * 0.45)));
    g.beginPath();
    for (let i = 1; i < nV; i++) {
      const s = i / nV, q = add(root, u, L * s);
      for (const k of [-1, 1]) { const e = add(add(q, pp, k * w * 0.55), u, w * 0.45); g.moveTo(q[0], q[1]); g.lineTo(e[0], e[1]); }
    }
    stroke(g, o.vaneCol ?? "rgba(80,60,55,0.18)", Math.max(0.5, LW * 0.35));
    g.restore();
  }
  if (o.shaft) { g.beginPath(); const a = mix(root, tip, 0.05), b = mix(root, tip, 0.85); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); stroke(g, o.shaft, Math.max(0.5, LW * 0.4)); }
  poly(g, P); stroke(g, o.line ?? PAL.line, LW * (o.lw ?? 0.55));
}

// ---------------------------------------------------------------- wings
function paintSpread(g, W, side) {
  const w = wingGeom(W, side), M = w.main, n = M.length;
  // primaries / secondaries, outermost first so the inner ones overlap them toward the body; narrower than their
  // spacing so the tips separate as in the source
  for (let i = n - 1; i >= 0; i--) {
    const f = M[i], L = len(sub(f.tip, f.root));
    paintFeather(g, f.root, f.tip, f.w * 0.8, { fill: PAL.wing, dark: PAL.wingD, light: PAL.wingL, bend: f.bend * 0.6, point: 0.75 - 0.35 * f.v, vanes: L > 30, vaneCol: "rgba(70,55,50,0.16)", shaft: "rgba(230,222,215,0.35)", tipCol: PAL.eyeRing ? "rgba(248,244,238,0.6)" : "rgba(245,240,232,0.25)", lw: 0.5, line: PAL.eyeRing ? "rgba(96,78,70,0.42)" : "rgba(74,44,34,0.7)" });
  }
  // one covert row, a shade paler, over the feather roots
  for (let i = w.cov1.length - 1; i >= 0; i--) {
    const f = w.cov1[i];
    paintFeather(g, f.root, f.tip, f.w * 0.85, { fill: PAL.covert ?? "#aea29c", dark: PAL.wing, light: PAL.covertL ?? "#cdc4bd", bend: f.bend, point: 0.35, lw: 0.45, rootCol: "rgba(0,0,0,0)", tipCol: "rgba(255,250,240,0.2)" });
  }
  // tan lesser coverts where the wing meets the body (fading to the wing grey along the arm)
  spath(g, w.band, true);
  const bc = mix(w.S, w.Wr, 0.6), gr = g.createLinearGradient(w.S[0], w.S[1], bc[0], bc[1]);
  gr.addColorStop(0, PAL.tan); gr.addColorStop(0.45, PAL.tanMid ?? "#d7b594"); gr.addColorStop(1, PAL.covert ?? "#aea29c");
  g.fillStyle = gr; g.fill();
  spath(g, w.lead, false); stroke(g, PAL.line, LW * 0.6);
  return w;
}
function paintFolded(g, W, side) {
  const w = foldGeom(W, side), o = w.o, d = sub(w.T, w.S);
  spath(g, w.outline, true);
  const gr = g.createLinearGradient(...add(w.S, o, -w.w * 0.3), ...add(w.S, o, w.w));
  gr.addColorStop(0, PAL.wingD); gr.addColorStop(0.55, PAL.wing); gr.addColorStop(1, PAL.wingL);
  g.fillStyle = gr; g.fill();
  g.save(); spath(g, w.outline, true); g.clip();
  // covert scallops across the upper half, primaries converging on the tip
  for (let k = 0; k < 2; k++) {
    const t0 = 0.3 + k * 0.18; g.beginPath();
    for (let j = 0; j <= 4; j++) { const p = add(add(w.S, d, t0 + j * 0.04), o, lerp(-0.2, 1.1, j / 4) * w.w); if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    stroke(g, "rgba(90,70,62,0.45)", LW * 0.5);
  }
  for (let k = 0; k < 3; k++) {
    const a = add(add(w.S, d, 0.55 + k * 0.06), o, lerp(0.95, 0.1, k / 2) * w.w);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(...add(add(w.S, d, 0.85), o, w.w * 0.3), w.T[0], w.T[1]);
    stroke(g, "rgba(90,70,62,0.5)", LW * 0.5);
  }
  g.restore();
  spath(g, w.outline, true); stroke(g, PAL.line, LW * 0.75);
}

// a wing bent like an arm onto the hip (beat A): a feathered tube shoulder S -> elbow E -> hand T, a fan of flight
// feathers hanging from the forearm toward fDir, covert scallops on the upper arm
function armGeom(W) {
  const pts = [], n = 16, th = W.th ?? 40;
  const q = (u) => { const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; return [a * W.S[0] + b * W.E[0] + c * W.T[0], a * W.S[1] + b * W.E[1] + c * W.T[1]]; };
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = q(u), p2 = q(Math.min(1, u + 0.01)), p1 = q(Math.max(0, u - 0.01)), d = nrm(sub(p2, p1)), nn = [-d[1], d[0]];
    const w = th * (1 - 0.45 * u) * (0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, u * 1.4)));
    L.push(add(p, nn, w / 2)); R.push(add(p, nn, -w / 2)); pts.push(p);
  }
  const fd = nrm(W.fDir ?? [0, 1]), feathers = [];
  const nf = W.nf ?? 5;
  for (let i = 0; i < nf; i++) {
    const u = 0.45 + 0.55 * (i / Math.max(1, nf - 1)), root = q(u), len0 = (W.fLen ?? 60) * (0.75 + 0.35 * Math.sin(Math.PI * (i + 0.5) / nf));
    const dir = nrm(add(fd, rot(fd, Math.PI / 2), (i - (nf - 1) / 2) * 0.12));
    feathers.push({ root, tip: add(root, dir, len0), w: len0 * 0.3 });
  }
  return { outline: L.concat(R.reverse()), spine: pts, feathers };
}
function paintArm(g, W) {
  const A = armGeom(W);
  for (const f of A.feathers) paintFeather(g, f.root, f.tip, f.w, { fill: PAL.wing, dark: PAL.wingD, light: PAL.wingL, point: 0.7, vanes: true, vaneCol: PAL.ink ? "rgba(60,60,60,0.25)" : undefined, lw: 0.6 });
  spath(g, A.outline, true);
  const gr = g.createLinearGradient(...W.S, ...W.T); gr.addColorStop(0, PAL.wingL); gr.addColorStop(0.6, PAL.wing); gr.addColorStop(1, PAL.wingD);
  g.fillStyle = gr; g.fill();
  g.save(); spath(g, A.outline, true); g.clip();
  // soft shade on the inner (body) side, a few long feather strokes along the arm, covert tips along the lower edge
  const sh = g.createLinearGradient(...A.spine[0], ...A.spine[A.spine.length - 1]);
  sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, PAL.ink ? "rgba(60,60,60,0.22)" : "rgba(90,70,62,0.2)");
  g.fillStyle = sh; g.fillRect(-1e4, -1e4, 2e4, 2e4);
  for (let i = 0; i < 7; i++) {
    const u0 = 0.1 + i * 0.1, p0 = A.spine[Math.round(u0 * 16)], p1 = A.spine[Math.min(16, Math.round(u0 * 16) + 4)];
    const off = ((i % 3) - 1) * (W.th ?? 40) * 0.22, d = nrm(sub(p1, p0)), nn = [-d[1], d[0]];
    g.beginPath(); g.moveTo(...add(p0, nn, off)); g.lineTo(...add(p1, nn, off * 0.8)); stroke(g, PAL.ink ? "rgba(90,90,90,0.35)" : "rgba(90,70,62,0.35)", LW * 0.45);
  }
  g.restore();
  spath(g, A.outline, true); stroke(g, PAL.line, LW * 0.9);
}

// ---------------------------------------------------------------- body, tail, legs
function bodyOutline(B) {
  const pts = bodyGeom({ ...B, pear: B.pear ?? -0.1 }), n = pts.length, out = [];  // pear > 0: fuller at the bottom
  // fluffy scallops round the lower half
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    out.push(p);
    const m = mix(p, q, 0.5), lo = (m[1] - (B.y + B.ry * 0.1)) / B.ry;
    if (lo > 0) out.push(add(m, nrm(sub(m, [B.x, B.y])), Math.min(B.rx, B.ry) * 0.03 * clamp(lo * 3)));
  }
  return out;
}
function paintBody(g, B) {
  const O = bodyOutline(B), R = Math.min(B.rx, B.ry);
  spath(g, O, true);
  const gr = g.createRadialGradient(B.x - B.rx * 0.2, B.y - B.ry * 0.3, R * 0.1, B.x, B.y, Math.max(B.rx, B.ry) * 1.08);
  gr.addColorStop(0, PAL.bodyL); gr.addColorStop(0.5, PAL.body); gr.addColorStop(0.82, PAL.bodyWarm); gr.addColorStop(1, PAL.bodySh);
  g.fillStyle = gr; g.fill();
  g.save(); spath(g, O, true); g.clip();
  // warm shade on the side away from the light (upper left)
  const lg = g.createLinearGradient(B.x - B.rx * 0.7, B.y - B.ry * 0.8, B.x + B.rx, B.y + B.ry);
  lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.6, "rgba(0,0,0,0)"); lg.addColorStop(1, PAL.ink ? "rgba(60,60,60,0.3)" : "rgba(160,95,45,0.28)");
  g.fillStyle = lg; g.fillRect(B.x - B.rx * 2, B.y - B.ry * 2, B.rx * 4, B.ry * 4);
  // fluffy texture: short soft strokes following the form (down and out), denser low and on the shaded side
  for (let i = 0; i < 160; i++) {
    const a = hsh(i, 1) * TAU, q = Math.sqrt(hsh(i, 2)) * 0.95;
    const lp = [Math.cos(a) * B.rx * q, Math.sin(a) * B.ry * q], p = add([B.x, B.y], rot(lp, B.rot ?? 0));
    const sh = clamp(0.3 + 0.45 * (Math.cos(a) * 0.4 + Math.sin(a) * 0.9) * q + 0.2 * q);
    if (hsh(i, 3) > sh) continue;
    const d = nrm(add(rot([Math.cos(a) * 0.4, 1], B.rot ?? 0), [0, 0])), L = R * (0.06 + 0.06 * hsh(i, 4));
    g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + d[0] * L * 0.5 + d[1] * L * 0.2, p[1] + d[1] * L * 0.5 - d[0] * L * 0.2, p[0] + d[0] * L, p[1] + d[1] * L);
    stroke(g, PAL.ink ? `rgba(90,90,90,${(0.12 + 0.3 * sh).toFixed(3)})` : `rgba(160,115,75,${(0.1 + 0.22 * sh).toFixed(3)})`, Math.max(0.6, LW * 0.45));
  }
  g.restore();
  // ink on the shadow side only
  const arc = [], flush = () => { if (arc.length > 2) { spath(g, arc, false); stroke(g, PAL.line, LW * 0.8); } arc.length = 0; };
  for (let i = 0; i <= O.length; i++) {
    const p = O[i % O.length], nn = nrm(sub(p, [B.x, B.y]));
    if (nn[0] * -0.55 + nn[1] * -0.83 < 0.3) arc.push(p); else flush();
  }
  flush();
  return O;
}
function paintTail(g, T) {
  if (!T) return;
  const n = T.n ?? 5;
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0, a = T.ang + u * (T.spread ?? 0.7), L = T.len * (1 - 0.3 * Math.abs(u));
    const root = [T.x, T.y], tip = add(root, [Math.cos(a), Math.sin(a)], L);
    paintFeather(g, root, tip, T.len * 0.3, { fill: PAL.tail, dark: PAL.tailD, light: PAL.tailL ?? "#f4dfc0", point: 0.3 });
  }
}
function legPoly(hip, f) {
  const s = f.size, ank = [f.x, f.y], d = sub(ank, hip), L = len(d) || 1, u = [d[0] / L, d[1] / L], p = [-u[1], u[0]];
  const w0 = s * (f.legW ?? 0.55), w1 = s * 0.3;
  const pts = [add(hip, p, w0), add(mix(hip, ank, 0.55), p, w0 * 0.95), add(ank, p, w1), add(ank, u, s * 0.08), add(ank, p, -w1), add(mix(hip, ank, 0.55), p, -w0 * 0.95), add(hip, p, -w0)];
  return { pts, u, p, w0, s, ank };
}
function paintLeg(g, hip, f) {
  // feathered "trouser" from the hip to the ankle, then the bare orange toes
  const { pts, u, p, w0, s, ank } = legPoly(hip, f);
  spath(g, pts, true);
  // feathered legs: plumage colour (the source's legs are fluffy trousers; only the toes are bare orange)
  const gr = g.createLinearGradient(...add(hip, p, -w0), ...add(hip, p, w0));
  gr.addColorStop(0, PAL.bodyWarm); gr.addColorStop(0.5, PAL.body); gr.addColorStop(1, PAL.bodySh);
  g.fillStyle = gr; g.fill(); stroke(g, PAL.line, LW * 0.6);
  // feather ticks down the leg
  for (let k = 1; k < 4; k++) {
    const c = mix(hip, ank, k / 4.2), a = add(c, p, -w0 * 0.6), b = add(c, p, w0 * 0.6), m = add(c, u, s * 0.12);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); stroke(g, PAL.legTick ?? "rgba(150,90,40,0.4)", LW * 0.4);
  }
  paintToes(g, ank, u, s, f.mode === "stand");
}
function paintToes(g, ank, u, s, stand = false) {
  // three toes fanned forward (down the leg direction), one back; dark hooked claws. Standing: the toes splay
  // sideways along the floor (two out to each side, one forward)
  const base = Math.atan2(u[1], u[0]);
  const fan = stand ? [[-1.3, 1.05], [-0.5, 0.85], [0.5, 0.85], [1.3, 1.05]] : [[-0.55, 0.62], [0, 0.72], [0.55, 0.6], [Math.PI - 0.2, 0.34]];
  for (const [da, Lk] of fan) {
    const a = base + da, d = [Math.cos(a), Math.sin(a)], e = add(ank, d, Lk * s);
    g.beginPath(); g.moveTo(ank[0], ank[1]); g.lineTo(e[0], e[1]);
    stroke(g, PAL.line, 0.2 * s + LW * 0.9); stroke(g, PAL.foot, 0.2 * s);
    // knuckle creases
    for (const t of stand ? [0.55] : [0.4, 0.7]) { const c = mix(ank, e, t), q = [-d[1], d[0]]; g.beginPath(); g.moveTo(...add(c, q, -0.08 * s)); g.lineTo(...add(c, q, 0.08 * s)); stroke(g, PAL.toeTick ?? "rgba(120,60,20,0.55)", LW * 0.4); }
    const tipP = add(e, d, 0.17 * s), q = [-d[1], d[0]];
    g.beginPath(); g.moveTo(...add(e, q, -0.07 * s)); g.quadraticCurveTo(...add(tipP, q, -0.02 * s), ...add(tipP, q, 0.05 * s)); g.lineTo(...add(e, q, 0.07 * s)); g.closePath();
    g.fillStyle = PAL.claw; g.fill();
  }
}
function paintPerchFoot(g, f) {
  // three toes hooked over the lid's front edge (at y = f.y + f.lid, default 0): a short run over the lid top, a bend
  // down the front, a dark claw tip
  // (fix #2, 2x crops at 117.20–117.48: each foot is three short, plump orange toes ≈ 6–7 px wide, side by side and
  // touching, ≈ 7 px over the lid top and ≈ 6 px curled down its front, small dark claw tips — not long tubes)
  const lid = f.lid ?? 0, w = 6.6, gap = 6.4;
  g.save(); g.translate(f.x, f.y); g.rotate(f.ang || 0);
  for (let k = -1; k <= 1; k++) {
    const x = k * gap, top = lid - 7 + Math.abs(k) * 1.2, tip = lid + 6 - Math.abs(k) * 0.8;
    g.beginPath();
    g.moveTo(x - w / 2, top + w / 2); g.lineTo(x - w / 2, lid); g.quadraticCurveTo(x - w * 0.5, tip, x, tip + 0.8);
    g.quadraticCurveTo(x + w * 0.5, tip, x + w / 2, lid); g.lineTo(x + w / 2, top + w / 2); g.arc(x, top + w / 2, w / 2, 0, Math.PI, true); g.closePath();
    const gr = g.createLinearGradient(0, top, 0, tip); gr.addColorStop(0, "#f0a456"); gr.addColorStop(0.6, "#e0892e"); gr.addColorStop(1, PAL.footD);
    g.fillStyle = gr; g.fill(); stroke(g, PAL.line, LW * 0.55);
    // knuckle crease on the lid edge, and the claw tip under the curl
    g.beginPath(); g.moveTo(x - w * 0.32, lid - 0.5); g.lineTo(x + w * 0.32, lid - 0.5); stroke(g, PAL.toeTick ?? "rgba(120,60,20,0.55)", LW * 0.35);
    g.beginPath(); g.moveTo(x - w * 0.2, tip - 0.6); g.quadraticCurveTo(x - w * 0.05, tip + 3.2, x + w * 0.18, tip - 0.2); g.fillStyle = PAL.claw; g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- head
// head-local units: x across (r = half the skull width), y down; T() maps into the frame
function headFrame(Hd) {
  const { x, y, r } = Hd, ro = Hd.rot ?? 0;
  return { x, y, r, ro, yaw: Hd.yaw ?? 0, T: (px, py) => { const q = rot([px * r, py * r], ro); return [x + q[0], y + q[1]]; } };
}
function skullPts(H, o) {
  const pts = [], N = 48, yaw = H.yaw;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, c = Math.cos(a), s = Math.sin(a);
    // wide, flat-topped, full cheeks; the chin melts into the chest (drawn separately)
    const top = s < 0, ry = top ? (o.top ?? 0.95) : (o.bot ?? 0.8);
    let rx = 1 + 0.05 * s * s;
    const px = Math.sign(c) * Math.pow(Math.abs(c), top ? 0.8 : 0.95) * rx, py = Math.sign(s) * Math.pow(Math.abs(s), top ? 1.25 : 1) * ry;
    pts.push(H.T(px + yaw * 0.06 * (1 - Math.abs(c)), py));
  }
  return pts;
}
function tuftPts(H, side, o) {
  // a small pointed tuft at the crown's shoulder (source: grey, 2–3 spikes)
  const a = -Math.PI / 2 + side * (o.tuftAt ?? 0.98), base = [Math.cos(a) * 0.93, Math.sin(a) * 0.8];
  const sz = o.tuft ?? 0.34, dir = nrm([Math.cos(a) + side * 0.25, Math.sin(a) - 0.4]);
  const pp = [-dir[1], dir[0]];
  const P = [add(base, pp, -0.18), add(add(base, dir, sz * 0.75), pp, -0.06), add(add(base, dir, sz * 0.55), pp, 0.02), add(add(base, dir, sz), pp, 0.08), add(add(base, dir, sz * 0.35), pp, 0.14), add(base, pp, 0.2)];
  return P.map(([px, py]) => H.T(px, py));
}
export const EYE_SHIFT = 0.4;
export const eyeHalfSpacing = (yaw) => 0.4 + 0.03 * Math.abs(yaw);
function eyeLayout(H, fx) {
  // half eye spacing ≈ 0.4 r (0.36–0.43 on 2x grids at 114.32, 114.60, 115.20, 117.36 s), the eye pair shifted ≈ 0.4 yaw
  // toward the turn (0.37–0.53); the far eye is drawn smaller (0.8x at 115.2 s)
  const yaw = H.yaw, sp = fx.eyeSp ?? eyeHalfSpacing(yaw), ey = fx.eyeY ?? 0.1, er = fx.eyeR ?? 0.27;
  return [-1, 1].map((k) => {
    const f = 1 - k * yaw * 0.6;
    const lx = yaw * EYE_SHIFT + k * sp;
    return { k, c: H.T(lx, ey), lc: [lx, ey], r: H.r * er * f, sx: 1 - Math.max(0, k * yaw) * 0.15 };
  });
}
function paintEye(g, H, e, st, look, catchSide) {
  const r = e.r, k = e.k;
  g.save(); g.translate(e.c[0], e.c[1]); g.rotate(H.ro); g.scale(e.sx, 1);
  const state = st?.s ?? "open";
  if (state === "closed" || state === "shut") {
    // happy closed ∩ (closed) or a soft lid line (shut)
    g.beginPath();
    if (state === "closed") { g.moveTo(-r * 0.95, r * 0.25); g.quadraticCurveTo(0, -r * 0.75, r * 0.95, r * 0.25); }
    else { g.moveTo(-r * 0.95, 0); g.quadraticCurveTo(0, r * 0.35, r * 0.95, 0); }
    stroke(g, PAL.eyeRim, Math.max(1.2, r * 0.16));
    g.restore(); return;
  }
  if (st?.almond) {
    // narrowed eye (angry, 114.12–114.56): an almond between a heavy upper lid and a thin lower lid, the iris pushed
    // to the side it looks at
    const op = st.almond, lx = (look?.[0] ?? 0) * r * 0.45, IR = r * 0.62;
    const up = (c) => { c.moveTo(-r * 1.05, r * 0.12); c.bezierCurveTo(-r * 0.5, -r * (0.55 * op + 0.1) + k * r * 0.12, r * 0.45, -r * (0.8 * op) - k * r * 0.12, r * 1.05, -r * 0.02); };
    const lo = (c) => { c.bezierCurveTo(r * 0.5, r * 0.55 * op, -r * 0.5, r * 0.6 * op, -r * 1.05, r * 0.12); };
    g.beginPath(); up(g); lo(g); g.closePath(); g.fillStyle = PAL.sclera; g.fill();
    g.save(); g.clip();
    const ig = g.createLinearGradient(0, -IR, 0, IR); ig.addColorStop(0, PAL.irisD); ig.addColorStop(0.5, PAL.iris); ig.addColorStop(1, PAL.irisL);
    g.beginPath(); g.arc(lx, r * 0.05, IR, 0, TAU); g.fillStyle = ig; g.fill();
    g.beginPath(); g.arc(lx, r * 0.05, IR * 0.55, 0, TAU); g.fillStyle = PAL.pupil; g.fill();
    g.beginPath(); g.arc(lx - IR * 0.3, -r * 0.12, IR * 0.24, 0, TAU); g.fillStyle = "#fffdf7"; g.fill();
    g.restore();
    g.beginPath(); up(g); stroke(g, PAL.eyeRim, Math.max(1.2, r * 0.17));
    g.beginPath(); g.moveTo(r * 1.05, -r * 0.02); lo(g); stroke(g, "rgba(90,55,35,0.75)", Math.max(0.7, r * 0.07));
    g.restore(); return;
  }
  const lid = st?.lid ?? 0, slant = (st?.slant ?? 0) * -k, low = st?.low ?? 0;
  // eye ball
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = PAL.sclera; g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.clip();
  const lx = (look?.[0] ?? 0) * r * 0.35, ly = (look?.[1] ?? 0) * r * 0.3, IR = r * (st?.iris ?? 0.8);
  const ig = g.createLinearGradient(0, ly - IR, 0, ly + IR); ig.addColorStop(0, PAL.irisD); ig.addColorStop(0.45, PAL.iris); ig.addColorStop(1, PAL.irisL);
  g.beginPath(); g.arc(lx, ly, IR, 0, TAU); g.fillStyle = ig; g.fill();
  g.beginPath(); g.arc(lx, ly, IR, 0, TAU); stroke(g, PAL.eyeRing ? "rgba(90,55,30,0.45)" : "rgba(70,40,20,0.7)", Math.max(0.6, r * 0.04));
  g.beginPath(); g.arc(lx, ly, IR * 0.6, 0, TAU); g.fillStyle = PAL.pupil; g.fill();
  const cs = catchSide ?? -1;
  g.beginPath(); g.arc(lx + cs * IR * 0.3, ly - IR * 0.32, IR * 0.32, 0, TAU); g.fillStyle = "#fffdf7"; g.fill();
  g.beginPath(); g.arc(lx - cs * IR * 0.35, ly + IR * 0.38, IR * 0.12, 0, TAU); g.fill();
  // lids: a disc-coloured sheet from the top (angry: slanted down to the inner corner), a lower lid from below
  if (lid > 0) {
    const ey = -r + 2 * r * lid, yl = (x) => ey + slant * x;
    g.beginPath(); g.moveTo(-r * 1.2, -r * 1.2); g.lineTo(r * 1.2, -r * 1.2); g.lineTo(r * 1.2, yl(r * 1.2)); g.lineTo(-r * 1.2, yl(-r * 1.2)); g.closePath();
    g.fillStyle = PAL.disc; g.fill();
    g.beginPath(); g.moveTo(-r * 1.05, yl(-r * 1.05)); g.lineTo(r * 1.05, yl(r * 1.05)); stroke(g, PAL.eyeRim, Math.max(1, r * 0.13));
  }
  if (low > 0) { g.beginPath(); g.rect(-r * 1.2, r * (1 - 2 * low), r * 2.4, r * 2); g.fillStyle = PAL.disc; g.fill(); }
  g.restore();
  // the eye's outer ring: thin grey in the colour owl (the source's pale disc with a fine ring), dark in B&W
  g.beginPath(); g.arc(0, 0, r, 0, TAU); stroke(g, PAL.eyeRing ?? PAL.eyeRim, Math.max(1, r * (PAL.eyeRing ? 0.07 : 0.12)));
  g.restore();
}
function paintBrow(g, H, e, st) {
  // angry brows (114.12–114.56): a heavy stroke from above the outer corner down to the inner corner, near the beak
  if (!st?.brow) return;
  const r = e.r / H.r, k = e.k, L = e.lc;
  const a = H.T(L[0] + k * r * 1.25, L[1] - r * 1.25), c = H.T(L[0] + k * r * 0.1, L[1] - r * 1.3), b = H.T(L[0] - k * r * 1.1, L[1] - r * 0.45);
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  stroke(g, PAL.line, Math.max(1.4, e.r * 0.2));
}
function paintBeak(g, H, c, s, turn) {
  g.save(); g.translate(c[0], c[1]); g.rotate(H.ro); g.scale(s, s);
  const t = turn * 8;
  // hooked upper mandible pointing down, a hint of the lower one
  g.beginPath(); g.moveTo(-12, -9); g.quadraticCurveTo(0 + t * 0.3, -14, 12, -9); g.quadraticCurveTo(12, 3, 3 + t, 12); g.quadraticCurveTo(t, 17, -1 + t, 11); g.quadraticCurveTo(-11, 2, -12, -9); g.closePath();
  const gr = g.createLinearGradient(-8, -12, 8, 14); gr.addColorStop(0, PAL.beakL ?? "#f7c070"); gr.addColorStop(0.5, PAL.beak); gr.addColorStop(1, PAL.beakD);
  g.fillStyle = gr; g.fill(); g.lineWidth = LW * 0.75 / s; g.strokeStyle = PAL.line; g.lineJoin = "round"; g.stroke();
  g.beginPath(); g.moveTo(-9, -2); g.quadraticCurveTo(0, 4, 9, -3); g.lineWidth = LW * 0.5 / s; g.strokeStyle = PAL.beakLine ?? "rgba(120,55,20,0.7)"; g.stroke();
  g.restore();
}
function paintPlaster(g, H, c, s, ang) {
  g.save(); g.translate(c[0], c[1]); g.rotate(H.ro + ang); g.scale(s, s);
  for (const rr of [0.62, -0.62]) {
    g.save(); g.rotate(rr);
    g.beginPath(); g.roundRect(-22, -6.5, 44, 13, 6.5); g.fillStyle = PAL.plaster; g.fill();
    g.lineWidth = LW * 0.55 / s; g.strokeStyle = PAL.plasterLine ?? "rgba(120,70,55,0.75)"; g.stroke();
    g.fillStyle = PAL.plasterPad; g.fillRect(-6, -4.5, 12, 9);
    g.fillStyle = PAL.plasterDot ?? "rgba(150,90,75,0.5)"; for (const x of [-15, -11, 11, 15]) { g.beginPath(); g.arc(x, -1.5, 0.9, 0, TAU); g.arc(x, 2, 0.9, 0, TAU); g.fill(); }
    g.restore();
  }
  g.restore();
}
function paintCup(g, H, c, near, face, cs = 1) {
  // an orange cup: a thick dark cushion ring on the head side, the shell, a yellow highlight; face = how much of the
  // cup face shows (the near cup is the big one)
  const w = H.r * (near ? 0.3 : 0.2) * (0.75 + 0.25 * face) * cs, h = H.r * (near ? 0.5 : 0.4) * cs, k = c.k;
  g.save(); g.translate(c.p[0], c.p[1]); g.rotate(H.ro + (c.tilt ?? 0));
  g.beginPath(); g.ellipse(-k * w * 0.3, 0, w * 0.95, h, 0, 0, TAU); g.fillStyle = PAL.cushion; g.fill(); stroke(g, PAL.line, LW * 0.6);
  g.beginPath(); g.ellipse(k * w * 0.32, 0, w * 0.72, h * 0.9, 0, 0, TAU);
  const gr = g.createLinearGradient(-w, -h, w, h); gr.addColorStop(0, PAL.cupL); gr.addColorStop(0.5, PAL.cup); gr.addColorStop(1, PAL.cupD);
  g.fillStyle = gr; g.fill(); stroke(g, PAL.line, LW * 0.7);
  g.beginPath(); g.ellipse(k * w * 0.45, 0, w * 0.4, h * 0.6, 0, 0, TAU); stroke(g, PAL.cupRing ?? "rgba(150,70,15,0.6)", LW * 0.6);
  g.beginPath(); g.ellipse(k * w * 0.18, -h * 0.3, w * 0.13, h * 0.3, -0.2 * k, 0, TAU); g.fillStyle = PAL.cupHi ?? "rgba(255,240,180,0.7)"; g.fill();
  g.restore();
}
function bandPts(H, cupL, cupR, fx) {
  // the band: from each cup's top over the crown
  const bandTop = fx.bandY ?? -1.38, lA = [cupL[0] + 0.05, cupL[1] - 0.45], lB = [cupR[0] - 0.05, cupR[1] - 0.45];
  const band = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, xm = lerp(lA[0], lB[0], u), ym = lerp(lA[1], lB[1], u) + (bandTop - lerp(lA[1], lB[1], 0.5)) * Math.sin(Math.PI * u);
    band.push(H.T(xm, ym));
  }
  return band;
}
export function paintHeadColour(g, P, fx = {}) {
  const Hd = P.head, H = headFrame(Hd);
  const skull = skullPts(H, fx);
  const eyes = eyeLayout(H, fx);
  // cups (measured centres in head units when available) and the band over the crown
  const cupL = fx.cupL ?? [-1.1 + H.yaw * 0.3, 0.0], cupR = fx.cupR ?? [1.1 + H.yaw * 0.3, 0.0];
  const cups = [{ k: -1, l: cupL }, { k: 1, l: cupR }].map((c) => ({ ...c, p: H.T(c.l[0], c.l[1]), near: c.k * H.yaw < 0 || (Math.abs(H.yaw) < 0.05) }));
  const far = cups.filter((c) => !c.near), near = cups.filter((c) => c.near);
  for (const c of far) paintCup(g, H, c, false, 0.6, fx.cupS ?? 1);
  const band = bandPts(H, cupL, cupR, fx);
  if (fx.cap) {
    // the dark gap under the band over the crown (111.0 / 112.0 frames: black between the band and the skull)
    g.save(); g.beginPath(); g.moveTo(band[0][0], band[0][1]); for (const q of band) g.lineTo(q[0], q[1]);
    const n = skull.length; for (let i = 0; i <= n / 2; i++) { const q = skull[(n - i) % n]; g.lineTo(q[0], q[1]); }
    g.closePath(); g.fillStyle = `rgba(12,12,12,${fx.cap})`; g.fill(); g.restore();
  }
  const bw = Math.max(2.4, H.r * 0.1 * (fx.bandW ?? 1));
  if (PAL.bandEdge) { spath(g, band, false); stroke(g, PAL.bandEdge, bw * 1.25); }
  spath(g, band, false); stroke(g, PAL.band, bw);
  spath(g, band, false); stroke(g, PAL.bandL, Math.max(0.6, H.r * 0.02));
  // tufts behind the crown line
  for (const s of [-1, 1]) {
    const T = tuftPts(H, s, fx);
    spath(g, T, true); g.fillStyle = PAL.tuft ?? PAL.crownD; g.fill(); stroke(g, PAL.line, LW * 0.6);
  }
  // skull (crown colour)
  spath(g, skull, true);
  const cg = g.createLinearGradient(...H.T(0, -0.9), ...H.T(0, 0.6));
  cg.addColorStop(0, PAL.crownD); cg.addColorStop(0.35, PAL.crown); cg.addColorStop(1, PAL.crownL);
  g.fillStyle = cg; g.fill();
  g.save(); spath(g, skull, true); g.clip();
  // crown feather ticks
  for (let i = 0; i < 26; i++) {
    const px = (hsh(i, 1) - 0.5) * 1.7, py = -0.78 + hsh(i, 2) * 0.45;
    const p = H.T(px, py), q = H.T(px + 0.05, py + 0.09);
    g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); stroke(g, PAL.tick ?? "rgba(90,72,66,0.35)", Math.max(0.5, LW * 0.35));
  }
  // facial disc: a lobe round each eye and the chin, cream, meeting in a V between the eyes
  const dR = fx.discR ?? 0.5;
  g.beginPath();
  for (const e of eyes) {
    const c = H.T(e.lc[0], e.lc[1] + 0.03), rr = H.r * dR * (0.85 + 0.15 * e.r / (H.r * 0.27));
    g.moveTo(c[0] + rr * e.sx, c[1]); g.ellipse(c[0], c[1], rr * e.sx, rr * 1.04, H.ro, 0, TAU);
  }
  const ch = H.T(H.yaw * 0.25, fx.chinY ?? 0.52);
  g.moveTo(ch[0] + H.r * 0.7, ch[1]); g.ellipse(ch[0], ch[1], H.r * 0.7, H.r * 0.45, H.ro, 0, TAU);
  const dg = g.createRadialGradient(...H.T(H.yaw * 0.3, 0.1), H.r * 0.2, ...H.T(H.yaw * 0.3, 0.2), H.r * 1.0);
  dg.addColorStop(0, PAL.disc); dg.addColorStop(0.75, PAL.disc); dg.addColorStop(1, PAL.discSh);
  g.fillStyle = dg; g.fill();
  // the disc's rim: a fine line on the upper arcs only
  for (const e of eyes) {
    const c = H.T(e.lc[0], e.lc[1] + 0.03);
    g.save(); g.translate(c[0], c[1]); g.rotate(H.ro);
    g.beginPath(); g.ellipse(0, 0, H.r * dR * e.sx, H.r * dR * 1.04, 0, Math.PI * 1.08, Math.PI * 1.92);
    stroke(g, PAL.discRim ?? "rgba(110,80,65,0.6)", LW * 0.5); g.restore();
  }
  g.restore();
  // skull ink round the crown and down the cheeks (the chin melts into the chest)
  { const n = skull.length, a0 = Math.round(n * (0.25 + 0.95 / TAU)), m = n - Math.round(n * 1.9 / TAU), arc = []; for (let i = 0; i <= m; i++) arc.push(skull[(a0 + i) % n]); spath(g, arc, false); stroke(g, PAL.line, LW * 0.9); }
  // plaster, eyes, brows, beak
  const pl = fx.plaster ?? [0.3, -0.52];
  paintPlaster(g, H, H.T(pl[0], pl[1]), H.r / 100 * (fx.plS ?? 1.05), fx.plAng ?? -0.25);
  const E = fx.eyes ?? {};
  eyes.forEach((e, i) => paintEye(g, H, e, (i ? E.R : E.L) ?? E.both, (i ? E.lookR : E.lookL) ?? E.look, E.catchSide));
  eyes.forEach((e, i) => paintBrow(g, H, e, (i ? E.R : E.L) ?? E.both));
  const bk = fx.beak ?? [H.yaw * 0.4, 0.42];
  paintBeak(g, H, H.T(bk[0], bk[1]), H.r / 100 * (fx.beakS ?? 1.6), H.yaw);
  if (fx.grin) {
    // the smirk: a mouth line sweeping from under the beak up to the viewer's right, a dimple at its end
    const s0 = H.T(bk[0] - 0.02, bk[1] + 0.12), c = H.T(bk[0] + fx.grin * 0.3, bk[1] + 0.2), e = H.T(bk[0] + fx.grin * 0.48, bk[1] - 0.02);
    g.beginPath(); g.moveTo(s0[0], s0[1]); g.quadraticCurveTo(c[0], c[1], e[0], e[1]); stroke(g, PAL.line, Math.max(1.2, H.r * 0.03));
    const d = H.T(bk[0] + fx.grin * 0.5, bk[1] - 0.08); g.beginPath(); g.moveTo(e[0], e[1]); g.lineTo(d[0], d[1]); stroke(g, PAL.line, Math.max(1, H.r * 0.022));
  }
  for (const c of near) paintCup(g, H, c, true, 1 - Math.abs(H.yaw) * 0.5, fx.cupS ?? 1);
  return { skull, eyes, band };
}

const hipsOf = (B) => [-1, 1].map((k) => add([B.x, B.y], rot([k * B.rx * 0.35, B.ry * 0.62], B.rot ?? 0)));
// polygons whose union is the owl's outline (DOM-free; used by the per-frame fits under node)
export function colourSilhouette(P, fx = {}) {
  const H = headFrame(P.head), out = [skullPts(H, fx)];
  const cupL = fx.cupL ?? [-1.1, 0], cupR = fx.cupR ?? [1.1, 0];
  for (const [l, k] of [[cupL, -1], [cupR, 1]]) {
    const c = H.T(l[0], l[1]), near = k * H.yaw < 0 || Math.abs(H.yaw) < 0.05, cs = fx.cupS ?? 1, w = H.r * (near ? 0.3 : 0.2) * cs, h = H.r * (near ? 0.5 : 0.4) * cs;
    out.push(Array.from({ length: 14 }, (_, i) => add(c, rot([Math.cos(i / 14 * TAU) * w * 1.05, Math.sin(i / 14 * TAU) * h], H.ro))));
  }
  // the band and the gap it encloses over the crown (the source masks include it)
  out.push(bandPts(H, cupL, cupR, fx));
  out.push(bodyOutline(P.body));
  (P.wings || []).forEach((W, i) => { if (!W) return; if (W.type === "arm") { const A = armGeom(W); out.push(A.outline); A.feathers.forEach((f) => out.push([f.root, add(f.root, nrm(sub(f.tip, f.root)), 1), f.tip])); return; } out.push(W.type === "folded" ? foldGeom(W, i ? 1 : -1).outline : wingOutline(wingGeom(W, i ? 1 : -1))); });
  const hips = hipsOf(P.body);
  (P.feet || []).forEach((f, i) => {
    if (f.mode === "perch") { out.push([[f.x - f.size * 0.45, f.y - f.size * 0.2], [f.x + f.size * 0.45, f.y - f.size * 0.2], [f.x + f.size * 0.45, f.y + f.size * 0.25], [f.x - f.size * 0.45, f.y + f.size * 0.25]]); return; }
    const L = legPoly(f.hip ?? hips[i], f); out.push(L.pts);
    const a = add(L.ank, L.u, f.size * 0.75); out.push([add(L.ank, L.p, -f.size * 0.5), add(L.ank, L.p, f.size * 0.5), add(a, L.p, f.size * 0.4), add(a, L.p, -f.size * 0.4)]);
  });
  return out;
}

// the whole colour owl, straight into the frame
export function drawColourOwl(ctx, P, fx = {}, palette = COL) {
  const g = ctx;
  PAL = palette;
  g.save();
  LW = clamp(P.head.r / 42, 0.8, 3.2);
  g.lineJoin = "round"; g.lineCap = "round";
  const lay = (i) => P.wings[i]?.layer ?? "mid";
  const wing = (i) => { const W = P.wings[i]; if (!W) return; if (W.type === "folded") paintFolded(g, W, i ? 1 : -1); else if (W.type === "arm") paintArm(g, W); else paintSpread(g, W, i ? 1 : -1); };
  [0, 1].forEach((i) => { if (lay(i) === "back") wing(i); });
  if (P.tail) paintTail(g, P.tail);
  const B = P.body;
  // legs hang from the hips (lower body) to the measured ankles; perched toes are drawn over the body
  const hips = hipsOf(B);
  if (P.feet) P.feet.forEach((f, i) => { if (f.mode !== "perch") paintLeg(g, f.hip ?? hips[i], f); });
  paintBody(g, B);
  if (P.feet) P.feet.forEach((f) => { if (f.mode === "perch") paintPerchFoot(g, f); });
  // the neck: head and body one soft shape (cream bridge, no outline)
  {
    const Hd = P.head, mx = (Hd.x + B.x) / 2, my = (Hd.y + Hd.r * 0.55 + B.y - B.ry * 0.5) / 2;
    const rx = Math.min(Hd.r * 0.9, B.rx * 0.95), ry = Math.max(8, Math.abs(B.y - B.ry * 0.5 - (Hd.y + Hd.r * 0.55)) / 2 + Hd.r * 0.3);
    g.beginPath(); g.ellipse(mx, my, rx, ry, 0, 0, TAU);
    const ng = g.createRadialGradient(mx - rx * 0.2, my - ry * 0.2, rx * 0.1, mx, my, Math.max(rx, ry));
    ng.addColorStop(0, PAL.bodyL); ng.addColorStop(0.75, PAL.body); ng.addColorStop(1, "rgba(239,226,198,0)");
    g.fillStyle = ng; g.fill();
  }
  [0, 1].forEach((i) => { if (lay(i) === "mid") wing(i); });
  const geo = paintHeadColour(g, P, fx);
  [0, 1].forEach((i) => { if (lay(i) === "front") wing(i); });
  g.restore();
  return geo;
}
