// s17 owl renderer: the owl kit's parts (owlInk.js) re-assembled for this shot's cartoon owl — round thin-rimmed
// eyes with small pupils, a heart-shaped facial disc line, grey ringed headphone cups, broad cartoon wings with
// overlapping feathers and scalloped coverts, a fan tail, and feet that can sit in front of the belly.
// Layer order is per pose, so a wing can sit between the body and the head (the kit draws wings on fixed layers).
// Everything is in owl units (head vertical radius = 100) and seeded: the same pose always gives the same pixels.
import { LINE, gv, V, setPPU, ink, flick, plumage, softShade, rimHatch, screentone, headGeom, headphoneGeom, drawEye, drawBeak, bodyOutline } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng, clamp, lerp } from "../../lib/rng.js";

const { add, sub, mul, nrm, perp } = V;
const TAU = Math.PI * 2;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);
let PPU = 1;
const wmin = (w) => Math.max(w, 0.7 / PPU);

// ---------------------------------------------------------------- wings
// A cartoon wing given by its leading edge (lead: shoulder -> hand end) and its feather tips (tips: outermost ->
// innermost), both measured straight off the source. Each feather roots on the leading edge (outer ones at the
// hand end) and runs to its tip; widths follow the spacing of neighbouring tips so the feathers overlap into one
// wing; a covert band (cw = fraction of the feather length) covers the roots.
export function wingGeom(w) {
  const { lead: L0, tips: T0, cw = 0.36, fw = 1, rmax = 0.62, sub: subd = 1 } = w;
  // subdivide the measured tips: an extra, slightly shorter feather between each pair (a serrated edge)
  let tips = T0;
  if (subd) {
    tips = [];
    for (let i = 0; i < T0.length; i++) {
      tips.push(T0[i]);
      if (i < T0.length - 1) {
        const m = V.mix(T0[i], T0[i + 1], 0.5), c = V.mix(L0[0], L0[L0.length - 1], 0.5 + 0.5 * (1 - i / (T0.length - 1)) - 0.25);
        tips.push(V.mix(m, c, 0.1));
      }
    }
  }
  const lead = sampleCurve(L0, 8);
  const acc = [0];
  for (let i = 1; i < lead.length; i++) acc.push(acc[i - 1] + V.len(sub(lead[i], lead[i - 1])));
  const total = acc[acc.length - 1] || 1;
  const at = (f) => {
    const d = clamp(f) * total;
    let i = 1; while (i < acc.length - 1 && acc[i] < d) i++;
    const u = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
    return V.mix(lead[i - 1], lead[i], clamp(u));
  };
  const n = tips.length;
  const feathers = tips.map((tip, i) => {
    const f = n === 1 ? 1 : 1 - i / (n - 1);
    return { root: at(0.04 + rmax * f), tip, point: 0.75 + 0.25 * f, kind: f > 0.45 ? 1 : 0 };
  });
  let trs = [0, 0], Ls = 0;
  for (let i = 0; i < n; i++) {
    const f = feathers[i], L = V.len(sub(f.tip, f.root));
    const a = feathers[Math.max(0, i - 1)].tip, b = feathers[Math.min(n - 1, i + 1)].tip;
    const sp = V.len(sub(b, a)) / (i > 0 && i < n - 1 ? 2 : 1);
    f.w = clamp(sp * 2.2, L * 0.2, L * 0.38) * fw;
    trs = add(trs, nrm(sub(f.tip, f.root))); Ls += L;
  }
  // each feather's body leans toward the trailing side (the next feather in), so the outermost feather's front
  // edge runs along the wing's leading edge instead of sticking out past it
  for (let i = 0; i < n; i++) {
    const f = feathers[i], u = nrm(sub(f.tip, f.root));
    let nn = perp(u);
    const ref = i < n - 1 ? feathers[i + 1].tip : V.mix(f.root, f.tip, 0.5);
    const side = i < n - 1 ? sub(ref, f.tip) : sub(feathers[Math.max(0, i - 1)].tip, f.tip);
    if ((nn[0] * side[0] + nn[1] * side[1]) * (i < n - 1 ? 1 : -1) < 0) nn = mul(nn, -1);
    f.off = mul(nn, f.w * (i === 0 ? 0.42 : 0.22));
  }
  const cov = feathers.map((f) => V.mix(f.root, f.tip, cw));
  return { lead, cov, feathers, tr: nrm(trs), len: Ls / Math.max(1, n) };
}
function leaf(f) {
  const d = sub(f.tip, f.root), L = V.len(d) || 1, u = mul(d, 1 / L), n = perp(u), w = f.w, p = f.point;
  const o = f.off || [0, 0];
  const sh = (q, k) => add(q, mul(o, k));
  return [
    sh(add(f.root, mul(n, -w * 0.3)), 1), sh(add(add(f.root, mul(u, L * 0.4)), mul(n, -w * 0.5)), 0.85), sh(add(add(f.root, mul(u, L * (0.78 + 0.08 * p))), mul(n, -w * (0.36 - 0.12 * p))), 0.45),
    f.tip,
    sh(add(add(f.root, mul(u, L * (0.78 + 0.08 * p))), mul(n, w * (0.36 - 0.12 * p))), 0.45), sh(add(add(f.root, mul(u, L * 0.4)), mul(n, w * 0.5)), 0.85), sh(add(f.root, mul(n, w * 0.3)), 1),
  ];
}
function paintWing(g, G, plu, dl) {
  // feathers: outermost first, each inner one overlapping the next one out
  for (let i = 0; i < G.feathers.length; i++) {
    const f = G.feathers[i], sh = leaf(f), path = blobPath(sh);
    plumage(g, path, { base: 0.96, shade: f.kind ? 0.8 : 0.78, depth: f.w * 0.3, blur: f.w * 0.18, ...plu });
    ink(g, sh.slice(1, 6), 1.1, gv(0.25, 0.85), { end: 0.15, bias: 0.6 });
    if (dl > 0.4) {
      const d = nrm(sub(f.tip, f.root)), L = V.len(sub(f.tip, f.root)), nn = perp(d);
      ink(g, [add(f.root, mul(d, L * 0.3)), add(f.root, mul(d, L * 0.8))], 0.7, gv(0.55, 0.35), { end: 0.1 });
      // pencil tone: a few grey barbs along the vane, the shaded side of the feather
      const r = rng(900 + i * 7);
      for (let k = 0; k < 4; k++) {
        const u = 0.3 + 0.5 * r(), p0 = add(add(f.root, mul(d, L * u)), mul(nn, f.w * (0.05 + 0.15 * r())));
        flick(g, p0, nrm(add(d, mul(nn, 0.5))), f.w * 0.35, 0.8, gv(0.5, 0.3), 0.1);
      }
    }
  }
  // covert band along the leading edge, with a scalloped lower edge and a second, lighter row
  const band = [...G.lead, ...G.cov];
  const bp = blobPath(band);
  plumage(g, bp, { base: 0.97, shade: 0.86, depth: G.len * 0.15, blur: G.len * 0.08, ...plu });
  const covIn = [...G.cov].reverse();
  scallops(g, covIn, G.tr, G.len * 0.12, 0.9, gv(0.45, 0.55));
  ink(g, G.lead, 1.4, gv(0.22, 0.9), { end: 0.25, bias: 0.4 });
}
// a row of small arcs hanging toward dir along a polyline
function scallops(g, pts, dir, r, w, color) {
  const q = sampleCurve(pts, 4);
  let acc = 0, last = q[0];
  const marks = [q[0]];
  for (let i = 1; i < q.length; i++) { acc += V.len(sub(q[i], q[i - 1])); if (acc >= r * 1.7) { marks.push(q[i]); acc = 0; } last = q[i]; }
  if (V.len(sub(marks[marks.length - 1], last)) > r * 0.8) marks.push(last);
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1], b = marks[i], m = add(V.mix(a, b, 0.5), mul(dir, r * 0.9));
    ink(g, [a, m, b], w, color, { end: 0.25 });
  }
}

// ---------------------------------------------------------------- tail: a fan of feathers from base toward dir
function tailGeom(t) {
  const { base, dir, len = 60, n = 5, spread = 0.9, w = 26, seed = 7 } = t;
  const d0 = nrm(dir), r = rng(seed), out = [];
  const nb = perp(d0);
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const d = V.rot(d0, f * spread);
    const root = add(base, mul(nb, f * w * 0.8));
    out.push({ root, tip: add(root, mul(d, len * (1 - 0.18 * Math.abs(f) * 2) * (0.95 + 0.1 * r()))), w, point: 0.35, kind: 1 });
  }
  // back to front: outer feathers first, the middle one on top
  out.sort((a, b) => Math.abs(V.len(sub(b.root, base))) - Math.abs(V.len(sub(a.root, base))));
  return out;
}

// ---------------------------------------------------------------- headphone cup (this shot's grey ringed cup)
function drawCupS(g, c) {
  const { x, y, r = 45, rot = 0, open = 0.85, side = 1 } = c;
  g.save(); g.translate(x, y); g.rotate(rot);
  const s = side, rx = r * open, ry = r;
  // the cushion ring, showing as a ribbed crescent on the head side of the plate
  const rimX = -s * r * 0.1, RX = rx * 0.98 + r * 0.08, RY = ry;
  g.fillStyle = gv(0.62); g.beginPath(); g.ellipse(rimX, 0, RX, RY, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(rimX, 0, RX, RY, 0, 0, TAU); g.clip();
  g.lineCap = "butt";
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * TAU;
    g.strokeStyle = i % 2 ? gv(0.85, 0.9) : gv(0.35, 0.85); g.lineWidth = wmin(r * 0.05);
    g.beginPath(); g.moveTo(rimX + Math.cos(a) * RX * 0.72, Math.sin(a) * RY * 0.72); g.lineTo(rimX + Math.cos(a) * RX * 1.02, Math.sin(a) * RY * 1.03); g.stroke();
  }
  g.restore();
  g.strokeStyle = gv(0.12); g.lineWidth = wmin(r * 0.07); g.beginPath(); g.ellipse(rimX, 0, RX, RY, 0, 0, TAU); g.stroke();
  // face plate: pale brushed metal with concentric rings, pushed away from the head
  const fx = s * r * 0.14, PX = rx * 0.8, PY = ry * 0.86;
  g.fillStyle = gv(0.9); g.beginPath(); g.ellipse(fx, 0, PX, PY, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(fx, 0, PX, PY, 0, 0, TAU); g.clip();
  g.filter = `blur(${Math.max(0.4, r * 0.12 * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(0.98, 0.9); g.beginPath(); g.ellipse(fx - s * PX * 0.25, -PY * 0.3, PX * 0.4, PY * 0.4, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.62, 0.55); g.beginPath(); g.ellipse(fx + s * PX * 0.5, PY * 0.45, PX * 0.45, PY * 0.5, 0, 0, TAU); g.fill();
  g.filter = "none";
  g.restore();
  g.strokeStyle = gv(0.2, 0.9); g.lineWidth = wmin(r * 0.06); g.beginPath(); g.ellipse(fx, 0, PX, PY, 0, 0, TAU); g.stroke();
  for (const k of [0.62, 0.38]) { g.strokeStyle = gv(0.45, 0.6); g.lineWidth = wmin(r * 0.035); g.beginPath(); g.ellipse(fx + s * PX * (1 - k) * 0.2, PY * (1 - k) * 0.08, PX * k, PY * k, 0, 0, TAU); g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- feet: chunky pale toes with a thin dark keyline
// f: { x, y (ankle), rot (0 = toes point down), size (toe length), toes, spread (fan, radians), curl (+ bends the
//      toes clockwise), leg: [dx, dy] (where the leg leaves the belly, relative to the ankle), claw }
function drawFootS(g, f) {
  const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.3, fat = 0.22, seed = 3, palm = 0.2 } = f;
  const r = rng(seed);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  const tw = size * fat, ol = wmin(size * 0.045);
  const stroke = (q, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]); g.stroke(); };
  if (f.leg) {
    // a short leg from the belly to the foot (frame-aligned offset, undone from the foot's rotation)
    const L = V.rot(f.leg, -rot), q = [L, V.mix(L, [0, 0], 0.5), [0, 0]];
    stroke(q, tw * 1.25 + ol * 2, gv(0.18)); stroke(q, tw * 1.25, gv(0.92));
  }
  const toeP = [];
  for (let i = 0; i < toes; i++) {
    const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5;
    let d = V.rot([0, 1], f0 * spread * 2);
    const L = size * (1 - Math.abs(f0) * 0.25) * (0.92 + 0.16 * r());
    const pts = [mul(perp(d), -f0 * tw * 0.8)];
    // three joints, each bending further (the talons curl)
    for (let k = 0; k < 3; k++) { pts.push(add(pts[pts.length - 1], mul(d, L / 3))); d = V.rot(d, curl * (0.35 + 0.25 * k)); }
    toeP.push({ q: sampleCurve(pts, 4), f0, d });
  }
  const order = toeP.map((t, i) => i).sort((a, b) => Math.abs(toeP[b].f0) - Math.abs(toeP[a].f0));
  for (const i of order) {
    const { q, d } = toeP[i];
    const e = q[q.length - 1], tip = add(e, mul(d, size * claw));
    stroke([e, tip], tw * 0.7 + ol * 2, gv(0.12));
    stroke([e, V.mix(e, tip, 0.6)], tw * 0.6, gv(0.55));
    stroke(q, tw + ol * 2, gv(0.15));
    stroke(q, tw, gv(0.92 - 0.04 * r()));
    for (const k of [0.36, 0.68]) {
      const j = Math.floor((q.length - 1) * k), p = q[j], tt = nrm(sub(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), n = perp(tt);
      ink(g, [add(p, mul(n, -tw * 0.45)), add(p, mul(tt, tw * 0.15)), add(p, mul(n, tw * 0.45))], size * 0.02, gv(0.35, 0.7), { end: 0.3 });
    }
  }
  const pr = size * palm;
  g.fillStyle = gv(0.92); g.beginPath(); g.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- headphone band: a flat grey strip, dark keyline
function drawBandS(g, pts, w) {
  if (pts.length < 2) return;
  const q = sampleCurve(pts, 6);
  const nrmAt = (i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; return perp(nrm(sub(b, a))); };
  const line = (off, lw, c) => { const p = q.map((pp, i) => add(pp, mul(nrmAt(i), off))); g.strokeStyle = c; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (const pp of p) g.lineTo(pp[0], pp[1]); g.stroke(); };
  line(0, w + wmin(w * 0.35), gv(0.12));
  line(0, w, gv(0.78));
  line(w * 0.22, w * 0.3, gv(0.35, 0.8));
  line(-w * 0.2, w * 0.25, gv(0.96, 0.85));
}

// ---------------------------------------------------------------- plaster: one small taped strip (top of the head)
function drawPlaster(g, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1);
  g.fillStyle = gv(0.78); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h * 0.45); g.fill();
  g.strokeStyle = gv(0.25, 0.9); g.lineWidth = wmin(1.3); g.stroke();
  g.fillStyle = gv(0.62); g.beginPath(); g.roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.68, h * 0.2); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- the owl
// pose: { x, y, s, rot, flip, res, light, head, body, tail, wings[], feet[], eyes, beak, headphones, plaster,
//         order: [...layer names], blur: [dx, dy] (motion smear in frame px), tone }
// layers: "farHP", "wing:<i>", "tail", "foot:<i>", "body", "head", "nearHP" (head includes face features)
const ORDER = ["farHP", "wing:0", "tail", "body", "foot:0", "wing:1", "head", "nearHP", "foot:1"];
export function owlS17Layer(P, canvas) {
  const s = P.s ?? 1, res = P.res ?? 1, rot = P.rot ?? 0, fl = P.flip ? -1 : 1;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const toF = ([ux, uy]) => [P.x + s * (ca * fl * ux - sa * uy), P.y + s * (sa * fl * ux + ca * uy)];
  const Lf = P.light || [-0.55, -0.83];
  const Lu = nrm([fl * (ca * Lf[0] + sa * Lf[1]), -sa * Lf[0] + ca * Lf[1]]);
  const dl = P.detail ?? clamp((s * res) / 1.0, 0.2, 1);

  const H = headGeom(P.head);
  const body = P.body ? bodyOutline(P.body) : null;
  const wings = (P.wings || []).map((w) => wingGeom(w));
  const tail = P.tail ? tailGeom(P.tail) : [];
  const E = P.eyes || {};
  const eyes = [-1, 1].map((sd) => {
    const q = H.P(sd * (E.spread ?? 0.4) + (E.az ?? 0), E.el ?? -0.1);
    const nz = Math.max(0.05, q.nz);
    return { x: q.x, y: q.y, nz, side: sd, r: (E.r ?? 27) * (1 - 0.55 * (1 - nz)), sx: 0.2 + 0.8 * nz };
  });
  const B = P.beak || {};
  const bq = H.P(B.az ?? 0, B.el ?? -0.45, B.lift ?? 1.05);
  const HP = P.headphones || {};
  const hp = HP.on ? headphoneGeom(H, HP) : null;

  // bounding box
  const all = [...H.out];
  if (body) all.push(...body);
  wings.forEach((G) => { all.push(...G.lead); G.feathers.forEach((f) => all.push(f.tip)); });
  tail.forEach((f) => all.push(f.tip, f.root));
  (P.feet || []).forEach((f) => { const z = (f.size || 15) * 2.4; all.push([f.x - z, f.y - z], [f.x + z, f.y + z]); });
  if (hp) { hp.band.forEach((b) => all.push(b.p)); hp.cups.forEach((c) => { const r = (HP.r ?? 45) * 1.2; all.push([c.x - r, c.y - r], [c.x + r, c.y + r]); }); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of all) { const f = toF(p); x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0]); y1 = Math.max(y1, f[1]); }
  const bl = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
  const m = 12 * s + 6 + bl;
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
  const cv = canvas || document.createElement("canvas");
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  g.setTransform(res * s * fl * ca, res * s * fl * sa, -res * s * sa, res * s * ca, res * (P.x - x0), res * (P.y - y0));
  PPU = s * res; setPPU(PPU);
  const plu = { light: Lu };
  const hatchCol = gv(0.3, 0.45);

  const layers = {
    farHP() {
      if (!hp) return;
      for (const sg of hp.segs) if (!sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
      for (const c of hp.cups) if (c.z < -0.02) drawCupS(g, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H.roll, open: c.open, side: c.side });
    },
    tail() {
      tail.slice().reverse().forEach((f) => {
        const sh = leaf(f);
        plumage(g, blobPath(sh), { base: 0.95, shade: 0.76, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
        ink(g, sh.slice(1, 6), 1.2, gv(0.12, 0.95), { end: 0.2 });
      });
    },
    body() {
      if (!body) return;
      const bp = blobPath(body), b = P.body;
      plumage(g, bp, { base: 0.97, shade: 0.8, depth: b.a * 0.3, blur: b.a * 0.1, ...plu });
      softShade(g, bp, (c) => { const q = add([b.x || 0, b.y || 0], V.rot([b.a * 0.1, b.b * 0.95], b.rot)); c.ellipse(q[0], q[1], b.a * 0.9, b.b * 0.35, b.rot, 0, TAU); }, 0.66, 0.35, b.b * 0.2);
      if (dl > 0.25) {
        rimHatch(g, body, { light: Lu, flow: [0, 1], len: b.a * 0.08, step: 3.6, w: 0.9, color: hatchCol, seed: 12, density: 0.8, bend: 0.6 });
        const r = rng(19);
        // pencil tone over the lower body: short grey strokes along the feather flow
        g.save(); g.beginPath(); bp(g); g.clip();
        for (let i = 0; i < 90; i++) {
          const a = r() * TAU, d = Math.sqrt(r());
          const q = add([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
          const lower = (q[1] - (b.y || 0)) / b.b;
          if (lower < -0.2 && r() < 0.7) continue;
          flick(g, q, nrm([0.25 * (r() - 0.5), 1]), b.a * 0.1 * (0.6 + 0.8 * r()), 0.8, gv(0.5, 0.22 + 0.15 * Math.max(0, lower)), 0.15);
        }
        g.restore();
        // chest feathers: small v-marks scattered over the lower body
        for (let i = 0; i < 26; i++) {
          const a = r() * TAU, d = Math.sqrt(r()) * 0.75;
          const c = add([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
          const L = b.a * 0.05 * (0.7 + 0.6 * r());
          ink(g, [add(c, [-L, -L * 0.5]), c, add(c, [L, -L * 0.5])], 0.8, gv(0.5, 0.35), { end: 0.2 });
        }
      }
      ink(g, [...body, body[0]], 1.2, gv(0.3, 0.55), { end: 0.6, per: 3 });
    },
    head() {
      const hpth = blobPath(H.out);
      if (P.tuft) {
        // a little spray of feathers poking out at the back of the head (behind the cup)
        const tf = P.tuft, r = rng(tf.seed ?? 44), root = [H.x + tf.dx, H.y + tf.dy];
        for (let k = 0; k < (tf.n ?? 3); k++) {
          const f = (tf.n ?? 3) === 1 ? 0 : k / ((tf.n ?? 3) - 1) - 0.5;
          const d = [Math.cos(tf.ang + f * (tf.spread ?? 0.6)), Math.sin(tf.ang + f * (tf.spread ?? 0.6))];
          const L = tf.len * (1 - 0.35 * Math.abs(f)) * (0.9 + 0.2 * r()), w = tf.len * (tf.w ?? 0.34);
          const b0 = add(root, mul(perp(d), -w / 2)), b1 = add(root, mul(perp(d), w / 2)), tip = add(root, mul(d, L));
          const sh = [b0, add(V.mix(b0, tip, 0.55), mul(perp(d), -w * 0.12)), tip, add(V.mix(b1, tip, 0.55), mul(perp(d), w * 0.1)), b1];
          plumage(g, blobPath(sh), { base: 0.97, shade: 0.88, depth: 3, blur: 2, ...plu });
          ink(g, sh.slice(0, 4), 1.0, gv(0.3, 0.8), { end: 0.2 });
        }
      }
      plumage(g, hpth, { base: 0.97, shade: 0.82, depth: H.ry * 0.36, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
      if (hp) {
        const nc = hp.cups.find((c) => c.z >= 0);
        if (nc) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.7, nc.y + 4, (HP.r ?? 45) * 0.5, (HP.r ?? 45) * 1.2, H.roll, 0, TAU), 0.66, 0.45, 12);
      }
      if (dl > 0.25) rimHatch(g, H.out, { light: Lu, flow: [0, 1], len: H.ry * 0.14, step: 3, w: 0.9, color: hatchCol, seed: 22, density: 0.7, thr: 0.15 });
      ink(g, [...H.out, H.out[0]], 1.2, gv(0.3, 0.5), { end: 0.6, per: 3 });
      // facial disc: a thin heart-shaped line from the brow V round each eye to the chin
      if ((P.disc ?? 1)) {
        const top = H.P(E.az ?? 0, (E.el ?? -0.1) + 0.5, 1.0);
        for (const e of eyes) {
          if (e.nz < 0.25) continue;
          const sd = e.side, R = e.r;
          const q = [[top.x, top.y],
            add([e.x, e.y], V.rot([sd * R * 0.35 * e.sx, -R * 1.75], H.roll)),
            add([e.x, e.y], V.rot([sd * R * 1.65 * e.sx, -R * 0.95], H.roll)),
            add([e.x, e.y], V.rot([sd * R * 1.95 * e.sx, R * 0.55], H.roll)),
            add([e.x, e.y], V.rot([sd * R * 1.2 * e.sx, R * 1.85], H.roll))];
          ink(g, q, 1.1, gv(0.42, 0.7), { end: 0.15, bias: 0.4 });
        }
      }
      for (const e of eyes) {
        if (e.nz < 0.12) continue;
        drawEye(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, side: e.side, state: E.state || "wide", look: E.look, ...(E.over || {}), ...(e.side < 0 ? E.left : E.right) });
        if (!(E.state === "closed")) {
          const lk = (e.side < 0 ? E.left?.look : E.right?.look) || E.look || [0, 0], pr = (E.over?.pupil ?? 0.26);
          const px = e.x + lk[0] * (1 - pr) * 0.95 * e.r * e.sx, py = e.y + lk[1] * (1 - pr) * 0.95 * e.r;
          g.fillStyle = gv(0.97, 0.95); g.beginPath(); g.arc(px - e.r * pr * 0.3, py - e.r * pr * 0.35, Math.max(e.r * pr * 0.28, 0.5 / PPU), 0, TAU); g.fill();
        }
      }
      drawBeak(g, { x: bq.x, y: bq.y, w: B.w ?? 26, l: B.l ?? 30, rot: H.roll + (B.rot ?? 0), turn: B.turn ?? H.yaw * 1.5, open: B.open ?? 0, smirk: 0 });
      if (P.plaster) { const pl = P.plaster, q = H.P(pl.az ?? 0, pl.el ?? 0.9, 1.0); if (q.nz > 0.0) drawPlaster(g, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H.yaw - (pl.az ?? 0))) }); }
      if (P.freckles !== false) {
        for (const e of eyes) { if (e.nz < 0.5) continue; const c = add([e.x, e.y], V.rot([-e.side * e.r * 0.9 * e.sx, e.r * 1.35], H.roll)); g.fillStyle = gv(0.4, 0.6); for (const [dx, dy] of [[0, 0], [-3.5, 2.5]]) { g.beginPath(); g.arc(c[0] + dx * e.side, c[1] + dy, Math.max(1.1, 0.6 / PPU), 0, TAU); g.fill(); } }
      }
    },
    nearHP() {
      if (!hp) return;
      for (const sg of hp.segs) if (sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
      for (const c of hp.cups) if (c.z >= -0.02) drawCupS(g, { x: c.x, y: c.y, r: HP.r ?? 45, rot: H.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side });
    },
  };
  wings.forEach((G, i) => { layers["wing:" + i] = () => paintWing(g, G, plu, dl); });
  (P.feet || []).forEach((f, i) => { layers["foot:" + i] = () => drawFootS(g, f); });
  const order = P.order || ORDER;
  for (const name of order) if (layers[name]) layers[name]();
  PPU = 1; setPPU(1);
  if (P.tone === true && dl > 0.3) { g.setTransform(1, 0, 0, 1, 0, 0); screentone(cv, { pitch: 4.2 * res }); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF, H, eyes, bq, cups: hp ? hp.cups : [] };
}

let SCR = null, SCR2 = null;
// Draw into ctx (frame coordinates). blur: [dx, dy] frame px — a motion smear: shifted copies averaged additively
// in an offscreen canvas (weights sum to 1, so the bird stays opaque), then drawn over.
export function drawOwlS17(ctx, P) {
  if (!SCR) SCR = document.createElement("canvas");
  const L = owlS17Layer(P, SCR);
  const bl = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
  if (bl > 1) {
    if (!SCR2) SCR2 = document.createElement("canvas");
    const pad = Math.ceil(bl / 2) + 2, w = L.canvas.width + 2 * pad, h = L.canvas.height + 2 * pad;
    if (SCR2.width !== w || SCR2.height !== h) { SCR2.width = w; SCR2.height = h; }
    const g = SCR2.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    const n = 7, wts = [];
    for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; wts.push(Math.exp(-f * f * 6)); }
    const ws = wts.reduce((a, b) => a + b, 0);
    const sx = L.canvas.width / L.w;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5;
      g.globalAlpha = wts[i] / ws;
      g.drawImage(L.canvas, pad + P.blur[0] * f * sx, pad + P.blur[1] * f * sx);
    }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    ctx.drawImage(SCR2, L.x - pad / sx, L.y - pad / sx, w / sx, h / sx);
  } else {
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  }
  return L;
}
