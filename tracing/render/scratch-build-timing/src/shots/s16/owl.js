// s16 owl: a round, bright owl (the source's bird in this shot is a ball with a round head sunk into it).
// The owl kit draws head, body, eyes, beak, headphones, bandage and feet; the wings are drawn here from measured
// feather tips (the kit's paddle wings do not match these big fanned cartoon wings).
// Units: owl units (head radius ~100); root = middle of the body; x, y, s, rot place the bird in frame px.
import { owlLayer, owlPose, mergePose, plumage, softShade, ink, flick, featherShape, featherRow, drawFoot, drawBeak, headphoneGeom, bodyOutline, setPPU, gv, LINE, V } from "../../lib/owlInk.js";
import { rng } from "../../lib/rng.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";

const TAU = Math.PI * 2;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);

// ---------------------------------------------------------------- wings
// A cartoon wing from its measured outline: lead = leading edge from the shoulder to the wing tip; trail = the
// feather tips' notches from the wing tip back to where the wing meets the body. Round feather ends bulge out
// between the notches; separation lines run in from each notch; a scalloped covert row sits under the lead.
// w: { lead, trail, bulge (0..0.5), cov (covert depth as a fraction toward the trail), inner: [x,y] (a point inside
//      the body, for the fill to close against) }
export function drawWing(g, w, light = [-0.5, -0.86]) {
  const lead = w.lead, trail = w.trail;
  const cen = V.mul(lead.concat(trail).reduce((a, p) => V.add(a, p), [0, 0]), 1 / (lead.length + trail.length));
  // outline with bulging feather ends
  const out = [...lead];
  const bulge = w.bulge ?? 0.28;
  const pts = [lead[lead.length - 1], ...trail];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], m = V.mix(a, b, 0.5), d = V.len(V.sub(b, a));
    let n = V.perp(V.nrm(V.sub(b, a)));
    if ((m[0] - cen[0]) * n[0] + (m[1] - cen[1]) * n[1] < 0) n = V.mul(n, -1);
    out.push(V.add(V.mix(a, b, 0.2), V.mul(n, d * bulge * 0.7)), V.add(m, V.mul(n, d * bulge)), V.add(V.mix(a, b, 0.8), V.mul(n, d * bulge * 0.7)), b);
  }
  if (w.inner) out.push(w.inner);
  const path = (c) => { c.moveTo(out[0][0], out[0][1]); for (const p of out) c.lineTo(p[0], p[1]); c.closePath(); };
  const depth = V.len(V.sub(lead[Math.floor(lead.length / 2)], trail[Math.floor(trail.length / 2)]));
  plumage(g, path, { base: 0.97, shade: 0.8, depth: depth * 0.25, blur: depth * 0.12, light });
  // separation lines: from each inner notch toward the leading edge, stopping short of the coverts
  const cov = w.cov ?? 0.42;
  for (let i = 0; i < trail.length - 1; i++) {
    const nt = trail[i];
    const f = (i + 1) / (trail.length + 0.5);
    const li = lead[Math.max(0, Math.min(lead.length - 1, Math.round((lead.length - 1) * (1 - f * 0.9))))];
    const end = V.mix(nt, li, 1 - cov);
    const mid = V.add(V.mix(nt, end, 0.5), V.mul(V.perp(V.nrm(V.sub(end, nt))), 3));
    ink(g, [nt, mid, end], 1.4, gv(0.3, 0.65), { end: 0.15, bias: 0.3 });
  }
  // covert row: a scalloped line under the leading edge
  const row = lead.slice(0, Math.max(2, lead.length - 1)).map((p, i) => {
    const f = i / Math.max(1, lead.length - 2);
    const q = trail[Math.max(0, Math.min(trail.length - 1, Math.round((trail.length - 1) * (1 - f))))];
    return V.mix(p, q, cov * (0.9 - 0.3 * f));
  });
  if (row.length > 1) featherRow(g, row, { step: 8, len: depth * 0.12, w: 1.1, color: gv(0.4, 0.55), ang: 2.6, seed: 7, gap: 0.2 });
  // ink: heavier along the lead, grey round the feather ends
  ink(g, lead, 2.2, gv(0.12, 0.85), { end: 0.25 });
  ink(g, out.slice(lead.length - 1, out.length - (w.inner ? 1 : 0)), 1.5, gv(0.22, 0.75), { end: 0.2, per: 3 });
}

// A fanned wing of narrow pointed feathers (the source's layered wing): the measured trailing edge (tips, outermost
// first) is resampled into n feather tips; each feather runs from a root on the arm (shoulder S -> wrist W) to its tip,
// bowed a little (w.bend) so the fan is not a set of parallel petals; innermost first, so the outer primaries lie on
// top. Two scalloped covert rows cover the roots.
// w: { S, W, tips, n (feathers, default 11), fw (feather width / length, default 0.16), cov (covert reach), bend }
export function drawFanWing(g, w, light = [-0.5, -0.86]) {
  const n = w.n ?? 11, fwk = w.fw ?? 0.16, cov = w.cov ?? 0.42, bend = w.bend ?? 0.05;
  const T = resample(sampleCurve(w.tips, 10), n);
  const F = T.map((tip, i) => {
    const f = n === 1 ? 0 : i / (n - 1);
    const root = V.mix(w.W, w.S, Math.min(0.94, Math.pow(f, 1.15) * 0.94));
    const d = V.sub(tip, root), L = V.len(d);
    return { root, tip, dir: V.nrm(d), L, f };
  });
  const Lmax = Math.max(...F.map((f) => f.L));
  for (let i = n - 1; i >= 0; i--) {
    const f = F[i], wd = Math.max(8, Math.min(f.L * fwk, Lmax * fwk * 0.8)) * (i === 0 ? 0.9 : 1);
    const q = quill(f.root, f.tip, wd, bend * (1 - 0.4 * f.f));
    const path = (c) => { c.moveTo(q.out[0][0], q.out[0][1]); for (const p of q.out) c.lineTo(p[0], p[1]); c.closePath(); };
    plumage(g, path, { base: 0.975, shade: 0.83, depth: wd * 0.45, blur: wd * 0.3, light });
    // soft grey keyline round the free end, a faint shaft
    ink(g, q.trail.slice(Math.floor(q.trail.length * 0.3)), 1.3, gv(0.25, 0.75), { end: 0.2, bias: 0.8 });
    ink(g, q.lead.slice(Math.floor(q.lead.length * 0.55)), 1.0, gv(0.35, 0.55), { end: 0.2, bias: 0.8 });
    ink(g, q.spine.slice(Math.floor(q.spine.length * 0.15), Math.floor(q.spine.length * 0.8)), 0.8, gv(0.5, 0.35), { end: 0.2 });
  }
  // covert rows: rounded feathers overlapping the roots, the outer row reaching `cov` along the feathers
  for (const [reach, sc, val] of [[cov, 1, 0.975], [cov * 0.5, 0.7, 0.98]]) {
    const edge = F.map((f) => V.add(f.root, V.mul(f.dir, f.L * reach * (0.75 + 0.25 * (1 - f.f)))));
    const scal = [];
    for (let i = 0; i < edge.length - 1; i++) {
      const a = edge[i], b = edge[i + 1], m = V.mix(a, b, 0.5), dir = V.nrm(V.mix(F[i].dir, F[i + 1].dir, 0.5));
      const bulge = V.len(V.sub(b, a)) * 0.45 * sc;
      scal.push(a, V.add(V.mix(a, b, 0.25), V.mul(dir, bulge * 0.7)), V.add(m, V.mul(dir, bulge)), V.add(V.mix(a, b, 0.75), V.mul(dir, bulge * 0.7)));
    }
    scal.push(edge[edge.length - 1]);
    const patch = [w.S, V.mix(w.S, w.W, 0.5), w.W, ...scal];
    const path = (c) => { c.moveTo(patch[0][0], patch[0][1]); for (const p of patch) c.lineTo(p[0], p[1]); c.closePath(); };
    plumage(g, path, { base: val, shade: 0.86, depth: 14, blur: 9, light });
    ink(g, scal, 1.1, gv(0.35, 0.6), { end: 0.15, per: 3 });
  }
  // leading edge: a soft keyline, heavier only near the wrist
  ink(g, [w.S, V.mix(w.S, w.W, 0.5), w.W, V.mix(w.W, F[0].tip, 0.5), F[0].tip], 1.8, gv(0.18, 0.8), { end: 0.2, bias: 0.35 });
}
// arc-length resampling of a polyline into n points (ends included)
function resample(q, n) {
  const d = [0];
  for (let i = 1; i < q.length; i++) d.push(d[i - 1] + V.len(V.sub(q[i], q[i - 1])));
  const out = [], L = d[d.length - 1];
  for (let k = 0; k < n; k++) {
    const t = (n === 1 ? 0 : k / (n - 1)) * L;
    let j = 1; while (j < d.length - 1 && d[j] < t) j++;
    const u = (t - d[j - 1]) / Math.max(1e-6, d[j] - d[j - 1]);
    out.push(V.mix(q[j - 1], q[j], Math.max(0, Math.min(1, u))));
  }
  return out;
}
// one pointed feather from root to tip, width wd, bowed by `bend` (fraction of its length)
function quill(root, tip, wd, bend) {
  const d = V.sub(tip, root), L = V.len(d), u = V.mul(d, 1 / L), nn = V.perp(u);
  const C = (t) => V.add(V.add(root, V.mul(d, t)), V.mul(nn, bend * L * 4 * t * (1 - t)));
  const prof = (t) => (t < 0.68 ? 0.6 + 0.4 * Math.sin((Math.PI / 2) * (t / 0.68)) : Math.pow(Math.cos((Math.PI / 2) * ((t - 0.68) / 0.32)), 0.75));
  const lead = [], trail = [], spine = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, c = C(t), c2 = C(Math.min(1, t + 0.02)), c1 = C(Math.max(0, t - 0.02));
    const tn = V.perp(V.nrm(V.sub(c2, c1))), h = wd * prof(t);
    lead.push(V.add(c, V.mul(tn, -h * 0.4))); trail.push(V.add(c, V.mul(tn, h * 0.6))); spine.push(c);
  }
  const out = [...lead, ...trail.slice().reverse()];
  return { out, lead, trail, spine };
}

// ---------------------------------------------------------------- whole owl
const ROUND = owlPose("front", {
  tufts: [],
  head: { x: 0, y: -170, rx: 106, ry: 89, yaw: 0, pitch: 0, roll: 0, square: 2.2, jowl: 0.08 },
  body: { x: 0, y: 0, a: 104, b: 122, rot: Math.PI / 2, egg: 0 },
  tail: null,
  wings: [],
  feet: [],
  eyes: { state: "wide", r: 27, spread: 0.45, el: -0.12, look: [0, 0], pupil: 0.64 },
  beak: { el: -0.5, lift: 1.2, w: 22, l: 26 },
  bandage: { az: 0.35, el: 0.85, size: 50, rot: 0.2, sy: 0.6 },
  headphones: { on: true, yaw: 0.4, lift: 1.12, r: 44, tilt: 0.1, bandR: 1.1, bandH: 1.06, cupEl: 0.05, w: 18, open: 0.45 },
  flow: [0, 1],
  disc: 1,
});
export const P = (over) => mergePose(ROUND, over);

let SCR = null;
// The whole owl is drawn into a frame-size offscreen canvas and blitted (always, so cached and fresh frames are the
// same pixels); held drawings reuse it.
const OC = { key: null, canvas: null };
// K: { pose, x, y, s, rot, back: [wings], front: [wings], feet, glint, phones, mouth, id }
export function drawOwlS16(ctx, K) {
  const key = `${K.id}:${K.x},${K.y},${K.s},${K.rot}`;
  if (OC.key !== key) {
    if (!OC.canvas) { OC.canvas = document.createElement("canvas"); OC.canvas.width = 2206; OC.canvas.height = 946; }
    const g = OC.canvas.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
    drawOwlInto(g, K);
    OC.key = key;
  }
  ctx.drawImage(OC.canvas, 0, 0);
}
function drawOwlInto(ctx, K) {
  const { x, y, s, rot = 0 } = K;
  const pose = { ...K.pose, headphones: { ...(K.pose.headphones || {}), on: false } };
  const HP = K.pose.headphones || {};
  const light = pose.light || [-0.5, -0.86];
  const put = (fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); setPPU(s); fn(ctx); ctx.restore(); };
  const wingFn = (w) => (w.tips ? drawFanWing : drawWing);
  if (!SCR) SCR = document.createElement("canvas");
  // the kit's screentone pass runs after its extra hook, so the headphones are drawn round the layer instead: the
  // far band and cup behind it (only a dark sliver of the far cushion shows past the head), the near ones on top
  let GEO = null;
  const L = owlLayer({ ...pose, x, y, s, rot, canvas: SCR, extra: (g, geo) => { GEO = geo; if (K.glint) glints(g, geo, pose); if (K.mouth) mouth(g, geo, pose); } });
  const hp = GEO && HP.on ? headphoneGeom(GEO.H, HP) : null;
  const geo = GEO ? { ...GEO, hp } : null;
  for (const w of K.back || []) put((g) => wingFn(w)(g, w, light));
  if (geo && hp) put((g) => farPhones(g, geo, K.pose));
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  if (geo && hp) put((g) => phones(g, geo, K.pose, K.phones || "dark"));
  put((g) => bodyTexture(g, pose, light));
  // the feet hang in front of the belly (their legs come out of its plumage), the front wing over everything
  for (const f of K.feet || []) put((g) => drawToes(g, footSpec(f)));
  for (const w of K.front || []) put((g) => wingFn(w)(g, w, light));
}
// feet written in the older measured format ({mode: 'dangle'|'perch', rot = where the toes pointed}) keep their
// placement: a dangling foot hangs its back toe along rot and curls the front toes forward; a perching foot points
// its front toes along rot and hooks the back toe the other way
function footSpec(f) {
  if (!f.mode) return f;
  const size = f.size * 0.82;
  if (f.mode === "dangle") return { x: f.x, y: f.y, rot: f.rot, toes: 2.75, size, spread: 0.36, curl: -0.6, back: 1.1, w: 10.5 };
  return { x: f.x, y: f.y, rot: f.rot + Math.PI, toes: Math.PI, size, spread: 0.34, curl: 0.5, back: 0.8, w: 10.5 };
}
// the far side of the headphones: the band behind the crown and a dark cushion edge
function farPhones(g, geo, pose) {
  const HP = pose.headphones || {}, w = (HP.w || 16) * 0.8, R = HP.r || 44;
  for (const sg of geo.hp.segs) if (!sg.front && sg.pts.length > 1) ink(g, sg.pts, w, "#141414", { end: 0.9, pow: 0.3 });
  for (const c of geo.hp.cups) {
    if (c.z >= -0.02) continue;
    g.save(); g.translate(c.x, c.y); g.rotate(geo.H.roll);
    g.fillStyle = "#0e0e0e"; g.beginPath(); g.ellipse(c.side * R * 0.1, 0, R * 0.2, R * 0.92, 0, 0, TAU); g.fill();
    g.strokeStyle = gv(0.6, 0.6); g.lineWidth = 1.2; g.beginPath(); g.ellipse(c.side * R * 0.1, 0, R * 0.2, R * 0.92, 0, -1.2, 1.2); g.stroke();
    g.restore();
  }
}
// the startled open beak: a small dark 'o' under the beak's tip with the pale lower mandible round it
function mouth(g, geo, pose) {
  const B = pose.beak || {}, bw = B.w || 22, bl = B.l || 26, H = geo.H;
  g.save(); g.translate(geo.beak.x, geo.beak.y); g.rotate(H.roll);
  const cy = bl * 0.98;
  g.fillStyle = gv(0.86); g.beginPath(); g.ellipse(bw * 0.02, cy + bl * 0.1, bw * 0.4, bl * 0.42, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = "#121212"; g.beginPath(); g.ellipse(bw * 0.02, cy + bl * 0.04, bw * 0.26, bl * 0.28, 0, 0, TAU); g.fill();
  g.restore();
  drawBeak(g, { x: geo.beak.x, y: geo.beak.y, w: bw, l: bl, rot: H.roll + (B.rot ?? 0), turn: H.yaw * 2, open: 0, smirk: 0 });
}
// This shot's headphones differ from the kit's: in flight a dark band and dark grey metal cups; sitting dazed a
// pale band with a slider block and a pale cup whose face has a wood grain and a centre ring. Drawn over the kit's.
function phones(g, geo, pose, style) {
  if (!geo.hp) return;
  const HP = pose.headphones || {}, w = HP.w || 16, R = HP.r || 44, roll = geo.H.roll;
  for (const sg of geo.hp.segs) {
    if (sg.pts.length < 2 || !sg.front) continue;
    if (style === "wood") {
      ink(g, sg.pts, w * 1.25, LINE, { end: 0.9, pow: 0.3 });
      ink(g, sg.pts, w * 0.95, gv(0.9), { end: 0.9, pow: 0.3 });
      ink(g, sg.pts.map(([x, y]) => [x + 2, y + 3]), w * 0.12, gv(0.35, 0.7), { end: 0.5 });
    } else {
      ink(g, sg.pts, w * 1.1, "#121212", { end: 0.85, pow: 0.3 });
      ink(g, sg.pts.map(([x, y]) => [x, y - w * 0.2]), w * 0.18, gv(0.5, 0.6), { end: 0.4 });
    }
  }
  const near = geo.hp.cups.filter((c) => c.z >= -0.02);
  for (const c of near) {
    g.save(); g.translate(c.x, c.y); g.rotate(roll);
    const sd = c.side, rx = R * 0.62 * (0.55 + 0.6 * (c.open ?? 0.6)), ry = R * 1.02;
    // cushion on the head side: dark ring with pale ribs
    const cx = -sd * rx * 0.55;
    g.fillStyle = "#101010"; g.beginPath(); g.ellipse(cx, 0, rx * 0.72, ry * 0.98, 0, 0, TAU); g.fill();
    g.strokeStyle = gv(style === "wood" ? 0.75 : 0.45, 0.8); g.lineWidth = Math.max(0.8, R * 0.035);
    for (let k = -8; k <= 8; k++) { const yy = (k / 9) * ry * 0.92, hw = Math.sqrt(1 - (yy / ry) ** 2) * rx * 0.6; g.beginPath(); g.moveTo(cx - sd * hw, yy); g.lineTo(cx - sd * hw * 0.25, yy + 1); g.stroke(); }
    // shell
    if (style === "wood") {
      g.fillStyle = gv(0.88); g.beginPath(); g.ellipse(sd * rx * 0.1, 0, rx, ry, 0, 0, TAU); g.fill();
      g.lineWidth = Math.max(1, R * 0.06); g.strokeStyle = LINE; g.stroke();
      g.fillStyle = gv(0.8); g.beginPath(); g.ellipse(sd * rx * 0.18, ry * 0.02, rx * 0.74, ry * 0.8, 0, 0, TAU); g.fill();
      g.lineWidth = Math.max(0.8, R * 0.035); g.stroke();
      g.save(); g.beginPath(); g.ellipse(sd * rx * 0.18, ry * 0.02, rx * 0.74, ry * 0.8, 0, 0, TAU); g.clip();
      g.strokeStyle = gv(0.45, 0.6); g.lineWidth = Math.max(0.6, R * 0.02);
      for (let k = -5; k <= 5; k++) { const x = sd * rx * 0.18 + k * rx * 0.13; g.beginPath(); g.moveTo(x, -ry); g.bezierCurveTo(x + rx * 0.1, -ry * 0.3, x - rx * 0.08, ry * 0.3, x + rx * 0.04, ry); g.stroke(); }
      g.restore();
      g.strokeStyle = LINE; g.lineWidth = Math.max(0.9, R * 0.045); g.beginPath(); g.ellipse(sd * rx * 0.05, ry * 0.12, rx * 0.3, ry * 0.3, 0, 0, TAU); g.stroke();
    } else {
      const gr = g.createLinearGradient(-rx, 0, rx, 0);
      gr.addColorStop(0, gv(0.5)); gr.addColorStop(0.35, gv(0.62)); gr.addColorStop(0.6, gv(0.38)); gr.addColorStop(1, gv(0.25));
      g.fillStyle = gr; g.beginPath(); g.ellipse(sd * rx * 0.1, 0, rx, ry, 0, 0, TAU); g.fill();
      g.lineWidth = Math.max(1, R * 0.06); g.strokeStyle = "#0c0c0c"; g.stroke();
      g.strokeStyle = gv(0.8, 0.7); g.lineWidth = Math.max(0.8, R * 0.04); g.beginPath(); g.ellipse(sd * rx * 0.1, 0, rx * 0.72, ry * 0.8, 0, 2.0, 4.2); g.stroke();
      g.fillStyle = gv(0.3); g.beginPath(); g.ellipse(sd * rx * 0.25, ry * 0.05, rx * 0.45, ry * 0.55, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
}
// Taloned owl feet (the source's three-toed feet): three front toes and a back toe (hallux) from the ankle, each
// a pale segmented toe with a dark keyline, knuckle creases and a dark hooked claw.
// f: { x, y (ankle), rot (direction of the back toe; 0 = down), toes (direction of the front toes relative to the
//      back toe; default pi = opposite), size (front toe length, units), spread, curl (+ bends the toes clockwise),
//      back (back toe length / size), leg: [dx, dy] (from the ankle to where the leg enters the feathers), legW }
function drawToes(g, f) {
  const { x, y, rot = 0, toes = Math.PI * 1.08, size = 30, spread = 0.36, curl = 0.45, back = 1.05, leg = null, legW = 13 } = f;
  const W = f.w ?? Math.max(9, size * 0.34);
  g.save(); g.translate(x, y);
  g.lineJoin = "round"; g.lineCap = "round";
  if (leg) {
    // the feathered leg: a pale tube with a soft keyline and a few feather flicks at its top
    const A = [0, 0], B = leg, u = V.nrm(V.sub(A, B)), nn = V.perp(u);
    ink(g, [B, V.mix(B, A, 0.5), A], legW, gv(0.93), { end: 0.85, pow: 0.3 });
    for (const sd of [-1, 1]) ink(g, [V.add(V.mix(B, A, 0.35), V.mul(nn, sd * legW * 0.48)), V.add(V.mix(B, A, 0.7), V.mul(nn, sd * legW * 0.5)), V.add(A, V.mul(nn, sd * legW * 0.45))], 1.4, LINE, { end: 0.1, bias: 0.8 });
    for (let k = 0; k < 4; k++) { const p = V.mix(B, A, 0.15 + 0.15 * k); ink(g, [V.add(p, V.mul(V.perp(V.nrm(V.sub(A, B))), -legW * 0.4)), V.add(p, V.mul(V.nrm(V.sub(A, B)), 4)), V.add(p, V.mul(V.perp(V.nrm(V.sub(A, B))), legW * 0.35))], 0.9, gv(0.4, 0.5), { end: 0.2 }); }
  }
  const dirOf = (a) => [-Math.sin(a), Math.cos(a)];
  const toe = (a, L, w, cu, clawK) => {
    const d = dirOf(a), n = [d[1], -d[0]];
    const C = (t) => [d[0] * L * t + n[0] * cu * L * t * t * 0.5, d[1] * L * t + n[1] * cu * L * t * t * 0.5];
    const Tn = (t) => { const p = C(Math.max(0, t - 0.01)), q = C(t + 0.01); const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const hw = (t) => w * 0.5 * (1 - 0.32 * t) * (1 + 0.1 * Math.cos(Math.PI * 2 * (t * 3 - 0.5)));
    const side = (t, sg) => { const c = C(t), tt = Tn(t); return [c[0] - tt[1] * hw(t) * sg, c[1] + tt[0] * hw(t) * sg]; };
    const outl = [];
    for (let i = 0; i <= 14; i++) outl.push(side(i / 14, 1));
    const e = C(1), te = Tn(1), rr = hw(1);
    for (let i = 1; i < 6; i++) { const an = (i / 6) * Math.PI, ca = Math.cos(an), sa = Math.sin(an); outl.push([e[0] + (-te[1] * ca + te[0] * sa) * rr, e[1] + (te[0] * ca + te[1] * sa) * rr]); }
    for (let i = 14; i >= 0; i--) outl.push(side(i / 14, -1));
    const path = (c) => { c.moveTo(outl[0][0], outl[0][1]); for (const p of outl) c.lineTo(p[0], p[1]); c.closePath(); };
    // claw first (it tucks under the toe tip): a dark hook continuing the toe's curl
    const tip = [e[0] + te[0] * rr * 0.6, e[1] + te[1] * rr * 0.6], cl = L * 0.36 * clawK;
    const nn = [te[1], -te[0]], hk = cu >= 0 ? 1 : -1;
    const claw = [[tip[0] - nn[0] * rr * 0.55, tip[1] - nn[1] * rr * 0.55], [tip[0] + te[0] * cl * 0.55 + nn[0] * hk * cl * 0.18, tip[1] + te[1] * cl * 0.55 + nn[1] * hk * cl * 0.18], [tip[0] + te[0] * cl * 0.8 + nn[0] * hk * cl * 0.6, tip[1] + te[1] * cl * 0.8 + nn[1] * hk * cl * 0.6]];
    ink(g, claw, rr * 1.15, "#0c0c0c", { end: 0.05, bias: 0.15, pow: 0.8 });
    g.fillStyle = gv(0.92); g.beginPath(); path(g); g.fill();
    // shade along the underside
    g.save(); g.beginPath(); path(g); g.clip();
    ink(g, [0, 0.25, 0.5, 0.75, 1].map((t) => side(t, -0.8)), w * 0.35, gv(0.62, 0.55), { end: 0.6 });
    g.restore();
    g.strokeStyle = LINE; g.lineWidth = 1.5; g.beginPath(); path(g); g.stroke();
    for (const tk of [0.36, 0.68]) { const a0 = side(tk, 0.9), a1 = side(tk + 0.03, -0.9), c = C(tk + 0.035); ink(g, [a0, c, a1], 1.0, gv(0.25, 0.8), { end: 0.3 }); }
  };
  // back toe (behind), then the three front toes, outer ones first
  if (back > 0) toe(rot, size * back, W * 1.08, -curl * 0.35, 0.8);
  const base = rot + toes;
  for (const k of [-1, 1, 0]) toe(base + k * spread, size * (k === 0 ? 1.1 : 0.94), W, curl, 1);
  // the ankle, where the toes meet: a pale pad over the roots
  g.fillStyle = gv(0.93); g.beginPath(); g.ellipse(0, 0, W * 0.75, W * 0.7, rot, 0, TAU); g.fill();
  g.restore();
}
// the source's plumage: dense short grey feather strokes over the belly, a soft shade low on the shadow side
function bodyTexture(g, pose, light) {
  const b = pose.body, H = pose.head, out = bodyOutline(b);
  const path = (c) => smoothPath(c, out, true);
  g.save(); g.beginPath(); path(g); g.clip();
  softShade(g, () => {}, (c) => c.ellipse((b.x || 0) - light[0] * b.b * 0.7, (b.y || 0) - light[1] * b.a * 0.7, b.b * 0.9, b.a * 0.55, 0, 0, TAU), 0.6, 0.35, 30);
  const r = rng(77);
  const rx = H.rx * 1.02, ry = H.ry * 1.02;
  for (let i = 0; i < 260; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    const x = (b.x || 0) + Math.cos(a) * b.b * d, y = (b.y || 0) + Math.sin(a) * b.a * d;
    if (((x - H.x) / rx) ** 2 + ((y - H.y) / ry) ** 2 < 1) continue;
    const ang = Math.PI / 2 + (x - (b.x || 0)) / b.b * 0.5 + (r() - 0.5) * 0.5;
    const dark = Math.max(0, -(Math.cos(a) * light[0] + Math.sin(a) * light[1])) * d;
    flick(g, [x, y], [Math.cos(ang), Math.sin(ang)], 9 + r() * 12, 1.0, gv(0.45, 0.18 + 0.35 * dark), (r() - 0.5) * 0.4);
  }
  g.restore();
}
// highlights in the big round eyes (the source's owl has two white catch-lights)
function glints(g, geo, pose) {
  const E = pose.eyes || {};
  for (const e of geo.eyes) {
    if (e.nz < 0.2) continue;
    const pr = E.pupil ?? 0.6, look = E.look || [0, 0];
    const px = e.x + look[0] * (1 - pr) * 0.95 * e.r * e.sx, py = e.y + look[1] * (1 - pr) * 0.95 * e.r;
    g.fillStyle = "#f6f4ef";
    g.beginPath(); g.arc(px - e.r * pr * 0.35 * e.sx, py - e.r * pr * 0.35, e.r * pr * 0.26, 0, TAU); g.fill();
    g.beginPath(); g.arc(px + e.r * pr * 0.3 * e.sx, py + e.r * pr * 0.32, e.r * pr * 0.12, 0, TAU); g.fill();
  }
}

// ---------------------------------------------------------------- poses (measured)
// Generated from frame measurements (snapshots/s16-study/keys.py): head, eyes, wing tips and feet were read off the
// source frames and converted to owl units for each drawing's placement.
const IMPACT = { pose: P(mergePose({ body: { a: 96, b: 96 },  head: { x: 8, y: -136, rx: 95, ry: 82, roll: 0.002 } }, { headphones: { yaw: 0.08, open: 0.3, lift: 1.0, r: 36, bandR: 1.0, bandH: 1.02 }, eyes: { state: "closed", r: 24 }, beak: { open: 0, el: -0.3 } })), back: [{ S: [-67, -55], W: [-130, -96], tips: [[-182, -176], [-203, -131], [-197, -89], [-178, -46], [-147, -20]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }, { S: [65, -60], W: [125, -92], tips: [[204, -140], [242, -108], [238, -64], [212, -34], [170, -16]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [], feet: [{ x: -42, y: 64, rot: 2.68, size: 32, mode: "dangle", leg: 10, seed: 2 }, { x: 75, y: 80, rot: -0.54, size: 30, mode: "dangle", leg: 10, seed: 5 }], glint: false, mouth: true };
const RECOIL1 = { pose: P(mergePose({ body: { a: 96, b: 96 },  head: { x: 10, y: -137, roll: 0.000 } }, { headphones: { yaw: 0.08, open: 0.3, lift: 1.04, r: 40 }, eyes: { state: "closed" }, beak: { open: 0.3 } })), back: [{ S: [-82, -65], W: [-167, -113], tips: [[-287, -167], [-283, -124], [-258, -66], [-215, -23], [-164, -1]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }, { S: [90, -73], W: [178, -123], tips: [[276, -167], [290, -124], [268, -66], [218, -30], [158, -13]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [], feet: [{ x: -35, y: 77, rot: 0.00, size: 32, mode: "dangle", leg: 10, seed: 2 }, { x: 83, y: 87, rot: -0.20, size: 30, mode: "dangle", leg: 10, seed: 5 }], glint: false };
const RECOIL2 = { pose: P(mergePose({ body: { a: 96, b: 96 },  head: { x: 12, y: -147, roll: -0.003 } }, { headphones: { yaw: 0.08, open: 0.3, lift: 1.04, r: 40 }, eyes: { state: "closed" }, beak: { open: 0.15 } })), back: [{ S: [-89, -70], W: [-195, -159], tips: [[-306, -208], [-300, -163], [-287, -113], [-267, -66], [-237, -31], [-187, -11]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }, { S: [90, -69], W: [180, -141], tips: [[281, -196], [296, -154], [288, -112], [257, -82], [212, -63]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [], feet: [{ x: -31, y: 68, rot: 0.15, size: 32, mode: "dangle", leg: 10, seed: 2 }, { x: 85, y: 61, rot: -0.88, size: 30, mode: "dangle", leg: 10, seed: 5 }], glint: false };
const SQUINT = { pose: P(mergePose({ body: { a: 96, b: 96 },  head: { x: 2, y: -141, roll: 0.004 } }, { headphones: { yaw: 0.08, open: 0.3, lift: 1.04, r: 40 }, eyes: { state: "half", look: [0, 0.2] } })), back: [{ S: [-92, -59], W: [-199, -136], tips: [[-324, -161], [-317, -113], [-297, -59], [-263, -15], [-211, 11]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }, { S: [89, -52], W: [175, -130], tips: [[269, -224], [294, -182], [296, -135], [273, -94], [235, -68]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [], feet: [{ x: -21, y: 75, rot: 0.05, size: 32, mode: "dangle", leg: 10, seed: 2 }, { x: 89, y: 72, rot: -0.88, size: 30, mode: "dangle", leg: 10, seed: 5 }], glint: false };
const OPEN = { pose: P(mergePose({ body: { a: 100, b: 104 },  head: { x: 6, y: -153, roll: -0.003 } }, { eyes: { state: "wide", look: [0.1, -0.1] } })), back: [{ S: [95, -44], W: [185, -117], tips: [[310, -204], [350, -178], [352, -131], [326, -81], [281, -45]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-95, -48], W: [-194, -136], tips: [[-338, -169], [-342, -117], [-322, -67], [-284, -25], [-230, 4]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: -32, y: 73, rot: 0.18, size: 32, mode: "dangle", leg: 10, seed: 2 }, { x: 90, y: 75, rot: -0.97, size: 30, mode: "dangle", leg: 10, seed: 5 }], glint: true };
const FLY = { pose: P(mergePose({ head: { x: 7, y: -176, roll: -0.081 } }, { eyes: { state: "wide", look: [0.1, -0.1] } })), back: [{ S: [96, -88], W: [119, -141], tips: [[199, -323], [240, -282], [252, -213], [240, -140], [191, -76], [146, -46]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-73, -91], W: [-184, -162], tips: [[-332, -267], [-350, -206], [-342, -138], [-304, -75], [-267, -28], [-203, -1], [-128, -7]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: -32, y: 89, rot: 0.35, size: 38, mode: "dangle", leg: 10, seed: 2 }, { x: 109, y: 77, rot: -0.76, size: 36, mode: "dangle", leg: 10, seed: 5 }], glint: true, mouth: true };
const LAND1 = { pose: P(mergePose({ head: { x: 21, y: -169, roll: -0.135 } }, { eyes: { state: "wide", look: [0.1, -0.1] } })), back: [{ S: [74, -68], W: [121, -154], tips: [[195, -314], [224, -266], [226, -206], [203, -152], [164, -114]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-76, -79], W: [-191, -134], tips: [[-308, -243], [-335, -186], [-342, -128], [-329, -75], [-286, -35], [-229, -2]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: 21, y: 87, rot: 0.28, size: 34, mode: "perch", leg: 10, seed: 2 }, { x: 144, y: 61, rot: -2.66, size: 32, mode: "perch", leg: 10, seed: 5 }], glint: true, mouth: true };
const LAND2 = { pose: P(mergePose({ head: { x: -6, y: -141, roll: -0.137 } }, { eyes: { state: "wide", look: [0.05, -0.1] } })), back: [{ S: [67, -61], W: [95, -139], tips: [[149, -295], [180, -263], [189, -208], [174, -153], [140, -108]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-93, -55], W: [-210, -102], tips: [[-332, -182], [-350, -133], [-347, -80], [-315, -30], [-255, 4], [-186, 30]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: 57, y: 87, rot: 0.22, size: 34, mode: "perch", leg: 10, seed: 2 }, { x: 157, y: 44, rot: -2.54, size: 32, mode: "perch", leg: 10, seed: 5 }], glint: true, mouth: true };
const LAND3 = { pose: P(mergePose({ head: { x: -4, y: -147, roll: -0.117 } }, { eyes: { state: "wide", look: [0.05, -0.1] } })), back: [{ S: [77, -51], W: [124, -120], tips: [[225, -226], [236, -185], [234, -138], [207, -91], [173, -56]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-93, -47], W: [-213, -79], tips: [[-354, -118], [-357, -69], [-336, -22], [-292, 17], [-230, 44], [-159, 60]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: 58, y: 89, rot: 0.22, size: 34, mode: "perch", leg: 10, seed: 2 }, { x: 158, y: 51, rot: -2.54, size: 32, mode: "perch", leg: 10, seed: 5 }], glint: true, mouth: true };
const LAND4 = { pose: P(mergePose({ head: { x: 6, y: -147, roll: -0.165 } }, { eyes: { state: "wide", look: [0.05, -0.1] } })), back: [{ S: [88, -52], W: [153, -99], tips: [[266, -188], [260, -136], [240, -88], [205, -54], [169, -37]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], front: [{ S: [-95, -45], W: [-217, -66], tips: [[-354, -102], [-347, -57], [-316, -12], [-261, 24], [-193, 47], [-132, 57]], fw: 0.21, cov: 0.42, bend: 0.06, n: 8 }], feet: [{ x: 57, y: 85, rot: 0.25, size: 34, mode: "perch", leg: 10, seed: 2 }, { x: 156, y: 48, rot: -2.51, size: 32, mode: "perch", leg: 10, seed: 5 }], glint: true, mouth: true };

// 46.52 on: sitting dazed by the mug, head turned to the right, looking up
const DAZED = {
  pose: P({
    head: { x: -58, y: -128, rx: 104, ry: 90, yaw: 0.66, roll: -0.3, pitch: 0.05 },
    headphones: { yaw: 1.0, dx: -0.22, open: 0.9, lift: 1.14, r: 42, bandH: 1.02, bandR: 1.04, w: 12 },
    body: { a: 100, b: 124, rot: Math.PI / 2 },
    eyes: { state: "wide", pupil: 0.2, over: { pupil: 0.22, lidW: 0.07 }, look: [0.45, -0.65], r: 27 },
    bandage: { az: 0.1, el: 0.9 },
    feet: [],
    tufts: [{ at: -1.35, size: 34, width: 0.3, lean: -0.3, second: 0.5, curl: 0.2 }],
  }),
  back: [
    { S: [28, -156], W: [66, -183], tips: [[159, -65], [132, -66], [109, -72], [85, -88], [62, -105]], fw: 0.17, cov: 0.4, n: 8, bend: 0.05 },
  ],
  front: [
    // measured on frame 1175: the tip at (241, 906), the trailing edge back to the body at (437, 846)
    { S: [-130, -47], W: [-191, 22], tips: [[-276, 94], [-244, 82], [-209, 66], [-177, 61], [-151, 65], [-126, 61], [-106, 49], [-90, 37]], fw: 0.18, cov: 0.38, n: 9, bend: -0.03 },
  ],
  // measured on frame 1175: the left foot dangles (back toe down to (628, 910), front toes curled up); the right one
  // hooks over the desk lip by the mug (front toes up round the mug's far handle, back toe down the desk's front)
  feet: [{ x: 81, y: 62, rot: -0.25, toes: 3.4, size: 30, spread: 0.36, curl: -0.6, back: 1.2, leg: [0, -26], legW: 15 }, { x: 142, y: 33, rot: -0.33, toes: -2.41, size: 32, spread: 0.32, curl: -0.55, back: 0.95, leg: [-34, -12], legW: 15 }],
  glint: false,
  phones: "wood",
};

// 46.48: the first dazed drawing, leaning back a little further, the right wing still up
const DAZED0 = { ...DAZED, back: [{ S: [28, -160], W: [70, -196], tips: [[168, -84], [142, -80], [116, -84], [90, -98], [64, -112]], fw: 0.17, cov: 0.4, n: 8, bend: 0.05 }] };

// Timeline: one drawing per source frame (the source animates on ones through the hit and the fall).
// [t, drawing, x, y, s, rot]
const E = (t, mx, my, rot) => { const a = rot + 0.3, ox = 36, oy = 145; return [t, FLY, mx + ox * Math.cos(a) - oy * Math.sin(a), my + ox * Math.sin(a) + oy * Math.cos(a), 0.9, rot]; };
export const KEYS = [
  [45.72, IMPACT, 1220, 392, 1.0, 0.08],
  [45.76, RECOIL1, 1152, 405, 1.0, 0.0],
  [45.80, RECOIL2, 1098, 442, 0.95, -0.05],
  [45.88, SQUINT, 1030, 432, 0.95, -0.05],
  [45.92, OPEN, 1000, 428, 0.93, -0.18],
  // the same flying drawing carried left and down (eye midpoints measured per frame)
  E(45.96, 910, 304, -0.24), E(46.00, 873, 322, -0.22), E(46.04, 835, 325, -0.15), E(46.08, 798, 341, -0.33),
  E(46.12, 765, 358, -0.3), E(46.16, 732, 375, -0.28), E(46.20, 704, 393, -0.33), E(46.24, 651, 463, -0.36), E(46.28, 598, 536, -0.35),
  [46.32, LAND1, 570, 772, 0.95, -0.28],
  [46.36, LAND2, 540, 792, 0.97, -0.22],
  [46.40, LAND3, 538, 790, 0.97, -0.22],
  [46.44, LAND4, 540, 800, 0.97, -0.25],
  [46.48, DAZED0, 531, 808, 1.05, -0.03],
  [46.52, DAZED, 531, 804, 1.05, 0],
  [46.60, DAZED, 531, 807, 1.05, 0],
];
// F = source frame index (see frameOf in s16.js)
export function owlAt(F) {
  let k = KEYS[0];
  for (const q of KEYS) if (F >= Math.round(q[0] * 25)) k = q;
  const [, D, x, y, s, rot] = k;
  return { ...D, x, y, s, rot, id: KEYS.indexOf(k) };
}
