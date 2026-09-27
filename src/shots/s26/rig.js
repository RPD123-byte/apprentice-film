// s26 — the owl in flight, as a posable rig drawn in code (B&W "ink" style for the blast, colour style for the
// finished page). All geometry is in FRAME px and is DOM-free (rigGeom / rigSilhouette also run under node for the
// per-frame fits in snapshots/s26b-meas/fit). The pose of each frame comes from those fits to the source (owl
// silhouette + eye / headphone landmarks); the drawing itself is procedural: feathers, fluff, face parts.
//
// Pose P:
//   head  { x, y, r, rot, yaw, cupY, tuft }            r = half the skull width (px); yaw −1..1 (+ = face to viewer's right)
//   eyes  { state, look:[x,y], L:{state}, R:{state} }  states: open | angry | half | closed (happy ∩) | shut | wide
//   body  { x, y, rx, ry, rot }
//   wings [ { S:[x,y], Wr:[x,y], T:[x,y], trail (rad), sec (px), front } × 2 ]   (index 0 = viewer's left)
//   tail  { x, y, ang, len, spread } | null
//   feet  [ { x, y, ang, size } × 2 ] | null
//   look  "ink" | "colour"
const TAU = Math.PI * 2;
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (a) => Math.hypot(a[0], a[1]);
const nrm = (a) => { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; };
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
// deterministic hash in [0,1)
const hsh = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- feather shapes
// A lens-shaped feather from root to tip, width w, bowed sideways by bend (fraction of w). Returns a closed polygon.
export function featherPoly(root, tip, w, bend = 0, n = 7, tipRound = 0.25) {
  const d = sub(tip, root), L = len(d) || 1, u = [d[0] / L, d[1] / L], p = [-u[1], u[0]];
  const out = [], back = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    // half-width: quick swell from the quill, parallel sides, then a lanceolate tip over the last ~30 %
    const rise = Math.min(1, Math.pow(s / 0.12, 0.5));
    const q = Math.max(0, (s - 0.68) / 0.32);
    const fall = q <= 0 ? 1 : lerp(Math.sqrt(Math.max(0, 1 - q * q)), 1 - q, 1 - tipRound);
    const hw = w * 0.5 * Math.max(0.1, rise) * fall;
    const c = add(add(root, u, L * s), p, w * bend * Math.sin(Math.PI * s));
    out.push(add(c, p, hw)); back.push(add(c, p, -hw * (0.85 + 0.15 * s)));
  }
  return out.concat(back.reverse());
}

// ---------------------------------------------------------------- wings
// leading edge through S, Wr, T as a smooth polyline (quadratic blend of the two bones)
function leadEdge(S, Wr, T, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    // arm for u<0.45, hand after; a quadratic Bezier on each bone pair keeps the wrist bend soft
    if (u < 0.45) { const v = u / 0.45; pts.push(mix(S, Wr, v)); }
    else { const v = (u - 0.45) / 0.55; pts.push(mix(Wr, T, v)); }
  }
  // soften the wrist corner
  for (let k = 0; k < 2; k++) for (let i = 1; i < pts.length - 1; i++) pts[i] = mix(pts[i], mix(pts[i - 1], pts[i + 1], 0.5), 0.35);
  return pts;
}
export function wingGeom(W, side) {
  // "angel wing": the wing is the region between the leading edge (S → Wr → T) and the tip curve (T → M → B);
  // every feather of the main row joins a point of the leading edge to a point of the tip curve, so the outer ones
  // (rooted on the hand) are the long primaries and the inner ones (rooted on the arm) the secondaries.
  const { S, Wr, T } = W;
  const sec = Math.max(20, W.sec ?? 0.5 * len(sub(Wr, S)));
  const D = [Math.cos(W.trail), Math.sin(W.trail)];
  const n = W.n ?? 11;
  const lead = leadEdge(S, Wr, T, 24);
  const at = (u) => { const k = clamp(u) * (lead.length - 1), a = Math.floor(k), f = k - a; return mix(lead[a], lead[Math.min(lead.length - 1, a + 1)], f); };
  // tip curve: quadratic through T (u=0), M (u=0.5), B (u=1)
  const B = add(mix(S, Wr, 0.12), D, sec);
  const M = add(add(Wr, D, sec * (W.bulge ?? 1.15)), nrm(sub(T, Wr)), sec * 0.1);
  const Q = [2 * M[0] - 0.5 * (T[0] + B[0]), 2 * M[1] - 0.5 * (T[1] + B[1])];
  const tipC = (v) => { const a = (1 - v) * (1 - v), b = 2 * v * (1 - v), c = v * v; return [a * T[0] + b * Q[0] + c * B[0], a * T[1] + b * Q[1] + c * B[1]]; };
  const main = [];
  let spacing = 0;
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    // feather tips spaced evenly-ish along the tip curve, with a small sawtooth
    const tip = tipC(Math.pow(v, W.tipP ?? 1.1));
    const root = at(lerp(W.r0 ?? 0.43, W.r1 ?? 0.03, Math.pow(v, 0.9)));
    main.push({ root, tip, i, v });
  }
  for (let i = 0; i < n; i++) {
    const a = main[Math.max(0, i - 1)].tip, b = main[Math.min(n - 1, i + 1)].tip;
    main[i].w = Math.max(5, len(sub(b, a)) * 0.5 * (W.fw ?? 1.25) * (1 + 0.35 * main[i].v));
    main[i].bend = side * 0.1;
    spacing += len(sub(b, a)) / n;
  }
  // covert rows: shorter feathers from the leading edge toward the same tips, a third and ~55 % of the way
  const cov1 = [], cov2 = [];
  const nc = Math.round(n * 0.8);
  for (let i = 0; i < nc; i++) {
    const v = (i + 0.3) / nc;
    const j = v * (n - 1), f = main[Math.round(j)];
    const root = at(lerp(W.r0 ?? 0.43, W.r1 ?? 0.03, Math.pow(v, 0.9)) - 0.02);
    const dir = sub(f.tip, root);
    cov1.push({ root, tip: add(root, dir, lerp(W.c1a ?? 0.24, W.c1b ?? 0.48, v)), w: f.w * 1.25, i, bend: side * 0.08 });
    cov2.push({ root: add(root, dir, -0.02), tip: add(root, dir, lerp(W.c2a ?? 0.12, W.c2b ?? 0.26, v)), w: f.w * 1.15, i, bend: side * 0.06 });
  }
  // shoulder mass (the fluffy lesser coverts where the wing meets the body)
  const band = [];
  for (let i = 0; i <= 12; i++) band.push(at((i / 12) * 0.62));
  for (let i = 12; i >= 0; i--) { const u = (i / 12) * 0.62; const p = at(u); band.push(add(p, D, sec * (0.2 - 0.12 * u))); }
  return { S, Wr, T, D, B, M, sec, main, cov1, cov2, lead, band, side, spacing };
}

// ---------------------------------------------------------------- head
export function headGeom(Hd) {
  const { x, y, r } = Hd, ro = Hd.rot ?? 0, yaw = Hd.yaw ?? 0;
  const T = (px, py) => { const q = rot([px * r, py * r], ro); return [x + q[0], y + q[1]]; };
  const fx = yaw * 0.5;                          // face centre shift (units of r)
  // skull outline (units), slightly flattened on top, fuller cheeks; tufts (tuft 0..1) at the upper corners
  const out = [];
  const N = 44, tuft = Hd.tuft ?? 0.6, sq = Hd.sq ?? 1.02, egg = Hd.egg ?? 0.1;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, c = Math.cos(a), s = Math.sin(a);
    let rr = 1 + 0.04 * Math.cos(2 * a) * (s > 0 ? 1 : 0.4);
    // tufts: bumps at ±55° from the top
    for (const k of [-1, 1]) {
      const at = -Math.PI / 2 + k * 0.95 + yaw * 0.25, da = Math.atan2(Math.sin(a - at), Math.cos(a - at));
      rr += tuft * (k === -1 ? 0.14 : 0.12) * Math.exp(-(da * da) / 0.018);
    }
    out.push(T(c * rr * (1 + egg * s), s * rr * sq));
  }
  // face parts (units of r), measured on the blast owl at 112.00 (head r 88, yaw ≈ −0.3): eyes at (−0.67, 0.28) and
  // (+0.36, 0.25), half-widths 0.18 / 0.28 (the near eye is bigger), beak (−0.28, 0.66), plaster (−0.31, −0.38),
  // near cup centre 1.3 r out, 0.15 r down, half-size 0.42 × 0.5 r; band apex 1.14 r above the centre
  const eyeSp = Hd.eyeSp ?? 0.515, eyeY = Hd.eyeY ?? 0.27, efx = yaw * (Hd.eyeShift ?? 0.5);
  const eyes = [-1, 1].map((k) => {
    const f = 1 - k * yaw * (Hd.eyeNear ?? 0.67);
    return { c: T(efx + k * eyeSp, eyeY - k * yaw * 0.05), r: r * (Hd.eyeR ?? 0.23) * f, sx: 1, side: k, far: k * yaw > 0 || (yaw === 0 && k < 0) };
  });
  const beak = { c: T(yaw * (Hd.beakShift ?? 0.93), Hd.beakY ?? 0.63), s: r / 100 * (Hd.beakS ?? 1.0) };
  const irisR = Hd.irisR ?? 0.9;
  const bandage = { c: T(efx * 0.8 - 0.19, Hd.plY ?? -0.38), s: r / 100 * (Hd.plS ?? 1.1) };
  const cupY = Hd.cupY ?? 0.15, cupR = Hd.cupR ?? 1.3;
  const cups = [-1, 1].map((k) => {
    const az = k * Math.PI / 2 + yaw * 0.85;
    const far = -k * yaw < 0;
    return { c: T(Math.sin(az) * (far ? cupR * 0.85 : cupR), cupY), z: -k * yaw,
      face: clamp(Math.abs(Math.cos(az)) * 0.9 + 0.45, 0.45, 1) * (far ? 0.7 : 1), k, w: r * (Hd.cupW ?? 0.42), h: r * (Hd.cupH ?? 0.5) * (far ? 0.92 : 1) };
  });
  // band: over the crown from cup to cup (half-ellipse, apex 1.14 r up)
  const bandPts = [];
  const bR = Hd.bandW ?? 1.2, bH = Hd.bandH ?? 0.8, by0 = cupY - (Hd.cupH ?? 0.5);
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, a = Math.PI + u * Math.PI;
    bandPts.push(T(Math.cos(a) * bR + efx * 0.3 * Math.sin(u * Math.PI), by0 + Math.sin(a) * bH));
  }
  // iris centres (for landmarks): the almond's iris offset, per-eye look [x, y] (Hd.lookL / Hd.lookR or the shared look)
  const irises = eyes.map((e) => {
    const L = (e.side < 0 ? Hd.lookL : Hd.lookR) ?? Hd.look ?? [0, 0], er = e.r;
    const q = rot([L[0] * 0.42 * er, (0.05 + L[1] * 0.25) * er], ro); return [e.c[0] + q[0], e.c[1] + q[1]];
  });
  return { x, y, r, ro, yaw, fx, out, eyes, irises, beak, bandage, cups, band: bandPts, T, irisR };
}

// ---------------------------------------------------------------- body, tail, feet
export function bodyGeom(B) {
  const pts = [], N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    // fluffy: small feather-tip bumps round the lower half (in body-local angle)
    const lo = Math.max(0, Math.sin(a));
    const k = 1 + 0.045 * lo * (i % 2 ? 1 : -0.3);
    const p = rot([Math.cos(a) * B.rx * k * (1 + (B.pear ?? -0.12) * Math.sin(a)), Math.sin(a) * B.ry * k], B.rot ?? 0);
    pts.push([B.x + p[0], B.y + p[1]]);
  }
  return pts;
}
export function tailGeom(Tl) {
  if (!Tl) return [];
  const n = Tl.n ?? 5, fs = [];
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) - 0.5 : 0;
    const a = Tl.ang + u * (Tl.spread ?? 0.7);
    const L = Tl.len * (1 - 0.18 * Math.abs(u) * 2);
    const root = [Tl.x, Tl.y], tip = add(root, [Math.cos(a), Math.sin(a)], L);
    fs.push({ root, tip, w: Tl.len * 0.3, i });
  }
  return fs;
}

// ---------------------------------------------------------------- silhouette (for fitting)
export function rigGeom(P) {
  const G = { head: headGeom(P.head), body: bodyGeom(P.body) };
  G.wings = (P.wings || []).map((w, i) => (w ? (w.type === "folded" ? foldGeom(w, i ? 1 : -1) : wingGeom(w, i ? 1 : -1)) : null));
  G.tail = tailGeom(P.tail);
  return G;
}
// a wing folded against the body side (perched): a leaf from the shoulder S down to the tip T, bulging outward by w
export function foldGeom(W, side) {
  const { S, T } = W, w = W.w ?? 16, d = sub(T, S), L = len(d) || 1, u = [d[0] / L, d[1] / L];
  let o = [-u[1], u[0]]; if (o[0] * side < 0) o = [-o[0], -o[1]];         // outward normal (away from the body)
  const out = [], inn = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, c = add(S, d, t);
    const bulge = Math.sin(Math.PI * Math.pow(t, 0.8)) * (t < 0.85 ? 1 : 1);
    out.push(add(c, o, w * bulge)); inn.push(add(c, o, -w * 0.25 * Math.sin(Math.PI * t)));
  }
  return { folded: true, S, T, u, o, w, L, outline: out.concat(inn.reverse()), side };
}
// polygons whose union is the owl's silhouette
export function rigSilhouette(P, o = {}) {
  const G = rigGeom(P), polys = [G.head.out, G.body];
  for (const w of G.wings) {
    if (!w) continue;
    polys.push(w.folded ? w.outline : wingOutline(w));
  }
  for (const f of G.tail) polys.push(featherPoly(f.root, f.tip, f.w, 0, 5));
  // headphones stick out of the skull
  if (o.cups !== false) for (const c of G.head.cups) if (c.z > -0.2) {
    polys.push(Array.from({ length: 12 }, (_, i) => add(c.c, [Math.cos(i / 12 * TAU) * c.w * 0.9, Math.sin(i / 12 * TAU) * c.h])));
  }
  if (o.cups !== false && G.head.band) { const b = G.head.band; polys.push(b.concat(b.map((p) => mix(p, [G.head.x, G.head.y], 0.08)).reverse())); }
  if (P.feet && o.feet !== false) for (const f of P.feet) {
    const s = f.size;
    polys.push([add([f.x, f.y], rot([-0.3 * s, -0.6 * s], f.ang)), add([f.x, f.y], rot([0.3 * s, -0.6 * s], f.ang)), add([f.x, f.y], rot([0.45 * s, 0.6 * s], f.ang)), add([f.x, f.y], rot([-0.45 * s, 0.6 * s], f.ang))]);
  }
  return polys;
}

// ================================================================ painting (canvas)
export const LOOKS = {
  ink: {
    line: "#2a2a2a", lineSoft: "rgba(40,40,40,0.55)", fLine: "rgba(92,92,92,0.75)",
    body: "#efefec", bodyL: "#fbfbf9", bodySh: "#b9b9b5", bodyWarm: "#c9c9c4",
    cap: "#f3f3f0", capSh: "#dadad6", face: "#f3f3f0", faceSh: "#cfcfcb",
    wing: "#eeeeeb", wingL: "#fbfbf9", wingD: "#bdbdb9", covert: "#f2f2ef", shaft: "rgba(120,120,120,0.55)",
    cup: "#2b2b2b", cupL: "#6a6a6a", cupD: "#0e0e0e", cushion: "#151515", band: "#141414", bandL: "#5a5a5a",
    iris: "#101010", irisL: "#3a3a3a", pupil: "#050505", sclera: "#f4f4f1",
    beak: "#e9e9e6", beakD: "#9a9a96", plaster: "#f2f2ef", plasterD: "#b9b9b5", foot: "#e8e8e4", footD: "#9e9e9a", claw: "#1a1a1a",
    tail: "#efefec",
  },
  colour: {
    line: "#3a2723", lineSoft: "rgba(58,39,35,0.5)", fLine: "rgba(88,66,60,0.6)",
    body: "#edd8b9", bodyL: "#f6e8d0", bodySh: "#d6a47a", bodyWarm: "#dfb88f",
    cap: "#ab9b92", capSh: "#8e7c75", face: "#eedcbd", faceSh: "#dcc09c",
    wing: "#a8958c", wingL: "#bba89e", wingD: "#85716a", covert: "#b3a198", shaft: "rgba(235,225,215,0.35)",
    cup: "#e59434", cupL: "#f7c064", cupD: "#b0601c", cushion: "#2c2223", band: "#2a2022", bandL: "#5c5153",
    iris: "#8e5a31", irisL: "#c98f52", pupil: "#26150e", sclera: "#f3e6cf",
    beak: "#eba446", beakD: "#c1742b", plaster: "#e9b48c", plasterD: "#cd946c", foot: "#e9a443", footD: "#bd7426", claw: "#4b3129",
    tail: "#e8c9a2",
  },
};
let LW = 2;
function poly(g, pts, close = true) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
// Catmull-Rom closed/open path
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
function stroke(g, col, w) { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }

function paintFeather(g, f, fill, C, o = {}) {
  const P = featherPoly(f.root, f.tip, f.w, f.bend ?? 0, 9, o.tipRound ?? 0.25);
  poly(g, P);
  // shade across the vane: the side facing away from the light (−side, set by bend sign) is greyer; darker toward the root
  const d = sub(f.tip, f.root), L = len(d) || 1, u = [d[0] / L, d[1] / L], pp = [-u[1], u[0]];
  const c = mix(f.root, f.tip, 0.5), sgn = (f.bend ?? 0) >= 0 ? 1 : -1;
  const a0 = add(c, pp, -sgn * f.w * 0.55), a1 = add(c, pp, sgn * f.w * 0.55);
  const gr = g.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
  gr.addColorStop(0, o.dark ?? C.wingD); gr.addColorStop(0.45, fill); gr.addColorStop(1, o.light ?? C.wingL);
  g.fillStyle = gr; g.fill();
  if (o.rootShade !== false) {
    const rg = g.createLinearGradient(f.root[0], f.root[1], f.tip[0], f.tip[1]);
    rg.addColorStop(0, o.rootCol ?? "rgba(0,0,0,0.16)"); rg.addColorStop(0.5, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fill();
  }
  if (o.line !== false) {
    // ink only along the shadow-side edge and round the tip (the lit edge melts into the next feather)
    const n = (P.length / 2) | 0, side = sgn > 0 ? P.slice(n) : P.slice(0, n + 1);
    g.beginPath(); g.moveTo(side[0][0], side[0][1]); for (const q of side) g.lineTo(q[0], q[1]);
    stroke(g, o.lineCol ?? C.fLine, LW * (o.lw ?? 0.6));
  }
  if (o.shaft) {
    g.beginPath(); const a = mix(f.root, f.tip, 0.08), b = mix(f.root, f.tip, 0.82);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); stroke(g, C.shaft, LW * 0.45);
  }
}

function wingSilPath(g, w) {
  // the wing's rough outline (for clipping soft shading): lead edge out to T, then the tip curve back to B
  g.beginPath(); g.moveTo(w.lead[0][0], w.lead[0][1]);
  for (const p of w.lead) g.lineTo(p[0], p[1]);
  for (const f of w.main) g.lineTo(f.tip[0], f.tip[1]);
  g.lineTo(w.S[0], w.S[1]); g.closePath();
}
// the wing's outline: leading edge, then the feather tips with a notch between neighbours, back to the body
export function wingOutline(w) {
  const pts = w.lead.slice();
  const M = w.main, n = M.length;
  for (let i = 0; i < n; i++) {
    pts.push(M[i].tip);
    if (i < n - 1) {
      const a = M[i], b = M[i + 1], mid = mix(a.tip, b.tip, 0.5);
      const toRoot = nrm(sub(mix(a.root, b.root, 0.5), mid)), L = len(sub(a.tip, a.root));
      pts.push(add(mid, toRoot, L * (0.17 - 0.14 * a.v)));
    }
  }
  pts.push(mix(w.S, w.B, 0.5));
  return pts;
}
function paintFolded(g, w, C, look) {
  spath(g, w.outline, true);
  const gr = g.createLinearGradient(...add(w.S, w.o, -w.w * 0.3), ...add(w.S, w.o, w.w));
  gr.addColorStop(0, C.wingD); gr.addColorStop(0.5, C.wing); gr.addColorStop(1, C.wingL);
  g.fillStyle = gr; g.fill();
  // primaries' edges at the lower end, coverts at the top
  g.save(); spath(g, w.outline, true); g.clip();
  for (let k = 0; k < 3; k++) {
    const t0 = 0.5 + k * 0.14, a = add(add(w.S, [w.T[0] - w.S[0], w.T[1] - w.S[1]], t0), w.o, -w.w * 0.2), b = add(add(w.S, [w.T[0] - w.S[0], w.T[1] - w.S[1]], t0 + 0.35), w.o, w.w * 0.8);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 + w.o[0] * w.w * 0.3, (a[1] + b[1]) / 2 + w.o[1] * w.w * 0.3, b[0], b[1]);
    stroke(g, C.lineSoft, LW * 0.5);
  }
  g.restore();
  spath(g, w.outline, true); stroke(g, C.line, LW * 0.8);
}
function paintWing(g, w, C, look) {
  if (w.folded) return paintFolded(g, w, C, look);
  const ink = look === "ink", O = wingOutline(w), M = w.main, n = M.length;
  spath(g, O, true);
  // soft fill: light along the leading edge, greyer toward the trailing edge and at the root
  const lc = mix(w.Wr, w.T, 0.3), tc = mix(M[Math.round(n * 0.4)].tip, w.B, 0.3);
  const gr = g.createLinearGradient(lc[0], lc[1], tc[0], tc[1]);
  gr.addColorStop(0, C.wingL); gr.addColorStop(0.55, C.wing); gr.addColorStop(1, C.wingD);
  g.fillStyle = gr; g.fill();
  g.save(); spath(g, O, true); g.clip();
  const R = w.sec * 1.2, rg = g.createRadialGradient(w.S[0], w.S[1], R * 0.15, w.S[0], w.S[1], R);
  rg.addColorStop(0, ink ? "rgba(70,70,70,0.3)" : "rgba(70,50,45,0.3)"); rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg; g.fillRect(w.S[0] - R, w.S[1] - R, 2 * R, 2 * R);
  // feather separations: from the covert line out to each notch, tapering; a faint shaft along each feather
  for (let i = 0; i < n - 1; i++) {
    const a = M[i], b = M[i + 1], L = len(sub(a.tip, a.root));
    const notch = add(mix(a.tip, b.tip, 0.5), nrm(sub(mix(a.root, b.root, 0.5), mix(a.tip, b.tip, 0.5))), L * (0.17 - 0.14 * a.v));
    const start = mix(mix(a.root, b.root, 0.5), notch, a.v < 0.5 ? 0.3 : 0.45);
    const ctl = add(mix(start, notch, 0.5), nrm(sub(a.tip, a.root)), L * 0.04);
    g.beginPath(); g.moveTo(start[0], start[1]); g.quadraticCurveTo(ctl[0], ctl[1], notch[0], notch[1]);
    stroke(g, C.fLine, LW * 0.7);
    // shadow along the separation on the lower feather
    g.beginPath(); g.moveTo(start[0], start[1]); g.quadraticCurveTo(ctl[0], ctl[1], notch[0], notch[1]);
    stroke(g, ink ? "rgba(80,80,80,0.12)" : "rgba(70,50,45,0.12)", LW * 5);
    const s0 = mix(a.root, a.tip, 0.35), s1 = mix(a.root, a.tip, 0.9);
    g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); stroke(g, ink ? "rgba(120,120,120,0.45)" : C.shaft, LW * 0.45);
  }
  // covert rows: scallops along two curves across the feathers (their free edges face the trailing edge)
  for (const [q, amp, alpha] of [[0.48, 0.07, 0.75], [0.26, 0.05, 0.6]]) {
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const f = M[i], L = len(sub(f.tip, f.root)), p = mix(f.root, f.tip, q * (1 - 0.35 * f.v));
      const nx = i < n - 1 ? mix(M[i + 1].root, M[i + 1].tip, q * (1 - 0.35 * M[i + 1].v)) : p;
      if (i === 0) g.moveTo(p[0], p[1]);
      if (i < n - 1) { const c = add(mix(p, nx, 0.5), nrm(sub(f.tip, f.root)), L * amp); g.quadraticCurveTo(c[0], c[1], nx[0], nx[1]); }
    }
    stroke(g, ink ? `rgba(95,95,95,${alpha})` : `rgba(80,60,55,${alpha})`, LW * 0.6);
  }
  g.restore();
  // outline
  spath(g, O, true); stroke(g, ink ? "rgba(105,105,105,0.7)" : C.line, LW * 0.65);
}

function paintBody(g, P, B, C, look) {
  const ink = look === "ink", pts = bodyGeom(B), n = pts.length;
  const LX = -0.55, LY = -0.83;                                  // light from the upper left
  // fluffy outline: small scallops (outward arcs) round the lower two thirds
  const fl = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    fl.push(p);
    const lo = ((p[1] + q[1]) / 2 - (B.y - B.ry * 0.2)) / (B.ry * 1.2);
    if (lo > 0) {
      const m = mix(p, q, 0.5), nn = nrm(sub(m, [B.x, B.y]));
      fl.push(add(m, nn, Math.min(B.rx, B.ry) * (ink ? 0.035 : 0.018) * clamp(lo * 2)));
    }
  }
  spath(g, fl, true);
  const gr = g.createRadialGradient(B.x - B.rx * 0.3, B.y - B.ry * 0.35, Math.min(B.rx, B.ry) * 0.1, B.x, B.y, Math.max(B.rx, B.ry) * 1.1);
  gr.addColorStop(0, C.bodyL); gr.addColorStop(0.55, C.body); gr.addColorStop(0.85, C.bodyWarm); gr.addColorStop(1, C.bodySh);
  g.fillStyle = gr; g.fill();
  g.save(); spath(g, fl, true); g.clip();
  const lg = g.createLinearGradient(B.x - B.rx * 0.6, B.y - B.ry * 0.7, B.x + B.rx * 0.9, B.y + B.ry * 0.9);
  lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.55, "rgba(0,0,0,0)"); lg.addColorStop(1, ink ? "rgba(40,40,40,0.3)" : "rgba(130,70,35,0.28)");
  g.fillStyle = lg; g.fillRect(B.x - B.rx * 2, B.y - B.ry * 2, B.rx * 4, B.ry * 4);
  // feather marks in rows along shrinking copies of the outline (the body's contour lines); darker and denser on the
  // side turned from the light, nearly none in the lit centre
  const col = ink ? [80, 80, 80] : [150, 95, 55];
  const rows = ink ? 7 : 3;
  for (let row = 0; row < rows; row++) {
    const k = 0.92 - row * 0.12, per = Math.max(10, Math.round(n * k * 0.9));
    for (let j = 0; j < per; j++) {
      const q = ((j + (row % 2) * 0.5) / per) * n, i0 = Math.floor(q) % n, f = q - Math.floor(q);
      const e = mix(pts[i0], pts[(i0 + 1) % n], f), c = [B.x, B.y], p = mix(c, e, k);
      const nn = nrm(sub(e, c)), shade = clamp(0.5 - 0.7 * (nn[0] * LX + nn[1] * LY)) * (0.4 + 0.6 * (1 - row / 7));
      if (shade < 0.15 || hsh(row * 97 + j, 5) > 0.2 + shade) continue;
      const w = Math.min(B.rx, B.ry) * (0.055 + 0.02 * hsh(j, row)), tg = [-nn[1], nn[0]];
      const a0 = add(p, tg, -w), a1 = add(p, tg, w), cc = add(p, nn, w * 0.9);
      g.beginPath(); g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(cc[0], cc[1], a1[0], a1[1]);
      g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(0.15 + 0.4 * shade).toFixed(3)})`; g.lineWidth = LW * (0.35 + 0.35 * shade); g.stroke();
    }
  }
  // fine strokes hugging the shadow-side rim, along the form
  g.beginPath();
  for (let i = 0; i < n * 3; i++) {
    const q = i / 3, i0 = Math.floor(q) % n, f = q - Math.floor(q);
    const e = mix(pts[i0], pts[(i0 + 1) % n], f), nn = nrm(sub(e, [B.x, B.y]));
    const sh = 0.5 - 0.8 * (nn[0] * LX + nn[1] * LY);
    if (sh < 0.35 || hsh(i, 9) > sh) continue;
    const L = Math.min(B.rx, B.ry) * (0.12 + 0.18 * hsh(i, 8)), d = rot([-nn[0], -nn[1]], (hsh(i, 7) - 0.5) * 0.6);
    const s0 = add(e, d, Math.min(B.rx, B.ry) * 0.02), s1 = add(s0, d, L);
    g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]);
  }
  g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.5)`; g.lineWidth = LW * 0.45; g.stroke();
  g.restore();
  // ink only on the shadow side of the outline
  const arc = [];
  for (let i = 0; i <= fl.length; i++) {
    const p = fl[i % fl.length], nn = nrm(sub(p, [B.x, B.y]));
    if (0.5 - 0.8 * (nn[0] * LX + nn[1] * LY) > 0.25) arc.push(p);
    else if (arc.length > 1) { spath(g, arc, false); stroke(g, ink ? "rgba(70,70,70,0.75)" : C.line, LW * 0.8); arc.length = 0; }
    else arc.length = 0;
  }
  if (arc.length > 1) { spath(g, arc, false); stroke(g, ink ? "rgba(70,70,70,0.75)" : C.line, LW * 0.8); }
  spath(g, fl, true); stroke(g, ink ? "rgba(120,120,120,0.35)" : "rgba(90,60,50,0.35)", LW * 0.5);
}

function paintTail(g, T, C) {
  for (const f of tailGeom(T)) paintFeather(g, f, C.tail, C, { grad: [C.bodySh, C.tail], lw: 0.6, tipRound: 0.5 });
}

function paintFoot(g, f, C) {
  const s = f.size;
  if (f.mode === "perch") {
    // perched (117.04–): three short rounded toes side by side, hooked over the lid's edge (measured at 117.36: each
    // foot ~ 0.9·size wide, toes ~ 0.45·size long)
    g.save(); g.translate(f.x, f.y); g.rotate(f.ang || 0);
    for (let k = -1; k <= 1; k++) {
      const x = k * s * 0.3, w = s * 0.26, h = s * 0.5;
      g.beginPath(); g.roundRect(x - w / 2, -h * 0.35, w, h, w * 0.5);
      const gr = g.createLinearGradient(0, -h * 0.35, 0, h * 0.65); gr.addColorStop(0, C.foot); gr.addColorStop(1, C.footD);
      g.fillStyle = gr; g.fill(); stroke(g, C.line, LW * 0.6);
    }
    g.restore();
    return;
  }
  g.save(); g.translate(f.x, f.y); g.rotate(f.ang);
  // feathered leg
  g.beginPath(); g.ellipse(0, -0.45 * s, 0.28 * s, 0.42 * s, 0, 0, TAU); g.fillStyle = C.body; g.fill(); stroke(g, C.lineSoft, LW * 0.5);
  // three toes forward, one back, with claws
  for (const [a, L] of [[-0.45, 0.62], [0, 0.72], [0.45, 0.6], [Math.PI - 0.3, 0.35]]) {
    const d = [Math.sin(a), Math.cos(a)], e = [d[0] * L * s, d[1] * L * s];
    g.beginPath(); g.moveTo(0, -0.05 * s); g.lineTo(e[0], e[1]);
    stroke(g, C.line, 0.2 * s + LW * 0.6); stroke(g, C.foot, 0.2 * s);
    const c = add(e, d, 0.16 * s);
    g.beginPath(); g.moveTo(e[0] - d[1] * 0.07 * s, e[1] + d[0] * 0.07 * s); g.quadraticCurveTo(c[0], c[1], c[0] - d[1] * 0.06 * s, c[1] + d[0] * 0.06 * s + 0.05 * s); g.lineTo(e[0] + d[1] * 0.07 * s, e[1] - d[0] * 0.07 * s); g.closePath();
    g.fillStyle = C.claw; g.fill();
  }
  g.restore();
}

// ---- head parts
function paintCup(g, H, c, C, look) {
  const fw = c.w * (0.55 + 0.45 * c.face), h = c.h, k = c.k;
  g.save(); g.translate(c.c[0], c.c[1]); g.rotate(H.ro);
  // yoke up to the band
  g.beginPath(); g.moveTo(-k * fw * 0.1, -h * 0.8); g.lineTo(-k * fw * 0.25, -h * 1.12); stroke(g, C.band, h * 0.28);
  // cushion toward the head
  g.beginPath(); g.ellipse(-k * fw * 0.45, 0, fw * 0.62, h * 0.95, 0, 0, TAU); g.fillStyle = C.cushion; g.fill();
  // shell
  g.beginPath(); g.ellipse(k * fw * 0.12, 0, fw * 0.82, h, 0, 0, TAU);
  const gr = g.createLinearGradient(-fw, -h, fw, h); gr.addColorStop(0, C.cupL); gr.addColorStop(0.45, C.cup); gr.addColorStop(1, C.cupD);
  g.fillStyle = gr; g.fill(); stroke(g, C.line, LW * 0.9);
  g.beginPath(); g.ellipse(k * fw * 0.3, 0, fw * 0.5, h * 0.66, 0, 0, TAU); stroke(g, look === "ink" ? "rgba(120,120,120,0.6)" : "rgba(120,60,20,0.55)", LW * 0.7);
  g.beginPath(); g.ellipse(-k * fw * 0.2, -h * 0.35, fw * 0.14, h * 0.3, 0, 0, TAU); g.fillStyle = look === "ink" ? "rgba(200,200,200,0.35)" : "rgba(255,236,190,0.6)"; g.fill();
  g.restore();
}
// almond eye (the blast owl; also the angry colour owl): eye-local units of r (half-width), k = side (−1 left, +1 right)
function almond(g, r, k, state, lookV, C, sx) {
  const open = state === "half" ? 0.45 : state === "wide" ? 1.15 : state === "angry" ? 0.78 : 0.9;
  const inner = [-k * 1.0 * sx, 0.12 * r / r], outer = [k * 1.0 * sx, -0.08];
  // upper lid: a cubic from the inner corner, arched high over the outer half (angry: flattened and pulled down inside)
  const up = (c) => { c.moveTo(inner[0] * r, inner[1] * r);
    c.bezierCurveTo(-k * 0.6 * sx * r, (-0.62 * open + (state === "angry" ? 0.22 : 0)) * r, k * 0.45 * sx * r, -0.98 * open * r, outer[0] * r, outer[1] * r); };
  const low = (c) => { c.quadraticCurveTo(k * 0.1 * sx * r, 0.62 * r, inner[0] * r, inner[1] * r); };
  g.beginPath(); up(g); low(g); g.closePath();
  g.fillStyle = C.sclera; g.fill();
  g.save(); g.clip();
  const ix = (lookV?.[0] ?? 0) * 0.42 * r * sx, iy = (0.05 + (lookV?.[1] ?? 0) * 0.25) * r;
  g.beginPath(); g.arc(ix, iy, 0.6 * r, 0, TAU); g.fillStyle = C.iris; g.fill();
  if (C.pupil !== C.iris) { g.beginPath(); g.arc(ix, iy, 0.3 * r, 0, TAU); g.fillStyle = C.pupil; g.fill(); }
  g.beginPath(); g.arc(ix + 0.16 * r, iy - 0.18 * r, 0.14 * r, 0, TAU); g.fillStyle = "#fffdf6"; g.fill();
  // lid shadow
  g.beginPath(); up(g); g.lineTo(outer[0] * r, outer[1] * r + 0.25 * r); g.lineTo(inner[0] * r, inner[1] * r + 0.25 * r); g.closePath();
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fill();
  g.restore();
  g.beginPath(); up(g); stroke(g, C.line, LW * 2.3);
  g.beginPath(); g.moveTo(outer[0] * r, outer[1] * r); low(g); stroke(g, C.lineSoft, LW * 0.8);
  // lash flick at the outer corner
  g.beginPath(); g.moveTo(outer[0] * r, outer[1] * r); g.lineTo(k * 1.22 * sx * r, -0.2 * r); stroke(g, C.line, LW * 1.1);
}
function paintEye(g, e, state, look, C, H, lookV, shape, brow) {
  const r = e.r, k = e.side;
  g.save(); g.translate(e.c[0], e.c[1]); g.rotate(H.ro);
  if (state === "closed" || state === "shut") {
    g.beginPath();
    if (state === "closed") { g.moveTo(-r * 1.0 * e.sx, r * 0.25); g.quadraticCurveTo(0, -r * 0.7, r * 1.0 * e.sx, r * 0.25); }
    else { g.moveTo(-k * r * 1.05 * e.sx, -r * 0.1); g.quadraticCurveTo(0, r * 0.3, k * r * 1.05 * e.sx, r * 0.05); }
    stroke(g, C.line, LW * 1.5);
  } else if (shape === "almond") {
    almond(g, r, k, state, lookV, C, e.sx);
  } else {
    g.save(); g.scale(e.sx, 1);
    g.beginPath(); g.arc(0, 0, r * 1.08, 0, TAU); g.fillStyle = C.sclera; g.fill();
    const px = (lookV?.[0] ?? 0) * r * 0.32, py = (lookV?.[1] ?? 0) * r * 0.3;
    const IR = H.irisR ?? 0.9;
    g.beginPath(); g.arc(px * 0.5, py * 0.5, r * IR, 0, TAU);
    const gr = g.createRadialGradient(0, r * 0.2, r * 0.1, 0, 0, r * IR); gr.addColorStop(0, C.irisL); gr.addColorStop(1, C.iris); g.fillStyle = gr;
    g.fill();
    g.beginPath(); g.arc(px * 0.5, py * 0.5, r * IR * 0.58, 0, TAU); g.fillStyle = C.pupil; g.fill();
    g.beginPath(); g.arc(px * 0.5 - r * IR * 0.3, py * 0.5 - r * IR * 0.32, r * IR * 0.3, 0, TAU); g.fillStyle = "#fffdf6"; g.fill();
    g.beginPath(); g.arc(0, 0, r * 1.08, 0, TAU); stroke(g, C.line, LW * 0.9);
    let lid = 0, slant = 0, low = 0;
    if (state === "angry") { lid = 0.5; slant = 0.55; low = 0.12; }
    else if (state === "half") { lid = 0.42; slant = 0.05; low = 0.1; }
    else if (state === "smug") { lid = 0.5; slant = -0.15; low = 0.18; }
    if (lid > 0) {
      g.save(); g.beginPath(); g.arc(0, 0, r * 1.14, 0, TAU); g.clip();
      const ey = -r + 2 * r * lid, yl = (x) => ey - k * slant * x;
      g.beginPath(); g.moveTo(-r * 1.5, -r * 1.5); g.lineTo(r * 1.5, -r * 1.5); g.lineTo(r * 1.5, yl(r * 1.5)); g.lineTo(-r * 1.5, yl(-r * 1.5)); g.closePath();
      g.fillStyle = C.face; g.fill();
      if (low > 0) { g.beginPath(); g.rect(-r * 1.5, r * (1 - 2 * low), r * 3, r * 2); g.fill(); }
      g.restore();
      g.beginPath(); g.moveTo(-r * 1.18, yl(-r * 1.18)); g.lineTo(r * 1.18, yl(r * 1.18)); stroke(g, C.line, LW * 1.3);
    }
    g.restore();
  }
  // brows (measured on the blast owl at 112.00, eye-local units of the eye half-width): the far brow furrowed down to
  // the inner corner, the near brow arched high with its inner end pulled down to the nose ridge
  const bs = brow ?? (state === "angry" || shape === "almond" ? (e.far ? "furrow" : "arch") : null);
  if (bs && state !== "closed") {
    g.beginPath();
    if (bs === "furrow") {
      g.moveTo(k * 0.25 * r, -1.5 * r); g.quadraticCurveTo(-k * 0.55 * r, -1.3 * r, -k * 1.08 * r, 0.0);
      stroke(g, C.line, LW * 1.9);
    } else {
      g.moveTo(-k * 1.9 * r, 0.08 * r); g.bezierCurveTo(-k * 1.35 * r, -0.45 * r, -k * 0.7 * r, -1.05 * r, -k * 0.08 * r, -0.95 * r);
      g.quadraticCurveTo(k * 0.6 * r, -0.9 * r, k * 1.05 * r, -0.58 * r);
      stroke(g, C.line, LW * 1.9);
    }
  }
  g.restore();
}
function paintBeak(g, b, C, H) {
  // hooked upper mandible pointing down (and toward the side the face turns), a gape line, a small lower mandible
  const s = b.s, t = (H.yaw ?? 0) * 26;
  g.save(); g.translate(b.c[0], b.c[1]); g.rotate(H.ro); g.scale(s, s);
  g.beginPath(); g.moveTo(-18, 4); g.quadraticCurveTo(-4, 12, 16, 2); g.quadraticCurveTo(6, 14, t * 0.4, 18); g.closePath();
  g.fillStyle = C.beakD; g.fill();
  g.beginPath();
  g.moveTo(-22, -10); g.quadraticCurveTo(-4, -22, 22, -8);
  g.quadraticCurveTo(20, 6, 8 + t * 0.3, 14); g.quadraticCurveTo(t - 4, 30, t - 8, 22);
  g.quadraticCurveTo(-18, 10, -22, -10); g.closePath();
  const gr = g.createLinearGradient(-10, -18, 10, 22); gr.addColorStop(0, C.beak); gr.addColorStop(1, C.beakD);
  g.fillStyle = gr; g.fill(); g.lineWidth = LW / s * 0.9; g.strokeStyle = C.line; g.lineJoin = "round"; g.stroke();
  g.beginPath(); g.moveTo(-19, 2); g.quadraticCurveTo(-2, 10, 18, 0); g.lineWidth = LW / s * 0.7; g.stroke();
  g.fillStyle = C.line; g.beginPath(); g.ellipse(-6, -8, 2.2, 1.4, 0.3, 0, TAU); g.fill();
  g.restore();
}
function paintBandage(g, b, C, H) {
  const s = b.s;
  g.save(); g.translate(b.c[0], b.c[1]); g.rotate(H.ro - 0.3); g.scale(s, s);
  for (const rr of [0.6, -0.6]) {
    g.save(); g.rotate(rr);
    g.beginPath(); g.roundRect(-24, -7, 48, 14, 7); g.fillStyle = C.plaster; g.fill(); g.lineWidth = LW / s * 0.6; g.strokeStyle = C.lineSoft; g.stroke();
    g.fillStyle = C.plasterD; g.fillRect(-6, -5, 12, 10);
    g.restore();
  }
  g.restore();
}
function paintHead(g, P, Hd, C, look) {
  const H = headGeom(Hd);
  // far cup and the band behind the skull
  for (const c of H.cups) if (c.z < -0.05) paintCup(g, H, c, C, look);
  spath(g, H.band, false); stroke(g, C.band, 0.17 * H.r);
  spath(g, H.band, false); stroke(g, C.bandL, 0.025 * H.r);
  // skull: cap colour, face disc over it
  spath(g, H.out, true);
  const cg = g.createLinearGradient(H.x, H.y - H.r, H.x, H.y + H.r);
  cg.addColorStop(0, C.cap); cg.addColorStop(1, C.capSh); g.fillStyle = cg; g.fill();
  g.save(); spath(g, H.out, true); g.clip();
  // face disc: two lobes round the eyes and the chin
  g.beginPath();
  const dR = P.head.discR, dY = P.head.discY ?? 0.1;
  for (const e of H.eyes) {
    const rx = dR ? H.r * dR : e.r * 2.15 * e.sx, ry = dR ? H.r * dR * 1.08 : e.r * 2.35, cy = dR ? e.c[1] + H.r * dY : e.c[1] + e.r * 0.3;
    g.moveTo(e.c[0] + rx, cy); g.ellipse(e.c[0], cy, rx, ry, H.ro, 0, TAU);
  }
  const chR = P.head.chin ?? [0.8, 0.5, 0.52];
  const ch = H.T(H.fx * 0.9, chR[2]); g.moveTo(ch[0] + H.r * chR[0], ch[1]); g.ellipse(ch[0], ch[1], H.r * chR[0], H.r * chR[1], H.ro, 0, TAU);
  g.fillStyle = C.face; g.fill();
  // shading at the skull rim
  const rg = g.createRadialGradient(H.x - H.r * 0.2, H.y - H.r * 0.25, H.r * 0.5, H.x, H.y, H.r * 1.1);
  rg.addColorStop(0, "rgba(0,0,0,0)"); rg.addColorStop(0.8, "rgba(0,0,0,0)"); rg.addColorStop(1, look === "ink" ? "rgba(90,90,90,0.35)" : "rgba(90,60,50,0.3)");
  g.fillStyle = rg; g.fillRect(H.x - H.r * 1.5, H.y - H.r * 1.5, H.r * 3, H.r * 3);
  g.restore();
  if (true) {
    // the lower face melts into the chest: ink only round the crown and down the cheeks (both looks: the source draws
    // head and body as one continuous shape)
    const n = H.out.length, a0 = Math.round(n * 0.40), a1 = Math.round(n * 1.10);
    const arc = []; for (let i = a0; i <= a1; i++) arc.push(H.out[i % n]);
    spath(g, arc, false); stroke(g, C.line, LW * 1.0);
  } else { spath(g, H.out, true); stroke(g, C.line, LW * 1.0); }
  paintBandage(g, H.bandage, C, H);
  const E = P.eyes || {};
  for (const e of H.eyes) paintEye(g, e, (e.side < 0 ? E.L : E.R) ?? E.state ?? "open", look, C, H, (e.side < 0 ? E.lookL : E.lookR) ?? E.look, E.shape ?? (look === "ink" ? "almond" : "round"), e.side < 0 ? E.browL : E.browR);
  paintBeak(g, H.beak, C, H);
  for (const c of H.cups) if (c.z >= -0.05) paintCup(g, H, c, C, look);
}

// drawRig(ctx, P): the whole owl, straight into the frame
export function drawRig(ctx, P) {
  ctx.save();
  try { drawRigInner(ctx, P); } finally { ctx.restore(); }
}
function drawRigInner(ctx, P) {
  const look = P.look ?? "colour", C = LOOKS[look], g = ctx;
  LW = clamp(P.head.r / 45, 1.1, 4.2);
  const G = rigGeom(P);
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  // layers: "back" wings, tail, feet, body, "mid" wings (default: over the body at the shoulders), head, "front" wings
  const lay = (i) => P.wings[i].layer ?? (P.wings[i].front ? "front" : "mid");
  G.wings.forEach((w, i) => { if (w && lay(i) === "back") paintWing(g, w, C, look); });
  if (P.tail) paintTail(g, P.tail, C);
  // feet below the body's lower edge (perched toes on the lid) are drawn over it; dangling feet behind
  const front = (f) => f.y > P.body.y + P.body.ry * 0.75;
  if (P.feet) for (const f of P.feet) if (!front(f)) paintFoot(g, f, C);
  paintBody(g, P, P.body, C, look);
  if (P.feet) for (const f of P.feet) if (front(f)) paintFoot(g, f, C);
  // the neck: head and body are one soft shape (a fill bridging the chin and the chest, no outline)
  {
    const Hd = P.head, B = P.body, mx = (Hd.x + B.x) / 2, my = (Hd.y + Hd.r * 0.6 + B.y - B.ry * 0.5) / 2;
    const rx = Math.min(Hd.r * 0.95, B.rx * 0.95), ry = Math.max(10, Math.abs(B.y - B.ry * 0.5 - (Hd.y + Hd.r * 0.6)) / 2 + Hd.r * 0.35);
    g.save(); g.beginPath(); g.ellipse(mx, my, rx, ry, Math.atan2(B.x - Hd.x, Hd.y - B.y) * -0 + 0, 0, TAU);
    const ng = g.createRadialGradient(mx - rx * 0.3, my - ry * 0.3, rx * 0.1, mx, my, Math.max(rx, ry));
    ng.addColorStop(0, C.bodyL); ng.addColorStop(0.7, C.body); ng.addColorStop(1, C.bodyWarm);
    g.fillStyle = ng; g.fill(); g.restore();
  }
  G.wings.forEach((w, i) => { if (w && lay(i) === "mid") paintWing(g, w, C, look); });
  paintHead(g, P, P.head, C, look);
  G.wings.forEach((w, i) => { if (w && lay(i) === "front") paintWing(g, w, C, look); });
  g.restore();
}

// a pose from a flat vector (see posesC.js etc.) over a base pose
export function unpack(KEYS, v, base) {
  const P = JSON.parse(JSON.stringify(base));
  KEYS.forEach((path, i) => {
    if (v[i] == null) return;
    const ks = path.split("."); let o = P;
    for (let j = 0; j < ks.length - 1; j++) { if (o[ks[j]] == null) o[ks[j]] = /^\d+$/.test(ks[j + 1]) ? [] : {}; o = o[ks[j]]; }
    o[ks[ks.length - 1]] = v[i];
  });
  return P;
}
