// s24 drawing kit, fix pass 1: engraved parts that replace the first pass's simpler ones (glossy cups, thin brows,
// 'O' beaks, knuckled toes, plank tails, zigzag covert lines). All procedural, all seeded; landmarks are frame px
// read off zoomed grids of the source (see the owl specs). Shared by owlF / owlH / owlJ / whirl / page.
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { gv } from "../../../lib/owlInk.js";
import { INK, curve, polyPath, smoothFn, featherPoly } from "./art.js";

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]), nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; }, perp = (a) => [-a[1], a[0]];
const lerp = (a, b, t) => a + (b - a) * t;

// a stroke whose width follows a profile: ws = widths at evenly spaced stations along the (smoothed) line
export function stroke(g, pts, ws, { color = INK, per = 8, smooth = true } = {}) {
  if (pts.length < 2) return;
  const q = smooth && pts.length > 2 ? sampleCurve(pts, per) : pts;
  const n = ws.length - 1;
  taper(g, q, (u) => { const x = Math.min(n, Math.max(0, u * n)), i = Math.min(n - 1, Math.floor(x)); return Math.max(0.35, lerp(ws[i], ws[i + 1], x - i)); }, color);
}

// ---------------------------------------------------------------- headphone cup, engraved (3/4 view)
// The source's cup: a dark padded cushion at the back (on the head side) with pale pleat ticks, a cylinder side
// ringed by two or three inked concentric rims, and a mid-grey face plate engraved with fine curved strokes that
// thicken toward the shadow side. o = { c: face centre, rx, ry, rot (rad), d: [dx, dy] face → back, cs: cushion
// scale, faceV, sideV, cushV, rings: [t...] (depth fractions of the inked rims), light, seed, pleats, hatch }
export function cup3(g, o) {
  const { c, rx, ry, rot = 0, d = [-20, 0], cs = 1.12, faceV = 0.44, sideV = 0.34, cushV = 0.1, rings = [0.18, 0.4], light = [-0.6, -0.8],
    seed = 3, pleats = 34, hatch = 1, ink = 2.8, pleatV = 0.4, back = 1.0, faceHatchV = 0.2, shell = 0.55 } = o;
  const r = rng(seed);
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const ell = (cx, cy, sx, sy) => { g.beginPath(); g.ellipse(cx, cy, Math.max(0.5, sx), Math.max(0.5, sy), rot, 0, TAU); };
  const at = (t) => [c[0] + d[0] * t, c[1] + d[1] * t];
  const rim = (t, k, a) => { const P = at(t), ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k; return [P[0] + ex * cr - ey * sr, P[1] + ex * sr + ey * cr]; };
  // cushion: the padded ring at the back, swept from the back rim to the shell, dark
  const N = 16;
  { const P = at(back); ell(P[0], P[1], rx * cs + ink, ry * cs + ink); g.fillStyle = INK; g.fill(); }
  for (let i = 0; i <= N; i++) {
    const t = back - (back - shell) * i / N, k = cs - (cs - 1.04) * Math.pow(i / N, 2), P = at(t);
    ell(P[0], P[1], rx * k, ry * k); g.fillStyle = gv(cushV); g.fill();
  }
  // its ribs run along the axis (only the part outside the shell stays visible)
  for (let i = 0; i < pleats; i++) {
    const a = (i + 0.4 * r()) / pleats * TAU, w = 1.4 + r() * 1.6;
    const p0 = rim(back - 0.05, cs * 0.99, a), p1 = rim((back + shell) / 2, (cs + 1.04) / 2, a + 0.02), p2 = rim(shell + 0.04, 1.05, a + 0.03);
    taper(g, [p0, p1, p2], (u) => Math.max(0.4, w * Math.sin(Math.PI * (0.15 + 0.7 * u))), gv(pleatV + 0.14 * r(), 0.8));
  }
  // the shell's side: swept to the face, inked rims at `rings`
  const M = 12;
  for (let i = 0; i <= M; i++) {
    const t = shell * (1 - i / M), P = at(t);
    ell(P[0], P[1], rx, ry); g.fillStyle = gv(sideV + 0.06 * (i / M)); g.fill();
    if (i === 0) { g.strokeStyle = INK; g.lineWidth = ink; g.stroke(); }
    for (const rt of rings) if (Math.abs(t - rt) <= shell / M / 2) { g.strokeStyle = INK; g.lineWidth = ink * 0.75; g.stroke(); }
  }
  // the face plate
  ell(c[0], c[1], rx, ry); g.fillStyle = gv(faceV); g.fill();
  g.save(); ell(c[0], c[1], rx, ry); g.clip();
  const sh = nrm([-light[0], -light[1]]);
  const gr = g.createLinearGradient(c[0] - sh[0] * rx, c[1] - sh[1] * ry, c[0] + sh[0] * rx, c[1] + sh[1] * ry);
  gr.addColorStop(0, gv(faceV + 0.05)); gr.addColorStop(0.5, gv(faceV)); gr.addColorStop(1, gv(faceV - 0.14));
  g.fillStyle = gr; g.fillRect(c[0] - rx - ry, c[1] - rx - ry, 2 * (rx + ry), 2 * (rx + ry));
  // engraved strokes: concentric arcs about 4 px apart on the shadow half, tapered
  if (hatch) {
    const Rm = Math.max(rx, ry), step = 4 / Rm;
    const a0 = Math.atan2(sh[1] * rx, sh[0] * ry);
    for (let f = 0.3; f < 0.97; f += step) {
      const span = (0.45 + 0.8 * f) * (0.7 + 0.3 * r()) * hatch, mid = a0 - rot + (r() - 0.5) * 0.4;
      const pts = [];
      for (let j = 0; j <= 16; j++) {
        const a = mid - span + 2 * span * j / 16, ex = Math.cos(a) * rx * f, ey = Math.sin(a) * ry * f;
        pts.push([c[0] + ex * cr - ey * sr, c[1] + ex * sr + ey * cr]);
      }
      const w = 0.6 + 0.9 * f * r();
      taper(g, pts, (u) => Math.max(0.3, w * Math.pow(Math.sin(Math.PI * u), 0.7)), gv(faceHatchV, 0.7));
    }
  }
  g.restore();
  // face rim: ink, a pale lip on the lit side, a dark bevel on the shadow side
  ell(c[0], c[1], rx, ry); g.strokeStyle = INK; g.lineWidth = ink; g.stroke();
  g.save();
  const la = Math.atan2(-sh[1] * rx, -sh[0] * ry) - rot;
  g.strokeStyle = gv(faceV + 0.22, 0.7); g.lineWidth = 1.4; g.beginPath(); g.ellipse(c[0], c[1], Math.max(1, rx - 3.5), Math.max(1, ry - 3.5), rot, la - 0.9, la + 0.9); g.stroke();
  g.strokeStyle = gv(0.12, 0.55); g.lineWidth = 1.1; g.beginPath(); g.ellipse(c[0], c[1], rx * 0.86, ry * 0.88, rot, la + 1.6, la + 4.2); g.stroke();
  g.restore();
}

// the yoke block between the band and the cup: a grey quad with ink and a pale edge
export function yoke(g, pts, { v = 0.4, ink = 2.4 } = {}) {
  g.beginPath(); polyPath(pts)(g); g.fillStyle = gv(v); g.fill();
  g.strokeStyle = INK; g.lineWidth = ink; g.lineJoin = "round"; g.stroke();
  g.strokeStyle = gv(v + 0.25, 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0] + 2, pts[0][1] + 2); g.lineTo(pts[1][0] + 2, pts[1][1] + 2); g.stroke();
}

// ---------------------------------------------------------------- face
// a heavy scowling brow: a filled wedge, `w0` px at the root (the beak end), tapering to ~1 px at the tip
export function brow(g, pts, w0, { mid = 0.9, tip = 1, color = INK } = {}) {
  stroke(g, pts, [w0 * 0.7, w0, w0 * mid, w0 * 0.55, tip], { color });
}
// the source's angry eye: a heavy upper lid (tapered), a thin lower lid, the pupil tucked up under the lid with a
// catchlight, white between. e = { up, lo, pupil, pr, cat, lidW, loW, lidWs (width profile), loWs }
export function eye2(g, e) {
  const { up, lo, pupil, pr, cat = null, lidW = 5, loW = 2, lidWs = null, loWs = null, sclera = 0.97 } = e;
  const lid = [...curve(up, false, 8), ...curve([...lo].reverse(), false, 8)];
  g.fillStyle = gv(sclera); g.beginPath(); polyPath(lid)(g); g.fill();
  g.save(); g.beginPath(); polyPath(lid)(g); g.clip();
  g.fillStyle = INK; g.beginPath(); g.ellipse(pupil[0], pupil[1], pr[0], pr[1], pr[2] || 0, 0, TAU); g.fill();
  if (cat) { g.fillStyle = gv(0.97); g.beginPath(); g.ellipse(cat[0], cat[1], cat[2], cat[3] ?? cat[2], 0, 0, TAU); g.fill(); }
  g.restore();
  stroke(g, up, lidWs || [lidW * 0.5, lidW, lidW * 0.9, lidW * 0.45]);
  stroke(g, lo, loWs || [loW * 0.3, loW, loW, loW * 0.3]);
}
// hooked beak: the upper mandible (a pale shield ending in a hook), the dark gape and the lower mandible behind it.
// b = { upper: outline, gape: dark polygon, lower: outline (drawn first, grey), shade: [x,y,rx,ry,rot], nostril: [x,y,r],
//       ink, v }
export function hookBeak(g, b) {
  const { upper, gape = null, lower = null, tongue = null, shade = null, nostril = null, ink = 3, v = 0.93, lowerV = 0.72, crease = null, ridge = null, ridgeWs = null, lines = null } = b;
  if (lower) { g.beginPath(); smoothFn(lower)(g); g.fillStyle = gv(lowerV); g.fill(); g.strokeStyle = INK; g.lineWidth = ink * 0.8; g.stroke(); }
  if (gape) { g.beginPath(); smoothFn(gape)(g); g.fillStyle = INK; g.fill(); }
  if (tongue) { g.beginPath(); smoothFn(tongue)(g); g.fillStyle = gv(b.tongueV ?? 0.5); g.fill(); }
  g.beginPath(); smoothFn(upper)(g); g.fillStyle = gv(v); g.fill();
  if (shade) {
    // fix pass 2: the shadow side is hatched (fine 1 px strokes ≈ 3 px apart along the ellipse's long axis, clipped
    // to the beak and to the ellipse) — no smooth grey fill
    const [sx, sy, rx, ry, rot = 0] = shade, c = Math.cos(rot), sn = Math.sin(rot), rr = rng(Math.round(sx * 7 + sy * 13));
    g.save(); g.beginPath(); smoothFn(upper)(g); g.clip();
    g.beginPath(); g.ellipse(sx, sy, rx * 1.15, ry * 1.1, rot, 0, TAU); g.clip();
    for (let o = -rx; o <= rx; o += 3) {
      const k = Math.sqrt(Math.max(0, 1 - (o / rx) ** 2)) * ry, j = (rr() - 0.5) * 2;
      const p0 = [sx + c * o - sn * (-k + j), sy + sn * o + c * (-k + j)], p1 = [sx + c * o - sn * (k * 0.9), sy + sn * o + c * (k * 0.9)];
      stroke(g, [p0, [(p0[0] + p1[0]) / 2 + (rr() - 0.5), (p0[1] + p1[1]) / 2], p1], [0.3, 0.9 + 0.4 * rr(), 0.3], { color: gv(0.35, 0.8) });
    }
    g.restore();
  }
  if (lines) { g.save(); g.beginPath(); smoothFn(upper)(g); g.clip(); for (const l of lines) stroke(g, l, [0.3, 1, 0.3], { color: gv(0.4, 0.8) }); g.restore(); }
  // outline: heavier on the shadow (right / lower) side
  const q = curve(upper, true, 8), n = q.length;
  taper(g, q, (u) => ink * (0.6 + 0.55 * Math.max(0, Math.sin(TAU * (u - 0.1)))), INK);
  if (ridge) stroke(g, ridge, ridgeWs || [0.8, ink * 1.1, ink * 1.3, ink * 0.8]);
  if (crease) stroke(g, crease, [0.5, 1.6, 1.2, 0.4], { color: gv(0.25, 0.85) });
  if (nostril) { g.fillStyle = INK; g.beginPath(); g.ellipse(nostril[0], nostril[1], nostril[2], nostril[3] ?? nostril[2] * 0.6, nostril[4] || 0, 0, TAU); g.fill(); }
}
// an ear tuft: a pointed white mass (outline pts, tip first) with an ink contour on the outer edge and two fine grey
// inner lines toward the tip
export function tuft(g, pts, { ink = 2.6, v = 0.95, inner = 2, out = null, seed = 4 } = {}) {
  const r = rng(seed);
  g.beginPath(); smoothFn(pts)(g); g.fillStyle = gv(v); g.fill();
  const q = curve(pts, true, 8), n = q.length;
  const run = out ? q.slice(Math.round(out[0] * n), Math.round(out[1] * n) + 1) : q;
  taper(g, run, (u) => Math.max(0.5, ink * Math.pow(Math.sin(Math.PI * u), 0.35)), INK);
  const tip = pts[0], base = mul(add(pts[1], pts[pts.length - 1]), 0.5);
  for (let i = 0; i < inner; i++) {
    const f = 0.3 + 0.35 * i + 0.1 * r(), b0 = add(mul(pts[1], 1 - f), mul(pts[pts.length - 1], f));
    const m = add(mul(b0, 0.45), mul(tip, 0.55));
    stroke(g, [b0, m, add(mul(b0, 0.12), mul(tip, 0.88))], [0.4, 1.3, 0.3], { color: gv(0.45, 0.7) });
  }
  return base;
}

// ---------------------------------------------------------------- feathers
// a covert row: each covert a rounded feather end pointing along `dir` (tips measured), filled white so the next one
// overlaps the last, inked round its tip and down its outer side; `depth` = visible length, `w` = width
export function coverts(g, tips, o2 = {}) {
  const { dir = [0, -1], w = 40, depth = 50, ink = 2.8, v = 0.95, lean = 0, seed = 5, hatch = 3, hatchV = 0.5, round = 1, rev = false, ws = null, dirs = null, fill = true } = o2;
  const r = rng(seed);
  const order = [...tips.keys()]; if (rev) order.reverse();
  for (const i of order) {
    const T = tips[i], dd = nrm(dirs ? dirs[i] : dir), nn = perp(dd), W = (ws ? ws[i] : w) * (0.92 + 0.16 * r()), D = depth * (0.9 + 0.2 * r());
    const hw = W / 2;
    // outline: root-left → up the side → round the tip → down the other side → root-right
    const pts = [];
    const M = 18;
    for (let j = 0; j <= M; j++) {
      const a = Math.PI * j / M;                    // 0 = left side, π = right side
      const sx = -Math.cos(a), sy = Math.sin(a);    // unit half-disc
      const tipK = Math.pow(sy, round);
      pts.push(add(add(T, mul(nn, sx * hw + lean * hw * sy)), mul(dd, -(1 - tipK) * hw * 0.9)));
    }
    const root0 = add(sub(T, mul(dd, D)), mul(nn, -hw * 1.02)), root1 = add(sub(T, mul(dd, D)), mul(nn, hw * 1.02));
    const poly = [root0, ...pts, root1];
    if (fill) { g.fillStyle = gv(v); g.beginPath(); polyPath(poly)(g); g.fill(); }
    // fine barbs from the root toward the tip
    if (hatch) {
      g.save(); g.beginPath(); polyPath(poly)(g); g.clip();
      for (let h = 0; h < hatch; h++) {
        const o = (r() - 0.5) * 1.2 * hw, a0 = sub(T, mul(dd, D * (0.9 - 0.2 * r()))), l = D * (0.4 + 0.4 * r());
        stroke(g, [add(a0, mul(nn, o)), add(add(a0, mul(dd, l * 0.5)), mul(nn, o * 0.92)), add(add(a0, mul(dd, l)), mul(nn, o * 0.8))], [0.3, 1.0, 0.3], { color: gv(hatchV, 0.65) });
      }
      g.restore();
    }
    // ink: from partway down one side, round the tip, down the other side (tapered ends)
    const run = [add(sub(T, mul(dd, D * (o2.inkA ?? 0.85))), mul(nn, -hw * 1.01)), ...pts, add(sub(T, mul(dd, D * (o2.inkB ?? 0.3))), mul(nn, hw * 1.01))];
    taper(g, sampleCurve(run, 3), (u) => Math.max(0.4, ink * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.45)), INK);
  }
}
// a long flight / tail feather with an ink outline all round, a shaft line and fine parallel barbs (the source's
// tail and primaries). f = { r, t, w, bend }; o = { ink, lines, lineV, shaft, v, side }
export function quill(g, f, o = {}) {
  const { ink = 2.4, lines = 5, lineV = 0.45, shaft = true, v = 0.95, seed = 1, tipPow = 0.5, widest = 0.4, rootK = 0.75, lineLen = [0.35, 0.85], open = false, inkSide = null } = o;
  const F = featherPoly(f.r, f.t, f.w, { bend: f.bend || 0, rootK, widest, tipPow, n: 28 });
  const path = polyPath(F.poly), r = rng(seed * 97 + 11);
  g.fillStyle = gv(v); g.beginPath(); path(g); g.fill();
  g.save(); g.beginPath(); path(g); g.clip();
  for (let i = 0; i < lines; i++) {
    const off = (i + 0.5) / lines * 1.7 - 0.85, u0 = 0.02 + 0.12 * r(), u1 = lineLen[0] + (lineLen[1] - lineLen[0]) * r();
    const pts = [];
    for (let j = 0; j <= 8; j++) { const u = u0 + (u1 - u0) * j / 8, m = F.M(u), a = F.M(Math.max(0, u - 0.02)), b = F.M(Math.min(1, u + 0.02)), tn = perp(nrm(sub(b, a))); pts.push(add(m, mul(tn, off * F.hw(u)))); }
    taper(g, pts, (u) => Math.max(0.35, (0.7 + 0.6 * r()) * Math.pow(Math.sin(Math.PI * u), 0.6)), gv(lineV, 0.8));
  }
  if (shaft) { const pts = []; for (let j = 0; j <= 10; j++) pts.push(F.M(0.02 + 0.8 * j / 10)); taper(g, pts, (u) => 1.1 * (1 - u) + 0.3, gv(0.55, 0.7)); }
  g.restore();
  // outline (closed or only the chosen side + tip)
  const Lp = F.left, Rp = F.right, n = Lp.length - 1;
  const run = inkSide === "l" ? [...Lp, ...Rp.slice(Math.round(n * 0.7)).reverse()] : inkSide === "r" ? [...Rp, ...Lp.slice(Math.round(n * 0.7)).reverse()] : open ? [...Lp, ...Rp.slice().reverse()] : [...Lp, ...Rp.slice().reverse(), Lp[0]];
  taper(g, run, (u) => Math.max(0.5, ink * (0.55 + 0.45 * Math.sin(Math.PI * u))), INK);
  return F;
}

// ---------------------------------------------------------------- talons
// a scaly toe (fix pass 2): a thick white toe tapering smoothly from `w` at the root to ≈ 0.55·w before the claw (no
// knuckle bulges), inked, with short scale cross-ticks every `tick` px and a dark filled hooked claw (the source's
// talons: short, chunky, tucked). pts = foot → toe end, w = width at the root; `k` scales the toe's length.
export function toe(g, pts0, w, { claw = 12, curl = 1, v = 0.93, ink = 2.2, tick = 9, seed = 2, k = 1, end = 0.62, clawV = 0.55 } = {}) {
  const r = rng(seed);
  const pts = k === 1 ? pts0 : pts0.map((p) => [pts0[0][0] + (p[0] - pts0[0][0]) * k, pts0[0][1] + (p[1] - pts0[0][1]) * k]);
  const q = sampleCurve(pts, 12), n = q.length;
  const wf = (u) => w * (1 - (1 - end) * Math.pow(u, 0.9));
  taper(g, q, (u) => wf(u) + ink * 2, INK);
  taper(g, q, wf, gv(v));
  // grey underside shading
  const sq = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], nn = perp(nrm(sub(b, a))); return add(p, mul(nn, -curl * wf(i / (n - 1)) * 0.3)); });
  taper(g, sq, (u) => wf(u) * 0.28, gv(0.7, 0.6));
  // scale cross-ticks: short arcs across the toe from its top edge
  let acc = 0;
  for (let i = 1; i < n - 1; i++) {
    const u = i / (n - 1), a = q[i - 1], b = q[i + 1], dd = nrm(sub(b, a)), nn = perp(dd), h = wf(u) / 2;
    acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc < tick || u < 0.12 || u > 0.92) continue; acc = r() * 1.5;
    stroke(g, [add(q[i], mul(nn, curl * h * 0.95)), add(add(q[i], mul(nn, curl * h * 0.2)), mul(dd, -1.2)), add(q[i], mul(nn, -curl * h * 0.45))], [0.9, 0.7, 0.3], { color: gv(0.4, 0.75), smooth: false });
  }
  // claw: a hook continuing the toe and curling to the `curl` side: dark ink round a grey horn (reads dark on the
  // white toe, and still shows against the black)
  const a = q[Math.max(0, n - 3)], b = q[n - 1], u = nrm(sub(b, a)), nn = perp(u), cw = wf(1) * 0.8;
  const c0 = sub(b, mul(u, 2)), c1 = add(add(b, mul(u, claw * 0.55)), mul(nn, curl * claw * 0.08)), c2 = add(add(b, mul(u, claw * 0.9)), mul(nn, curl * claw * 0.5));
  stroke(g, [c0, c1, c2], [cw + ink * 2, cw * 0.6 + ink * 1.4, 1.4], { color: INK, per: 10 });
  stroke(g, [add(c0, mul(u, 1)), c1, sub(c2, mul(sub(c2, c1), 0.2))], [cw * 0.8, cw * 0.4, 0.4], { color: gv(clawV), per: 10 });
}
// a foot: a feathered leg (a white tube), the toes (hind toe included in the list), and over the roots either a
// feathered stub (white mass with feather-edge notches, `stub`) or nothing. The old round 'ankle' knob is gone.
export function foot(g, F, o = {}) {
  const { leg = 18, toeW = 12, claw = 12, v = 0.93, toeK = 1 } = o;
  if (F.leg) {
    const q = sampleCurve(F.leg, 8);
    const lw = F.legW || leg, lf = (u) => lw * (1 - 0.3 * u);
    taper(g, q, (u) => lf(u) + 4.4, INK); taper(g, q, lf, gv(v));
    for (const e of [q[0], q[q.length - 1]]) { g.fillStyle = gv(v); g.beginPath(); g.arc(e[0], e[1], lf(e === q[0] ? 0 : 1) / 2, 0, TAU); g.fill(); }
  }
  F.toes.forEach((t, i) => toe(g, t, (F.w && F.w[i]) || toeW, { claw: (F.claws && F.claws[i]) || claw, curl: (F.curl && F.curl[i]) ?? 1, v, seed: 7 + i, k: (F.k && F.k[i]) ?? F.toeK ?? toeK }));
  if (F.stub) {
    // a feathered leg stub over the toe roots: rounded white mass, 3–4 feather-edge notches along its lower edge
    const [x, y, rx, ry, rot = 0] = F.stub, c = Math.cos(rot), s = Math.sin(rot), P = (a, k2 = 1) => [x + (Math.cos(a) * rx * c - Math.sin(a) * ry * s) * k2, y + (Math.cos(a) * rx * s + Math.sin(a) * ry * c) * k2];
    const pts = []; for (let j = 0; j < 24; j++) { const a = j / 24 * TAU, bump = Math.sin(a) > 0.2 ? 1 + 0.12 * Math.abs(Math.sin(a * 4)) : 1; pts.push(P(a, bump)); }
    g.fillStyle = gv(v); g.beginPath(); polyPath(pts)(g); g.fill();
    stroke(g, [P(0.1 * Math.PI), P(0.5 * Math.PI, 1.08), P(0.9 * Math.PI)], [0.6, 2.4, 0.6], { color: INK });
    for (let kk = 0; kk < 4; kk++) { const a = (0.2 + 0.2 * kk) * Math.PI; stroke(g, [P(a, 1.08), P(a - 0.1, 0.55)], [1.6, 0.4], { color: gv(0.3, 0.85) }); }
  }
}

// ---------------------------------------------------------------- plumage
// fine engraving hatch: short, parallel, near-straight strokes along a direction field, kept where tone(p) wins
export function fineHatch(g, clip, box, { dir = () => [1, 0], tone = () => 1, spacing = 3.5, len = [10, 26], w = [0.5, 1.0], color = gv(0.55, 0.6), seed = 9, jitter = 0.6 } = {}) {
  const r = rng(seed);
  const A = (box[2] - box[0]) * (box[3] - box[1]);
  const N = Math.round(A / (spacing * (len[0] + len[1]) / 2) * 0.9);
  g.save(); if (clip) { g.beginPath(); clip(g); g.clip(); }
  for (let i = 0; i < N; i++) {
    const p = [box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])];
    const t = tone(p); if (r() > t) { r(); r(); continue; }
    const d = dir(p), l = len[0] + r() * (len[1] - len[0]), ww = w[0] + r() * (w[1] - w[0]);
    const nn = perp(d), c = (r() - 0.5) * jitter * 0.12 * l;
    taper(g, sampleCurve([add(p, mul(d, -l / 2)), add(p, mul(nn, c)), add(p, mul(d, l / 2))], 4), (u) => Math.max(0.3, ww * Math.pow(Math.sin(Math.PI * u), 0.8)), color);
  }
  g.restore();
}

// ---------------------------------------------------------------- fist (fix pass 1, second agent)
// one curled finger of a feathered wing-hand: a rounded white lobe (closed outline `pts`), a grey rim along its lower
// edge (lit from above), an ink outline heavier underneath, and a few fine grey strokes along it near the knuckle.
// o = { v, rim, ink, strokes: [[pts], ...] }
export function lobe(g, pts, o = {}) {
  const { v = 0.95, rim = 0.74, ink = 3, depth = 9, blur = 6, light = [0.15, -1] } = o;
  const path = smoothFn(pts);
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(rim); g.beginPath(); path(g); g.fill();
  g.filter = `blur(${blur}px)`; g.fillStyle = gv(v); g.translate(light[0] * depth, light[1] * depth); g.beginPath(); path(g); g.fill();
  g.restore();
  if (o.strokes) for (const s of o.strokes) stroke(g, s, [0.3, 1.1, 0.8, 0.3], { color: gv(o.strokeV ?? 0.45, 0.75) });
  const q = curve(pts, true, 6);
  // ink: swell along the lower half (normal pointing down), thin on top
  const n = q.length;
  const ws = q.map((p, i) => { const a = q[(i - 1 + n) % n], b = q[(i + 1) % n], t = nrm(sub(b, a)); let A = 0; return t; });
  let A = 0; for (let i = 0; i < n; i++) { const p = q[i], r2 = q[(i + 1) % n]; A += p[0] * r2[1] - r2[0] * p[1]; }
  const W = ws.map((t) => { const out = A > 0 ? [t[1], -t[0]] : [-t[1], t[0]]; const f = out[1]; return ink * (0.45 + 0.75 * Math.max(0, f) + 0.25 * Math.max(0, -out[0])); });
  taper(g, [...q, q[0]], (u) => Math.max(0.6, W[Math.min(n - 1, Math.round(u * n))]), INK);
}
// an elliptical arc of a ring drawn over something (the front of a loop a finger passes through)
export function ringArc(g, { c, rx, ry, rot = 0, a0, a1, w = 6, v = null }) {
  g.save(); g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = w + (v != null ? 3 : 0);
  g.beginPath(); g.ellipse(c[0], c[1], rx, ry, rot, a0, a1); g.stroke();
  if (v != null) { g.strokeStyle = gv(v); g.lineWidth = Math.max(1, w - 3); g.beginPath(); g.ellipse(c[0], c[1], rx, ry, rot, a0 + 0.05, a1 - 0.05); g.stroke(); }
  g.restore();
}
