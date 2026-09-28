// s17 owl renderer: this shot's owl is a soft pencil cartoon (source 48.7–53.2 s, studied at 5–12x): a very white
// round bird with no dark outline against the black (its edge is a soft grey rim), faint grey facial-disc arcs high
// round the eyes, round white eyes with a thin grey ring and a small black pupil, a small open beak (pale upper
// mandible, dark mouth, pale lower mandible), headphones seen from the side (a narrow soft plate in front of a grey
// cushion, a two-line band with sliders), long separated wing primaries (traced outlines) with grey feather-edge
// lines running on from each notch and a faint shaft down each feather, sparse pencil strokes on the belly, and
// small white cartoon-hand feet (club toes curled over at the top, a fat stalk; the far foot's fingers crook
// toward the mug).
// The head and the body are one mass: the head's outline is not drawn where it lies over the body.
// Layer order is per pose, so a wing can sit between the body and the head.
// Everything is in owl units (head vertical radius = 100) and seeded: the same pose always gives the same pixels.
import { gv, V, setPPU, ink, flick, plumage, softShade, headGeom, headphoneGeom, bodyOutline } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";
import { taper } from "../../lib/ink.js";

const { add, sub, mul, nrm, perp } = V;
const lerpN = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);
let PPU = 1, SPX = 1;          // PPU: device px per owl unit; SPX: frame px per owl unit (the pose's s)
let IG = 1;                    // (pass 4) interior-line gain of this drawing: 0.85 in the crouch .. 1.45 by 52.44 (P.ink)
const wmin = (w) => Math.max(w, 0.6 / PPU);
const PX = (v) => v / SPX;     // a width given in frame px, in owl units
const OFF = (k) => !!(((globalThis.__S17 || {}).off || {})[k]);   // lab-only switches (never set in the film)
const KV = (k, v) => { const o = (globalThis.__S17 || {}).kv; return o && o[k] != null ? o[k] : v; };   // lab-only overrides

// the source's line values (graded frame, measured at 49.0 / 51.36 / 52.44): white plumage 245-252, keylines on the
// plumage 120-150 (thin, ~1 px), eye rings ~120, pupils dark, the rim against the black ~205
const KEY = 0.44;               // wing / feather keylines
const RIM = 0.56;              // the soft rim round the silhouette
const DISC = 0.56;             // facial disc line

// ---------------------------------------------------------------- wings
// A cartoon wing given by its leading edge (lead: shoulder -> hand end) and its feather tips (tips: outermost ->
// innermost), both measured straight off the source. Each feather roots on the leading edge (outer ones at the
// hand end) and runs to its tip; widths follow the spacing of neighbouring tips so the feathers overlap into one
// wing; a covert band (cw = fraction of the feather length) covers the roots.
export function wingGeom(w) {
  const { lead: L0, tips: T0, cw = 0.42, fw = 1, rmax = 0.62, sub: subd = 0, gap = 1 } = w;
  // subdivide the measured tips: an extra, slightly shorter feather between each pair
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
    // the primaries (outer half) are narrow fingers with black gaps between their tips; the inner ones overlap
    const fo = n === 1 ? 1 : 1 - i / (n - 1);
    f.w = clamp(sp * (fo > 0.5 && gap ? 1.5 : 2.0), L * 0.16, L * 0.32) * fw;
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
    f.nn = nn;
    f.off = mul(nn, f.w * (i === 0 ? 0.42 : 0.22));
  }
  const cov = feathers.map((f) => V.mix(f.root, f.tip, cw));
  return { lead, cov, feathers, tr: nrm(trs), len: Ls / Math.max(1, n) };
}
// a long pointed feather, flame-like: full width over most of its length, then a pointed tip
function leaf(f) {
  const d = sub(f.tip, f.root), L = V.len(d) || 1, u = mul(d, 1 / L), n = perp(u), w = f.w;
  const o = f.off || [0, 0];
  const sh = (q, k) => add(q, mul(o, k));
  const P = (a, b, k) => sh(add(add(f.root, mul(u, L * a)), mul(n, w * b)), k);
  return [P(0, -0.34, 1), P(0.36, -0.5, 0.85), P(0.7, -0.42, 0.55), P(0.9, -0.2, 0.3), f.tip, P(0.9, 0.2, 0.3), P(0.7, 0.42, 0.55), P(0.36, 0.5, 0.85), P(0, 0.34, 1)];
}
const area2 = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };
function paintWing(g, G, plu, dl, seed = 1, poly = null) {
  // The source's wing is one white mass: the feathers' pointed tips make its trailing edge (sharp V notches, black
  // gaps only between the outer primaries), the coverts two soft scalloped rows; faint grey feather lines inside.
  // poly: the source's own outline of this drawing (traced, trace/wing_trace.py) — then it is the wing's shape and
  // the feather lines run in from its notches; otherwise the shape is built from the pose's leading edge and tips.
  const r0 = rng(300 + seed * 31);
  const fs = G.feathers.map((f0) => { const vw = 0.88 + 0.24 * r0(), vl = 0.94 + 0.06 * r0(); return { ...f0, w: f0.w * vw, tip: V.mix(f0.root, f0.tip, vl), off: f0.off ? mul(f0.off, vw) : null }; });
  const shapes = fs.map((f) => leaf(f));
  const band = [...G.lead, ...G.cov];
  const sgn = Math.sign(area2(shapes[0]) || 1);
  const bandO = Math.sign(area2(band)) === sgn ? band : [...band].reverse();
  const union = poly ? (c) => { c.moveTo(poly[0][0], poly[0][1]); for (const p of poly) c.lineTo(p[0], p[1]); c.closePath(); }
    : (c) => { for (const sh of shapes) smoothPath(c, sh, true); smoothPath(c, bandO, true); };
  G.union = union;
  if (poly) { paintWingPoly(g, G, plu, dl, poly, union, G.tone || 0); return; }
  // the white mass, lit from the upper left, a little greyer toward the trailing edge
  plumage(g, union, { base: 0.97, shade: KV("wingShadeM", 0.8), depth: G.len * 0.22, blur: G.len * 0.1, ...plu });
  if (dl > 0.3) {
    // grey under the covert rows (the feathers' roots are in their shadow)
    const covIn = [...G.cov].reverse();
    softShade(g, union, (c) => { const q = sampleCurve(covIn, 3); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); for (let k = q.length - 1; k >= 0; k--) c.lineTo(q[k][0] + G.tr[0] * G.len * 0.14, q[k][1] + G.tr[1] * G.len * 0.14); c.closePath(); }, 0.7, 0.45, G.len * 0.05);
  }
  // feather lines: each feather's trailing-side edge from mid-length to the tip (inner feathers first, so they read
  // as lying over the next one out)
  // (pass 4) the dash's wings carry the same grey feather edges as the rise's (source line maps at 52.88–53.2):
  // heavier edges, and the covert rows
  for (let i = fs.length - 1; i >= 0; i--) {
    const sh = shapes[i];
    ink(g, sh.slice(4, 8), PX(1.2), gv(KEY - 0.04 * IG, clamp(0.8 * IG, 0, 1)), { end: 0.1, bias: 0.3 });
    if (i < fs.length - 1) ink(g, sh.slice(1, 5), PX(1.0), gv(KEY + 0.12, clamp(0.6 * IG, 0, 1)), { end: 0.1, bias: 0.7 });
  }
  if (dl > 0.3 && !OFF("coverts")) { g.save(); g.beginPath(); union(g); g.clip(); covertRows(g, G, () => false); g.restore(); }
  else covertArcs(g, G, dl);
  ink(g, G.lead, PX(1.0), gv(RIM, 0.6), { end: 0.3, bias: 0.4 });
}
// (pass 4) the source's body texture (52.44 / 51.68 at 5x, dark-line maps): soft grey fluff marks all over the chest
// and belly — short curved strokes ~6–9 px long, ~2 px wide, ~213 graded (pre-grade ~0.8), ~10 px apart, a little
// denser and darker low on the belly and toward the unlit right flank, thinning out in the lit upper left.
// Seeded and placed in the body's own frame, so they move with the body and do not boil.
function fluff(g, bodyP, b, seed, keep = null) {
  const r = rng(seed), cx = b.x || 0, cy = b.y || 0;
  // the crouch's drawing is softer (less texture) than the rise's: fluff strength follows the drawing's ink
  const FK = lerpN(0.45, 1, clamp((IG - 0.85) / 0.6));
  const area = Math.PI * b.a * b.b, N = Math.round(area / (PX(11) * PX(11)));
  g.save(); g.beginPath(); bodyP(g); g.clip();
  g.filter = `blur(${Math.max(1.0, PX(0.8) * PPU).toFixed(2)}px)`;
  for (let i = 0; i < N; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.95;
    const q = add([cx, cy], V.rot([b.a * Math.cos(a) * d, b.b * Math.sin(a) * d], b.rot));
    if (keep && !keep(Math.cos(a) * d, Math.sin(a) * d)) continue;
    const dy = (q[1] - cy) / b.b, dx = (q[0] - cx) / b.a;
    const k = clamp(0.55 + 0.35 * dy + 0.2 * dx, 0.15, 1);        // lit upper left -> fewer, lighter marks
    if (r() > 0.35 + 0.65 * k) continue;
    // soft feather-tip arcs, mostly lying across the body (bowing down), 7–12 px
    const L = PX(7 + 5 * r()), ang = (r() - 0.5) * 1.0 + (dx < 0 ? 0.3 : -0.3);
    let dir = [Math.cos(ang), Math.sin(ang)], nn = perp(dir);
    if (nn[1] < 0) nn = mul(nn, -1);
    const bow = L * (0.2 + 0.12 * r());
    const p0 = add(q, mul(dir, -L / 2)), p2 = add(q, mul(dir, L / 2)), p1 = add(q, mul(nn, bow));
    taper(g, sampleCurve([p0, p1, p2], 4), (u) => PX(1.9) * (0.3 + 0.7 * Math.sin(Math.PI * u)), gv(0.7 - 0.06 * IG + 0.06 * (1 - k), clamp((0.6 + 0.3 * k) * IG * FK, 0, 1)));
  }
  g.restore();
}
function covertRows(g, G, inCut) {
  const lead = G.lead, n = lead.length;
  if (n < 2) return;
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1] + V.len(sub(lead[i], lead[i - 1])));
  const T = acc[n - 1] || 1;
  const at = (u) => { const d = clamp(u) * T; let i = 1; while (i < n - 1 && acc[i] < d) i++; return V.mix(lead[i - 1], lead[i], clamp((d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]))); };
  const blur = Math.max(1.0, PX(0.9) * PPU);
  for (const [off, u0, u1, sw, col, a, lw] of [[0.27, 0.02, 0.8, 14, 0.62, 0.85, 2.0], [0.55, 0.04, 0.5, 16, 0.7, 0.6, 1.8]]) {
    const o = mul(G.tr, G.len * off), L = (u1 - u0) * T, m = Math.max(2, Math.round(L / PX(sw)));
    const pts = [];
    for (let k = 0; k <= m; k++) pts.push(add(at(u0 + (u1 - u0) * k / m), mul(o, 1 - 0.25 * k / m)));
    g.save(); g.filter = `blur(${blur.toFixed(2)}px)`;
    for (let k = 0; k < m; k++) {
      const p0 = pts[k], p1 = pts[k + 1], w = V.len(sub(p1, p0));
      const mid = add(V.mix(p0, p1, 0.5), mul(G.tr, w * 0.38));
      if (inCut(mid)) continue;
      const q = sampleCurve([p0, add(V.mix(p0, mid, 0.5), mul(G.tr, w * 0.1)), mid, add(V.mix(mid, p1, 0.5), mul(G.tr, w * 0.1)), p1], 4);
      taper(g, q, (u) => PX(lw) * (0.35 + 0.65 * Math.sin(Math.PI * u)), gv(col - 0.1 * (IG - 1), clamp(a * IG, 0, 1)));
    }
    g.restore();
  }
}
function covertArcs(g, G, dl) {
  if (dl <= 0.3) return;
  const covIn = sampleCurve([...G.cov].reverse(), 4), nA = 4, m = covIn.length;
  for (let j = 0; j < nA; j++) {
    const a = covIn[Math.floor(j * (m - 1) / nA)], b = covIn[Math.floor((j + 1) * (m - 1) / nA)];
    const mid = add(V.mix(a, b, 0.5), mul(G.tr, V.len(sub(b, a)) * 0.28));
    ink(g, [a, mid, b], PX(0.85), gv(0.66, 0.55), { end: 0.2 });
  }
}
// A traced wing (fix pass 1). The source's wings are long, narrow, pointed primaries fanned out with dark gaps
// between them (the traced outline keeps the gaps), each feather edged by a grey line that runs on from its notch
// deep into the wing, a faint shaft line down each feather, and a few soft covert arcs near the wrist.
// Features of the outline, found on a ~1 px resampling: notches = local maxima of concave depth (a chord across
// +-5 px of outline passes outside), tips = local maxima of convex depth between them.
function resampleClosed(poly, step) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], L = V.len(sub(b, a)), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push(V.mix(a, b, k / n));
  }
  return out;
}
function inPoly(pt, q) {
  let c = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const a = q[i], b = q[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function outlineFeatures(poly) {
  const P = resampleClosed(poly, PX(1)), n = P.length, at = (i) => P[((i % n) + n) % n];
  if (n < 20) return { P, notches: [], tips: [] };
  // orientation from the leftmost point (always convex)
  let im = 0; for (let i = 1; i < n; i++) if (P[i][0] < P[im][0]) im = i;
  const turn = (i, k) => { const a = at(i - k), p = at(i), b = at(i + k); return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]); };
  const cs = Math.sign(turn(im, 3)) || 1;
  const k = 5, D = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = at(i - k), b = at(i + k), p = P[i], ab = sub(b, a), L = V.len(ab) || 1;
    const d = Math.abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L;
    D[i] = (Math.sign(turn(i, k)) === cs ? 1 : -1) * d;     // + convex, - concave
  }
  const ext = (sgn, thr) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = sgn * D[i]; if (v < thr) continue;
      let best = true; for (let j = -4; j <= 4 && best; j++) if (j && sgn * D[((i + j) % n + n) % n] > v) best = false;
      if (best && !(out.length && i - out[out.length - 1].i < 3)) out.push({ i, p: P[i], d: v });
    }
    return out;
  };
  const dirIn = (i) => { const m = V.mix(at(i - 2 * k), at(i + 2 * k), 0.5); return nrm(sub(P[i], m)); };
  const notches = ext(-1, PX(1.3)).map((o) => ({ ...o, dir: dirIn(o.i) }));
  const tips = ext(1, PX(1.2)).map((o) => ({ ...o, dir: mul(dirIn(o.i), -1) }));
  return { P, notches, tips };
}
function paintWingPoly(g, G, plu, dl, poly, union, tone = 0) {
  plumage(g, union, { base: 0.99, shade: KV("wingShade", 0.84), depth: G.len * 0.22, blur: G.len * 0.1, ...plu });
  if (tone > 0) { g.save(); g.beginPath(); union(g); g.clip(); g.fillStyle = gv(0.72, tone); g.fillRect(-5000, -5000, 10000, 10000); g.restore(); }
  const root = G.lead[0];
  const F = outlineFeatures(poly);
  g.save(); g.beginPath(); union(g); g.clip();
  if (dl > 0.3) {
    const covIn = [...G.cov].reverse();
    softShade(g, union, (c) => { const q = sampleCurve(covIn, 3); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); for (let k = q.length - 1; k >= 0; k--) c.lineTo(q[k][0] + G.tr[0] * G.len * 0.14, q[k][1] + G.tr[1] * G.len * 0.14); c.closePath(); }, 0.72, 0.35, G.len * 0.05);
  }
  // the feather edges: from each notch a grey line runs on into the wing along the gap, bending toward the root,
  // dark at the notch and fading (a soft grey shadow beside it: the overlapping feather's edge)
  const cutP = G.cutPolys || [], inCut = (p) => cutP.some((q) => inPoly(p, q));
  for (const nt of F.notches) {
    const dr = V.len(sub(root, nt.p)); if (dr < PX(10) || inCut(nt.p)) continue;
    // the line's length follows the feather's size: the spacing to the neighbouring notches and the notch depth
    // (short for the small overlapping secondaries along the lower edge, long between the primaries)
    let sp = 1e9; for (const o of F.notches) if (o !== nt) sp = Math.min(sp, V.len(sub(o.p, nt.p)));
    if (sp > 1e8) sp = PX(20);
    // (pass 4) shallow notches (the secondaries' overlapping tips along the trailing edge) get short edges only
    const Ls = nt.d < PX(3) ? clamp(0.8 * sp, PX(4), PX(12)) : clamp(1.5 * sp + 1.8 * nt.d, PX(5), Math.min(0.68 * dr, PX(54)));
    const toRoot = nrm(sub(root, nt.p));
    // the gap's axis: from between the two feather tips either side of the notch (along the outline) into the notch
    const nP = F.P.length, fwd = (i) => ((i - nt.i) % nP + nP) % nP;
    let tA = null, tB = null;
    for (const tp of F.tips) { const k = fwd(tp.i); if (!tA || k < fwd(tA.i)) tA = tp; if (!tB || k > fwd(tB.i)) tB = tp; }
    let d1 = nt.dir;
    if (tA && tB && tA !== tB && fwd(tA.i) < nP / 3 && nP - fwd(tB.i) < nP / 3) { const g0 = sub(nt.p, V.mix(tA.p, tB.p, 0.5)); if (V.len(g0) > PX(1.5)) d1 = nrm(add(nrm(g0), mul(nt.dir, 0.3))); }
    const d2 = nrm(add(d1, mul(toRoot, 0.12)));
    const p1 = add(nt.p, mul(d1, Ls * 0.5)), p2 = add(p1, mul(d2, Ls * 0.5));
    const q = sampleCurve([add(nt.p, mul(d1, -PX(0.5))), p1, p2], 6);
    g.save(); g.filter = `blur(${Math.max(0.4, PX(1.3) * PPU).toFixed(2)}px)`;
    taper(g, q, (u) => PX(3.2) * (1 - 0.55 * u), gv(0.74, 0.45)); g.restore();
    taper(g, q, (u) => PX(1.4) * (1 - 0.6 * u), gv(0.42 - 0.12 * (IG - 1), clamp(0.85 * IG, 0, 1)));
    taper(g, q.slice(0, Math.ceil(q.length * 0.3)), (u) => PX(1.3) * (1 - 0.8 * u), gv(0.3, 0.85));
  }
  // one faint shaft line down each feather from near its tip — (pass 4) only on the long primaries: on the
  // secondaries they crossed the wing as stray scratches the source does not have
  for (const tp of F.tips) {
    if (tp.d < PX(4)) continue;
    const dr = V.len(sub(root, tp.p)); if (dr < PX(18) || inCut(tp.p)) continue;
    const toRoot = nrm(sub(root, tp.p)), d1 = tp.dir, d2 = nrm(add(d1, mul(toRoot, 0.5)));
    const L = clamp(0.4 * dr, PX(6), PX(26));
    const s0 = add(tp.p, mul(d1, PX(3.5))), s1 = add(s0, mul(d1, L * 0.5)), s2 = add(s1, mul(d2, L * 0.5));
    ink(g, [s0, s1, s2], PX(0.65), gv(0.66, 0.7), { end: 0.15, bias: 0.25 });
  }
  // (pass 4) the source's covert rows (line maps at 50.24 / 51.68 / 52.44): a chain of soft grey scallops parallel
  // to the leading edge, ~0.25 of the feather length in, from the shoulder to past the wrist, and a fainter second
  // chain at ~0.55 over the inner half (the secondaries' overlapping tips)
  if (dl > 0.3 && !OFF("coverts")) covertRows(g, G, inCut);
  else covertArcs(g, G, dl);
  g.restore();
  // a soft grey rim round the outline (against the black it reads as the edge of the lit mass), not along the
  // inner edge where the wing meets the body and head (the tracer cut it there)
  g.save();
  if (G.cut) { g.beginPath(); g.rect(-5000, -5000, 10000, 10000); G.cut(g); g.clip("evenodd"); }
  ink(g, [...poly, poly[0]], PX(0.9), gv(RIM + 0.06, 0.55), { end: 0.8, per: 2 });
  g.restore();
}
// ---------------------------------------------------------------- tail: a fan of pointed feathers from base toward dir
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

// ---------------------------------------------------------------- headphone cup, seen from the side
// The source's cup (52.44, 7x): a narrow light face plate (~0.8, two concentric rings) on the side away from the
// head, in front of a thicker grey cushion (~0.5, fine ribs) on the head side; dark grey keylines. r = half height.
function drawCupS(g, c) {
  const { x, y, r = 45, rot = 0, open = 0.85, side = 1, far = false, face = 0, faceW = 1, ink: ik = 1 } = c;
  // (pass 4) the side-on cup's lines follow the drawing's ink (light in the crouch, dark by 52.44)
  const IK = (dark, light) => lerpN(light, dark, clamp(ik));
  g.save(); g.translate(x, y); g.rotate(rot);
  // open: 0.5 = seen from the side (a narrow plate beside the cushion), 1 = seen face-on (the plate centred inside
  // the cushion ring: the dash, 52.7–53.2)
  const s = side, fo = clamp(face, 0, 1);
  if (fo > 0.99 && !far) { drawCupFace(g, c); g.restore(); return; }
  // (pass 4) side-on, the source's cup is ~10 % narrower than the fitted width, with the same cushion edge
  const sideK = !far && fo < 0.5 ? 0.9 : 1;
  const W = r * lerpN(clamp(open, 0.2, 1.2), faceW, fo) * sideK;   // half width of the whole cup (open = W / r)
  if (sideK < 1) g.translate(-s * r * clamp(open, 0.2, 1.2) * 0.1 * 0.6, 0);
  const lw = wmin(PX(1.2));
  // cushion: toward the head (-s). Face-on (the dash, 5x at 52.88 / 53.08) it is a ring lit on the upper right and
  // dark in a crescent on the lower left, with no ribs showing
  const cx = -s * W * 0.3 * (1 - fo), crx = W * lerpN(0.68, 1.0, fo), cry = r;
  if (far) g.fillStyle = gv(0.3);
  else { const cg = g.createLinearGradient(crx * 0.7, -cry * 0.7, -crx * 0.7, cry * 0.7); cg.addColorStop(0, gv(lerpN(0.5, 0.8, fo))); cg.addColorStop(0.55, gv(lerpN(0.5, 0.58, fo))); cg.addColorStop(1, gv(lerpN(0.5, 0.32, fo))); g.fillStyle = cg; }
  // (pass 4) side-on, the source's cushion (52.44 at 12x) is pale (~0.8) with dark ribs every ~4 px across it
  if (!far && fo < 0.5) g.fillStyle = gv(0.8);
  g.beginPath(); g.ellipse(cx, 0, crx, cry, 0, 0, TAU); g.fill();
  if (!far) {
    g.save(); g.beginPath(); g.ellipse(cx, 0, crx, cry, 0, 0, TAU); g.clip();
    g.lineCap = "butt";
    const ra = 1 - fo;
    if (ra > 0.02) {
      const nr = Math.max(6, Math.round(2 * cry / PX(4)));
      for (let i = 0; i < nr; i++) {
        const yy = -cry + (i + 0.5) * (2 * cry / nr);
        const hw = crx * Math.sqrt(Math.max(0, 1 - (yy / cry) ** 2));
        g.strokeStyle = gv(IK(0.3, 0.5), 0.75 * ra); g.lineWidth = wmin(PX(1.1));
        g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy + PX(0.6)); g.stroke();
      }
    }
    // the cushion's round shading: lit toward the upper left
    g.filter = `blur(${Math.max(0.4, r * 0.18 * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(0.2, (fo < 0.5 && !far ? 0.62 : 0.45) * ra); g.beginPath(); g.ellipse(cx + s * crx * 0.1, cry * 0.55, crx * 0.95, cry * 0.55, 0, 0, TAU); g.fill();
    g.filter = "none";
    g.restore();
  }
  const side0 = !far && fo < 0.5;
  g.strokeStyle = gv(side0 ? IK(0.13, 0.36) : lerpN(0.14, 0.24, fo)); g.lineWidth = side0 ? wmin(PX(1.8)) : lw; g.beginPath(); g.ellipse(cx, 0, crx, cry, 0, 0, TAU); g.stroke();
  // face plate: away from the head (+s); face-on, pale with a highlight toward the upper right
  const fx = s * W * 0.26 * (1 - fo), frx = W * lerpN(0.68, 0.7, fo), fry = r * lerpN(0.95, 0.7, fo);
  const pg = fo > 0.5 ? g.createLinearGradient(fx + frx, -fry, fx - frx, fry) : g.createLinearGradient(fx - frx, -fry, fx + frx, fry);
  if (side0) {
    // (pass 4) the source's side-on plate (52.44 / 51.68 at 12x): pale (~0.9) with three thin concentric grey rings
    pg.addColorStop(0, gv(0.9)); pg.addColorStop(0.5, gv(0.8)); pg.addColorStop(1, gv(0.6));
  } else {
    pg.addColorStop(0, gv(far ? 0.45 : lerpN(0.82, 0.8, fo))); pg.addColorStop(0.6, gv(far ? 0.36 : lerpN(0.7, 0.6, fo))); pg.addColorStop(1, gv(far ? 0.28 : lerpN(0.54, 0.46, fo)));
  }
  g.fillStyle = pg; g.beginPath(); g.ellipse(fx, 0, frx, fry, 0, 0, TAU); g.fill();
  if (side0) for (const k of [0.8, 0.58, 0.36]) { g.strokeStyle = gv(IK(0.42, 0.6), 0.9); g.lineWidth = wmin(PX(0.9)); g.beginPath(); g.ellipse(fx - s * frx * (1 - k) * 0.15, 0, frx * k, fry * k, 0, 0, TAU); g.stroke(); }
  g.strokeStyle = gv(side0 ? IK(0.16, 0.4) : lerpN(0.16, 0.3, fo)); g.lineWidth = side0 ? wmin(PX(1.5)) : lw; g.beginPath(); g.ellipse(fx, 0, frx, fry, 0, 0, TAU); g.stroke();
  // the source's plate has a heavy dark rim along its lower outer side (in shadow)
  if (side0) { g.strokeStyle = gv(IK(0.14, 0.38)); g.lineWidth = wmin(PX(IK(3.2, 2.2))); g.lineCap = "round"; g.beginPath(); g.ellipse(fx, 0, frx, fry, 0, s > 0 ? -0.1 : Math.PI * 0.55, s > 0 ? Math.PI * 0.45 : Math.PI * 1.1); g.stroke(); }
  g.restore();
}

// (pass 4) the face-on cup of the dash (53.00 / 53.08 / 52.80 at 6x): a thick dark cushion ring, heaviest in a
// crescent low on the left (~0.12), grey and lit on the upper right (~0.5); inside it a lighter plate (~0.72) with a
// faint darker ring and a pale boss offset up and right. x, y: the centre; r: half height; faceW: width / height.
// Called with the context already translated and rotated to the cup.
function drawCupFace(g, c) {
  const { r = 45, faceW = 0.8 } = c;
  const rx = r * faceW, ry = r;
  // the cushion: grey on top (~0.5, no dark edge there), dark and thick low (the plate sits high in it)
  const cg = g.createLinearGradient(rx * 0.3, -ry, -rx * 0.3, ry);
  cg.addColorStop(0, gv(0.62)); cg.addColorStop(0.45, gv(0.36)); cg.addColorStop(0.8, gv(0.14)); cg.addColorStop(1, gv(0.1));
  g.fillStyle = cg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  const px = rx * 0.04, py = -ry * 0.12, prx = rx * 0.8, pry = ry * 0.7;
  // the plate: mid grey, darker low on the left, lighter toward the right, a pale boss up and to the right
  const pg = g.createLinearGradient(px - prx, py + pry * 0.5, px + prx, py - pry * 0.3);
  pg.addColorStop(0, gv(0.45)); pg.addColorStop(0.55, gv(0.6)); pg.addColorStop(1, gv(0.8));
  g.fillStyle = pg; g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, TAU); g.fill();
  g.save(); g.filter = `blur(${Math.max(1, PX(2) * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(0.86, 0.85); g.beginPath(); g.ellipse(px + prx * 0.18, py - pry * 0.12, prx * 0.4, pry * 0.4, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = gv(0.3, 0.7); g.lineWidth = wmin(PX(1.0)); g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, TAU); g.stroke();
  // outer edge: dark along the lower two thirds only
  g.lineCap = "round";
  g.strokeStyle = gv(0.08); g.lineWidth = wmin(PX(1.4)); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, -0.15 * Math.PI, 1.15 * Math.PI); g.stroke();
  g.strokeStyle = gv(0.4, 0.8); g.lineWidth = wmin(PX(1.0)); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke();
}

// ---------------------------------------------------------------- feet: chunky pale cartoon toes, thin grey keyline
// f: { x, y (ankle), rot (0 = toes point down), size (toe length), toes, spread (fan, radians), curl (+ bends the
//      toes clockwise), leg: [dx, dy] (where the leg leaves the belly, relative to the ankle), claw }
function drawFootS(g, f) {
  const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.18, seed = 3, palm = 0.26 } = f;
  const fat = Math.max(f.fat ?? 0.3, 0.3);
  const r = rng(seed);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  const tw = size * fat, ol = wmin(PX(0.9));
  const stroke = (q, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]); g.stroke(); };
  if (f.leg) {
    // a short feathered leg from the belly to the foot (frame-aligned offset, undone from the foot's rotation)
    const L = V.rot(f.leg, -rot), q = [L, V.mix(L, [0, 0], 0.5), [0, 0]];
    stroke(q, tw * 1.5 + ol * 2, gv(0.55)); stroke(q, tw * 1.5, gv(0.95));
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
    stroke([e, tip], tw * 0.55 + ol, gv(0.2));
    stroke(q, tw + ol * 2, gv(0.4));
    stroke(q, tw, gv(0.94 - 0.03 * r()));
    // the toe pads: two faint knuckle creases
    for (const k of [0.4, 0.72]) {
      const j = Math.floor((q.length - 1) * k), p = q[j], tt = nrm(sub(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), n = perp(tt);
      ink(g, [add(p, mul(n, -tw * 0.42)), add(p, mul(tt, tw * 0.12)), add(p, mul(n, tw * 0.42))], PX(0.6), gv(0.55, 0.6), { end: 0.3 });
    }
  }
  const pr = size * palm;
  g.fillStyle = gv(0.94); g.beginPath(); g.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- trident foot (the rise, measured per key):
// a pale stalk from the palm down to the heel, three toes fanning up from the palm with their tips hooked outward
// (small dark claws), and for the far foot a short feathered leg from the belly. f: { palm, heel, toes[3], leg, w }
// A club: a centreline with a half-width profile hw(u) and round caps (u = 0 at the first point), as a closed path.
function clubPath(c, q, hw) {
  const n = q.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], t = nrm(sub(b, a)), nn = perp(t), h = hw(i / (n - 1));
    L.push(add(q[i], mul(nn, h))); R.push(add(q[i], mul(nn, -h)));
  }
  const t1 = nrm(sub(q[n - 1], q[n - 2])), a1 = Math.atan2(t1[1], t1[0]), h1 = hw(1);
  const t0 = nrm(sub(q[1], q[0])), a0 = Math.atan2(t0[1], t0[0]), h0 = hw(0);
  c.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) c.lineTo(L[i][0], L[i][1]);
  c.arc(q[n - 1][0], q[n - 1][1], h1, a1 + Math.PI / 2, a1 - Math.PI / 2, true);
  for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.arc(q[0][0], q[0][1], h0, a0 - Math.PI / 2, a0 + Math.PI / 2, true);
  c.closePath();
}
// one toe: a dark outline, the pale fill over it (so each toe drawn later overlaps the one before with a keyline)
function clubToe(g, q, hw, ol, fill = 0.95, line = 0.3) {
  g.fillStyle = gv(line); g.beginPath(); clubPath(g, q, (u) => hw(u) + ol); g.fill();
  g.fillStyle = gv(fill); g.beginPath(); clubPath(g, q, hw); g.fill();
}
// The source's rise feet (48.8–52.60 at 7x): small white cartoon "hands" with ~1 px dark keylines.
// Near foot (no leg): three club-shaped toes packed side by side rising from the palm to rounded tops (f.toes = the
// tops), each top curled over with a dark inner hook (the claw seen curling toward us), and one fat rounded stalk
// hanging from the palm to f.heel in front of the desk. Far foot (leg): the leg from the belly to a broad palm,
// three thin fingers reaching up and toward the mug whose tips crook over (a small dark claw point), and a fat
// rounded toe down to f.heel on the desk.
function drawFootT(g, f) {
  const { palm, heel, toes, leg } = f;
  const ol = wmin(PX(1.0));
  const ax = nrm(sub(V.mix(toes[0], toes[toes.length - 1], 0.5), palm)), pn = perp(ax);
  // stalk / heel toe (behind the toes): fat, rounded
  const hd = nrm(sub(heel, palm));
  const hq = sampleCurve([palm, add(V.mix(palm, heel, 0.5), mul(perp(hd), PX(0.5))), heel], 4);
  const hw = leg ? (u) => PX(2.3 - 0.2 * u) : (u) => PX(3.0 - 0.7 * u);
  let palmBlob = null;
  if (leg) {
    // the feathered leg: a soft white blob from the belly to the palm, a faint keyline under it
    const d = sub(palm, leg), L = V.len(d) || 1, a = Math.atan2(d[1], d[0]), c = V.mix(leg, palm, 0.5);
    g.fillStyle = gv(0.94); g.beginPath(); g.ellipse(c[0], c[1], L * 0.62, PX(4.4), a, 0, TAU); g.fill();
    ink(g, [add(leg, V.rot([0, PX(4.6)], a)), add(c, V.rot([0, PX(4.8)], a)), add(palm, V.rot([PX(1), PX(3.8)], a))], PX(1.0), gv(0.32, 0.85), { end: 0.4 });
    clubToe(g, hq, hw, ol);
    // the palm: a broad block the fingers rise from
    palmBlob = [add(palm, mul(pn, PX(2.6))), add(palm, mul(pn, -PX(2.6)))];
    clubToe(g, palmBlob, () => PX(3.0), ol);
  } else {
    clubToe(g, hq, hw, ol);
  }
  const n = toes.length;
  // far-foot fingers left to right; near-foot toes outer first, the middle one last (on top)
  const idx = leg ? toes.map((_, i) => i) : toes.map((_, i) => i).sort((p, q) => Math.abs(q - (n - 1) / 2) - Math.abs(p - (n - 1) / 2));
  const marks = [];
  for (const i of idx) {
    const tp = toes[i], k = i - (n - 1) / 2;
    const top = leg ? PX(1.05) : PX(3.1), base = leg ? PX(1.3) : PX(1.7);
    const b = add(add(palm, mul(pn, k * (leg ? PX(1.6) : PX(2.2)))), mul(ax, leg ? PX(0.8) : PX(0.5)));
    const u = nrm(sub(tp, b));
    const e = sub(tp, mul(u, top));                         // centre of the round top
    const m = add(V.mix(b, e, 0.5), mul(perp(u), k * PX(0.7)));
    if (leg) {
      // a finger crooking over at the tip toward the mug (+x side of its direction)
      let side = perp(u); if (side[0] < 0) side = mul(side, -1);
      const hk = add(e, add(mul(side, PX(1.6)), mul(u, -PX(0.8))));
      const q = sampleCurve([b, m, e, hk], 4);
      clubToe(g, q, (s) => base + (top - base) * s, ol);
      // the claw point: a small dark hook off the crooked tip
      const cd = nrm(add(mul(side, 0.5), mul(u, -1)));
      marks.push(() => taper(g, sampleCurve([hk, add(hk, mul(cd, PX(1.8))), add(add(hk, mul(cd, PX(3.0))), mul(u, -PX(0.6)))], 3), (s) => PX(1.3) * (1 - 0.85 * s), gv(0.22)));
    } else {
      const q = sampleCurve([b, m, e], 4);
      clubToe(g, q, (s) => base + (top - base) * Math.pow(s, 0.7), ol);
      // the curled claw: the tip folded down toward us — a dark inner loop in the rounded top, a dark point under it
      const nn = perp(u), r0 = top * 0.5;
      const arc = [];
      for (let j = 0; j <= 8; j++) { const a = Math.PI * j / 8; arc.push(add(e, add(mul(nn, -Math.cos(a) * r0), mul(u, Math.sin(a) * r0 - top * 0.1)))); }
      const pts = [add(arc[0], mul(u, -top * 0.6)), ...arc, add(arc[8], mul(u, -top * 0.6))];
      marks.push(() => {
        ink(g, pts, PX(0.8), gv(0.32, 0.85), { end: 0.2, per: 2 });
        g.fillStyle = gv(0.2); g.beginPath(); g.ellipse(...add(e, mul(u, -top * 0.5)), PX(0.75), PX(1.2), Math.atan2(u[1], u[0]) + Math.PI / 2, 0, TAU); g.fill();
      });
    }
  }
  // where the toes leave the palm: one white mass (the source has no line across there)
  g.fillStyle = gv(0.95);
  if (palmBlob) { g.beginPath(); clubPath(g, palmBlob, () => PX(2.1)); g.fill(); }
  else { g.beginPath(); clubPath(g, hq.slice(0, Math.ceil(hq.length * 0.6)), (u) => hw(u * 0.6) - PX(0.1)); g.fill(); }
  for (const f of marks) f();
}
// ---------------------------------------------------------------- headphone band: a thin light strip between two grey
// keylines; near each cup the slider, a slightly wider block
function drawBandS(g, pts, w, far = false, hc = null) {
  // the source's band (crown profiles at 49.0–52.44): ~5 px; from the outside in, a bright edge (~0.8), grey
  // (~0.55 -> 0.4), a dark inner edge; a black gap between it and the head
  if (pts.length < 2) return;
  const q = sampleCurve(pts, 6);
  const W = Math.min(w, PX(5.2));
  const n = q.map((p, i) => {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
    let nn = perp(nrm(sub(b, a)));
    if (hc && (nn[0] * (p[0] - hc[0]) + nn[1] * (p[1] - hc[1])) < 0) nn = mul(nn, -1);
    return nn;
  });
  const line = (off, lw, c) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = "butt"; g.lineJoin = "round"; g.beginPath(); q.forEach((p, i) => { const x = p[0] + n[i][0] * off, y = p[1] + n[i][1] * off; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  line(0, W, gv(far ? 0.14 : 0.2));
  line(W * 0.08, W * 0.6, gv(far ? 0.3 : 0.38));
  line(W * 0.3, W * 0.28, gv(far ? 0.5 : 0.82));
}
function drawSlider(g, a, b, w) {
  // the slider: a block from the cup's top up along the band, a little wider than the band, dark keyline, two ribs
  const d = nrm(sub(b, a)), n = perp(d), L = V.len(sub(b, a)), hw = Math.min(w, PX(6.0)) * 0.62;
  const P = [add(a, mul(n, hw)), add(add(a, mul(d, L)), mul(n, hw * 0.85)), add(add(a, mul(d, L)), mul(n, -hw * 0.85)), add(a, mul(n, -hw))];
  const gr = g.createLinearGradient(...add(a, mul(n, -hw)), ...add(a, mul(n, hw)));
  gr.addColorStop(0, gv(0.55)); gr.addColorStop(0.5, gv(0.85)); gr.addColorStop(1, gv(0.62));
  g.fillStyle = gr; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  g.strokeStyle = gv(0.16); g.lineWidth = wmin(PX(1.0)); g.stroke();
  for (const k of [0.3, 0.62]) { const m = add(a, mul(d, L * k)); ink(g, [add(m, mul(n, hw)), add(m, mul(n, -hw))], PX(0.7), gv(0.3, 0.85), { end: 0.6 }); }
}

// ---------------------------------------------------------------- beak: small, pale grey, hooked; when open, a small
// dark mouth under the upper beak and a pale lower mandible
function drawBeakS(g, b) {
  // the source's beak (10x at 48.8–52.52): a small pale hooked upper mandible with a grey keyline; open (every rise
  // and dash drawing), a dark wedge of mouth under it and a thin pale lower mandible with its own keyline — about
  // 16 px tall in all at 52.44
  const { x, y, w = 26, l = 30, rot = 0, turn = 0, open = 0 } = b;
  g.save(); g.translate(x, y); g.rotate(rot);
  const k = clamp(turn, -1, 1), o = clamp(open, 0, 1);
  const tip = [w * 0.06 + k * w * 0.12, l * 0.86];
  const upper = [[-w * 0.46, 0.05 * l], [-w * 0.34, l * 0.42], tip, [w * 0.36, l * 0.4], [w * 0.48, 0.02 * l], [0, -l * 0.1]];
  if (o > 0.02) {
    // the open mouth: dark from under the upper mandible down to the lower one, which hangs a little apart
    const y0 = l * 0.3, y1 = l * (0.86 + 0.5 * o), yl = l * (0.86 + 0.28 * o);
    const mouth = [[-w * 0.44, y0], [w * 0.46, y0 - l * 0.02], [w * 0.36, (y0 + y1) * 0.55], [0.05 * w, y1], [-w * 0.36, (y0 + y1) * 0.55]];
    g.fillStyle = gv(0.12); g.beginPath(); smoothPath(g, mouth, true); g.fill();
    const lower = [[-w * 0.3, yl], [w * 0.3, yl - l * 0.02], [w * 0.2, yl + l * 0.3 * o], [0.04 * w, yl + l * 0.4 * o], [-w * 0.16, yl + l * 0.3 * o]];
    g.fillStyle = gv(0.82); g.beginPath(); smoothPath(g, lower, true); g.fill();
    ink(g, [lower[4], lower[3], lower[2]], PX(0.8), gv(0.3, 0.85), { end: 0.4 });
    ink(g, [...mouth, mouth[0]], PX(0.7), gv(0.2, 0.7), { end: 0.5 });
  }
  const up = blobPath(upper);
  g.save(); g.beginPath(); up(g); g.clip();
  const bg = g.createLinearGradient(-w * 0.5, 0, w * 0.3, l);
  bg.addColorStop(0, gv(0.93)); bg.addColorStop(0.6, gv(0.84)); bg.addColorStop(1, gv(0.7));
  g.fillStyle = bg; g.fillRect(-w, -l, w * 2, l * 3);
  g.restore();
  ink(g, [...upper, upper[0]], PX(0.9), gv(0.32, 0.9), { end: 0.6 });
  g.restore();
}

// ---------------------------------------------------------------- plaster: one small taped strip (top of the head)
function drawPlaster(g, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
  // the source's plaster (51.36 / 52.44 at 8x): a pale strip on the crown just under the band, bowed with the head,
  // a thin grey keyline, a slightly darker pad in the middle
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1);
  const bow = h * 0.5, pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10 - 0.5; pts.push([u * w, bow * (4 * u * u - 1) * 0.5]); }
  const q = pts, n = q.length, top = q.map(([a, b]) => [a, b - h / 2]), bot = q.map(([a, b]) => [a, b + h / 2]).reverse();
  const shape = [...top, ...bot];
  g.beginPath(); smoothPath(g, shape, true);
  g.fillStyle = gv(0.86); g.fill();
  g.strokeStyle = gv(0.38, 0.9); g.lineWidth = wmin(PX(0.9)); g.stroke();
  g.fillStyle = gv(0.74, 0.8); g.beginPath(); g.ellipse(0, -bow * 0.5, w * 0.16, h * 0.3, 0, 0, TAU); g.fill();
  g.restore();
  void n;
}

// ---------------------------------------------------------------- eye: a round white eye, a thin dark ring, a small
// black pupil with a highlight. lid (0..1) closes a pale lid from the top (the blink in the launch)
function drawEyeS(g, e) {
  const { x, y, r, sx = 1, rot = 0, look = [0, 0], pupil = 0.33, lid = 0, ring = OFF("ring") ? 1.35 : 2.0 } = e;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1);
  g.fillStyle = gv(0.975); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
  let pr = r * pupil, px = look[0] * (r - pr) * 0.92, py = look[1] * (r - pr) * 0.92;
  if (e.pp) {
    // a measured pupil (absolute position): into the eye's rotated, x-scaled frame; the pupil itself stays round
    const d = V.rot([e.pp[0] - x, e.pp[1] - y], -rot); px = d[0] / sx; py = d[1]; pr = e.pr;
  }
  g.fillStyle = gv(0.05); g.beginPath(); g.ellipse(px, py, pr / sx, pr, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.97, 0.95); g.beginPath(); g.ellipse(px - pr * 0.32 / sx, py - pr * 0.36, Math.max(pr * 0.3, 0.45 / PPU) / sx, Math.max(pr * 0.3, 0.45 / PPU), 0, 0, TAU); g.fill();
  if (lid > 0.01 && lid < 0.95) {
    const ly = -r + 2 * r * lid;
    g.fillStyle = gv(0.95); g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, ly + r * 1.2);
    ink(g, [[-r, ly + r * 0.18], [-r * 0.5, ly + r * 0.02], [0, ly - r * 0.02], [r * 0.5, ly + r * 0.02], [r, ly + r * 0.18]], PX(1.3), gv(0.2), { end: 0.3 });
  }
  g.restore();
  if (lid >= 0.95) {
    // shut: no white, no ring — one dark curved lid line across the lower middle (52.64)
    g.fillStyle = gv(0.95); g.beginPath(); g.arc(0, 0, r * 1.05, 0, TAU); g.fill();
    ink(g, [[-r * 0.95, r * 0.05], [-r * 0.45, r * 0.32], [0, r * 0.38], [r * 0.45, r * 0.32], [r * 0.95, r * 0.05]], PX(1.5), gv(0.22), { end: 0.25 });
    g.restore(); return;
  }
  // the ring: a constant-width line just inside the outer radius (the path is built under the x-scale, stroked
  // without it)
  const rw = wmin(PX(ring));
  const squint = lid > 0.3;
  if (squint) {
    // a squint (52.56): the ring fades, a lower lid line curves up under the pupil
    ink(g, [[-r * 0.85, r * 0.35], [-r * 0.3, r * 0.62], [r * 0.3, r * 0.62], [r * 0.85, r * 0.35]], PX(1.0), gv(0.3, 0.85), { end: 0.2 });
  }
  g.beginPath(); g.ellipse(0, 0, Math.max(0.1, r - rw / 2 / sx), Math.max(0.1, r - rw / 2), 0, 0, TAU);
  g.restore();
  g.strokeStyle = gv(e.ringV ?? 0.34, (squint ? 0.35 : 1) * (e.ringA ?? 1)); g.lineWidth = rw; g.stroke();
}

// ---------------------------------------------------------------- the owl
// pose: { x, y, s, rot, flip, res, light, head, body, tail, wings[], feet[], eyes, beak, headphones, plaster,
//         order: [...layer names], blur: [dx, dy] (motion smear in frame px) }
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
    const e = { x: q.x, y: q.y, nz, side: sd, r: (E.r ?? 27) * (1 - 0.3 * (1 - nz)), sx: 0.3 + 0.7 * nz };
    // measured eyes (rise keys): [cx, cy, rx, ry, pupil x, pupil y, pupil r] in owl units, outer ring radii
    const F = E.fix && E.fix[sd < 0 ? 0 : 1];
    if (F) Object.assign(e, { x: F[0], y: F[1], r: F[3], sx: F[2] / F[3], nz: Math.min(1, 0.3 + F[2] / F[3]), pp: [F[4], F[5]], pr: F[6] });
    return e;
  });
  const B = P.beak || {};
  const bq = B.pos ? { x: B.pos[0], y: B.pos[1] } : H.P(B.az ?? 0, B.el ?? -0.45, B.lift ?? 1.05);
  const HP = P.headphones || {};
  const hp = HP.on ? headphoneGeom(H, HP) : null;
  if (hp && (HP.farAt || HP.nearAt)) {
    // measured cup centres (the source's cups, 5x grids): move each cup there and bend the band's end to meet it
    // (weight rising over that end's last 45 % of the band; in place: the band's segments share these arrays)
    const N = hp.band.length - 1;
    for (const [c, at] of [[hp.cups.find((c) => c.z < 0), HP.farAt], [hp.cups.find((c) => c.z >= 0), HP.nearAt]]) {
      if (!c || !at) continue;
      const d = sub(at, [c.x, c.y]); c.x = at[0]; c.y = at[1];
      hp.band.forEach((b, i) => { const u = c.sd > 0 ? i / N : 1 - i / N, w = clamp((u - 0.55) / 0.45); const k = w * w * (3 - 2 * w); b.p[0] += d[0] * k; b.p[1] += d[1] * k; });
    }
  }
  // bounding box
  const all = [...H.out];
  if (body) all.push(...body);
  wings.forEach((G) => { all.push(...G.lead); G.feathers.forEach((f) => all.push(f.tip)); });
  if (P.wingPoly) for (const w of P.wingPoly) if (w) all.push(...w);
  if (P.massPoly) all.push(...P.massPoly);
  if (P.silTrace) for (const q of P.silTrace) all.push(...q);
  tail.forEach((f) => all.push(f.tip, f.root));
  (P.feet || []).forEach((f) => { if (f.palm) { const z = f.w * 2; for (const p of [f.palm, f.heel, ...f.toes, ...(f.leg ? [f.leg] : [])]) all.push([p[0] - z, p[1] - z], [p[0] + z, p[1] + z]); return; } const z = (f.size || 15) * 2.4; all.push([f.x - z, f.y - z], [f.x + z, f.y + z]); });
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
  PPU = s * res; setPPU(PPU); SPX = s;
  IG = OFF("ig") ? 1 : lerpN(0.85, 1.45, clamp(P.ink ?? 0.5));
  const plu = { light: Lu };
  const bodyP = body ? blobPath(body) : null;
  const outsideBody = (fn) => {
    // draw fn clipped to everything outside the body silhouette (the head and body are one mass)
    g.save();
    if (bodyP) { g.beginPath(); g.rect(-5000, -5000, 10000, 10000); bodyP(g); g.clip("evenodd"); }
    fn(); g.restore();
  };

  const painted = [];               // wings already painted (their union paths), for keylines over them
  const keyline = (pts, w, soft, dark, clipOut) => {
    const draw = (col) => ink(g, pts, w, col, { end: 0.6, per: 3 });
    if (clipOut) clipOut(() => draw(soft)); else draw(soft);
    for (const u of painted) { g.save(); g.beginPath(); u(g); g.clip(); if (clipOut) clipOut(() => draw(dark)); else draw(dark); g.restore(); }
  };
  const layers = {
    mass() {
      // the source's traced silhouette of this drawing (sil_data.js) as a soft white underlay under everything, so the
      // owl's outline is the source's even where our parts do not reach it; kept off the feet (drawn over it) and,
      // for the rise, the lit mass round the head and body (wing_data.js M)
      const polys0 = P.silTrace || (P.massPoly ? [P.massPoly] : null);
      if (!polys0) return;
      const polys = P.massExtra ? [...polys0, ...P.massExtra] : polys0;
      const s0 = Math.sign(area2(polys[0]));
      const path = (c) => { for (const q0 of polys) { const q = Math.sign(area2(q0)) === s0 ? q0 : [...q0].reverse(); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); c.closePath(); } };
      g.save();
      const feet = (P.feet || []).map((f) => (f.palm ? f.palm : [f.x, f.y]));
      if (feet.length) { g.beginPath(); g.rect(-5000, -5000, 10000, 10000); for (const q of feet) { g.moveTo(q[0] + PX(16), q[1]); g.arc(q[0], q[1], PX(16), 0, TAU, true); } g.clip(); }
      plumage(g, path, { base: KV("massBase", 0.95), shade: KV("massShade", 0.8), depth: PX(12), blur: PX(5), ...plu });
      g.restore();
    },
    farHP() {
      if (!hp) return;
      for (const sg of hp.segs) if (!sg.front) drawBandS(g, sg.pts, HP.w ?? 13, true, [H.x, H.y]);
      if (HP.farCup !== false) for (const c of hp.cups) if (c.z < -0.02) drawCupS(g, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H.roll, open: c.open, side: c.side, far: true });
    },
    tail() {
      tail.slice().reverse().forEach((f) => {
        const sh = leaf(f);
        plumage(g, blobPath(sh), { base: 0.97, shade: 0.82, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
        ink(g, sh.slice(1, 6), PX(0.85), gv(KEY, 0.85), { end: 0.15 });
      });
    },
    body() {
      if (!body) return;
      const b = P.body;
      const at = (u, v) => add([b.x || 0, b.y || 0], V.rot([b.a * u, b.b * v], b.rot));
      plumage(g, bodyP, { base: 0.975, shade: KV("bodyShade", 0.8), depth: b.a * 0.26, blur: b.a * 0.1, ...plu });
      // (pass 4) no grey blobs on the belly and flanks: the source's body is white with line texture (fluff), shaded
      // only at its rim — the three soft shades pass 3 put low on the belly and on both flanks measured darker than
      // the source in every phase (σ1.5 owl error 17.26 -> 16.66 without them over 48.8–53.2)
      if (dl > 0.25) {
        // faint feather texture: short soft grey strokes along the flow, mostly low on the belly
        const r = rng(19);
        g.save(); g.beginPath(); bodyP(g); g.clip();
        for (let i = 0; i < 90; i++) {
          const a = r() * TAU, d = Math.sqrt(r());
          const q = at(Math.cos(a) * d, Math.sin(a) * d);
          const lower = Math.sin(a) * d;
          if (lower < -0.1 && r() < 0.8) continue;
          flick(g, q, nrm([0.25 * (r() - 0.5), 1]), b.a * 0.09 * (0.6 + 0.8 * r()), PX(0.8), gv(0.56, 0.32 + 0.25 * Math.max(0, lower)), 0.15);
        }
        // (fix pass 1) the source's pencil texture: a few sparse, irregular soft strokes (not rows of scallops), mostly
        // on the lower belly and the flanks
        const r2 = rng(29);
        for (let i = 0; i < 22; i++) {
          const a = r2() * TAU, d = 0.35 + 0.6 * Math.sqrt(r2());
          const low = Math.sin(a) * d;
          if (low < -0.2 && r2() < 0.75) continue;
          const c = at(Math.cos(a) * d * 0.9, Math.sin(a) * d * 0.85 + 0.08);
          const L = PX(4 + 6 * r2()), ang = (r2() - 0.5) * 1.2 + (Math.cos(a) > 0 ? 0.35 : -0.35), dir = [Math.cos(ang), Math.sin(ang)];
          const bend = mul(perp(dir), L * (0.12 + 0.2 * r2()) * (r2() < 0.5 ? 1 : -1));
          const p0 = add(c, mul(dir, -L / 2)), p2 = add(c, mul(dir, L / 2)), p1 = add(c, bend);
          ink(g, [p0, p1, p2], PX(0.6 + 0.4 * r2()), gv(0.7 + 0.1 * r2(), 0.55 + 0.3 * r2()), { end: 0.15, bias: 0.4 });
        }
        g.restore();
      }
      if (dl > 0.3 && !OFF("fluff")) fluff(g, bodyP, b, 71);
      // (pass 4) lighter: inside the silhouette (right of the head, 51–52.4) the source shows no body outline
      keyline([...body, body[0]], PX(1.15), gv(0.72, 0.6), gv(0.4, 0.9), null);
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
          ink(g, sh.slice(0, 4), PX(0.8), gv(KEY, 0.8), { end: 0.2 });
        }
      }
      plumage(g, hpth, { base: 0.975, shade: KV("headShade", 0.82), depth: H.ry * 0.3, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
      if (hp) {
        // the cup's soft shadow on the side of the head
        const nc = hp.cups.find((c) => c.z >= 0);
        if (nc && !OFF("cupshadow")) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.5, nc.y + 4, (HP.r ?? 45) * 0.45, (HP.r ?? 45) * 1.1, H.roll, 0, TAU), 0.72, 0.4, 12);
      }
      // the head outline: a soft rim, only where the head is not over the body
      keyline([...H.out, H.out[0]], PX(1.15), gv(RIM, 0.8), gv(0.36, 0.9), outsideBody);
      // facial disc (source 49.0–52.44 at 8x): a V between the eyes a little above them, from it an arc up and over
      // each eye (the brows, the darkest part), round the outside of the eye and down to the cheek (fading)
      if ((P.disc ?? 1)) {
        const up = V.rot([0, -1], H.roll), rg = V.rot([1, 0], H.roll);
        const [eL, eR] = eyes, Rm = (eL.r + eR.r) / 2;
        // (fix pass 1) the source's disc lines are faint and high: a soft arc about 1.6 eye radii round each eye's
        // outer side, rising above the eyes to a shallow meeting point well above them — alarmed, not a frown
        const vp = add(V.mix([eL.x, eL.y], [eR.x, eR.y], 0.5), mul(up, Rm * 1.62));
        const at = (e, a, b) => add([e.x, e.y], add(mul(rg, e.side * a * e.r * e.sx), mul(up, b * e.r)));
        for (const e of eyes) {
          if (e.nz < 0.2) continue;
          const brow = [vp, at(e, 0.3, 1.85), at(e, 1.0, 1.62), at(e, 1.55, 1.0)];
          const side = [at(e, 1.55, 1.0), at(e, 1.68, 0.1), at(e, 1.5, -0.9), at(e, 1.0, -1.6)];
          if (dl > 0.3) {
            g.save(); g.beginPath(); hpth(g); g.clip();
            g.filter = `blur(${Math.max(0.5, PX(1.4) * PPU).toFixed(2)}px)`;
            const o = sampleCurve([...brow, ...side.slice(1)], 5); g.strokeStyle = gv(0.84, 0.4); g.lineWidth = PX(3); g.lineCap = "round";
            g.beginPath(); o.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
            g.filter = "none"; g.restore();
          }
          ink(g, brow, PX(0.8), gv(0.62, 0.85), { end: 0.2, bias: 0.5 });
          ink(g, side, PX(0.8), gv(0.64, 0.75), { end: 0.1, bias: 0.2 });
          // (pass 4) the source's disc line is a soft ~3 px grey line (~0.72 pre-grade), not a hairline
          if (dl > 0.3 && !OFF("disc")) {
            g.save(); g.beginPath(); hpth(g); g.clip();
            g.filter = `blur(${Math.max(1.0, PX(0.9) * PPU).toFixed(2)}px)`;
            ink(g, [...brow, ...side.slice(1)], PX(2.2), gv(0.7, clamp(0.6 * IG, 0, 1)), { end: 0.15, bias: 0.4, per: 4 });
            g.filter = "none"; g.restore();
          }
        }
        // (pass 4) the chin: the disc's lower edge, a soft grey arc under both eyes (source 51.68 / 52.44: ~2.3 eye
        // radii below the eye centres, from under the near eye's outer side to under the far eye)
        if (dl > 0.3 && eL.nz >= 0.2 && !P.dashFace && !OFF("chin")) {
          const e0 = eL.x < eR.x ? eL : eR, e1 = e0 === eL ? eR : eL;
          const dn = mul(up, -1);
          const a0 = add(add([e0.x, e0.y], mul(rg, -1.25 * e0.r * e0.sx)), mul(dn, 1.55 * e0.r));
          const a1 = add(add([e0.x, e0.y], mul(rg, 0.2 * e0.r)), mul(dn, 2.25 * e0.r));
          const a2 = add(add(V.mix([e0.x, e0.y], [e1.x, e1.y], 0.62), mul(rg, 0.0)), mul(dn, 2.35 * Rm));
          const a3 = add(add([e1.x, e1.y], mul(rg, 1.1 * e1.r * e1.sx)), mul(dn, 1.7 * e1.r));
          g.save(); g.beginPath(); hpth(g); g.clip();
          g.filter = `blur(${Math.max(1.0, PX(1.0) * PPU).toFixed(2)}px)`;
          ink(g, [a0, a1, a2, a3], PX(2.6), gv(0.7, 0.75), { end: 0.2, bias: 0.45 });
          g.filter = "none"; g.restore();
        }
      }
      // (pass 4) the chest fluff carries on up under the face (the head's lower part, below the disc)
      if (dl > 0.3 && !OFF("fluff")) fluff(g, hpth, { x: H.x, y: H.y, a: H.rx, b: H.ry, rot: H.roll }, 83, (u, v) => v > 0.42 + 0.25 * u * u);
      for (const e of eyes) {
        if (e.nz < 0.12) continue;
        const ov = { ...(E.over || {}), ...(e.side < 0 ? E.left : E.right) };
        const lk = ov.look || E.look || [0, 0];
        drawEyeS(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, look: lk, pupil: ov.pupil ?? 0.33, lid: ov.lid ?? 0, pp: e.pp, pr: e.pr, ringA: ov.ringA, ringV: OFF("ringv") ? 0.34 : P.ringV });
      }
      drawBeakS(g, { x: bq.x, y: bq.y, w: (B.w ?? 26) * 1.0, l: (B.l ?? 30) * 0.86, rot: H.roll + (B.rot ?? 0), turn: B.turn ?? H.yaw * 1.5, open: B.open ?? 0 });
      if (P.plasterAt) { const [px, py, pw, ph, pr] = P.plasterAt; drawPlaster(g, { x: px, y: py, w: pw, h: ph, rot: pr }); }
      else if (P.plaster) { const pl = P.plaster, q = H.P(pl.az ?? 0, pl.el ?? 0.9, 1.0); if (q.nz > 0.0) drawPlaster(g, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H.yaw - (pl.az ?? 0))) }); }
      if (P.freckles !== false) {
        for (const e of eyes) { if (e.nz < 0.5 || e.side > 0) continue; const c = add([e.x, e.y], V.rot([-e.side * e.r * 0.2 * e.sx, e.r * 1.45], H.roll)); g.fillStyle = gv(0.5, 0.7); g.beginPath(); g.arc(c[0], c[1], Math.max(PX(0.9), 0.5 / PPU), 0, TAU); g.fill(); }
      }
    },
    nearHP() {
      if (!hp) return;
      for (const sg of hp.segs) if (sg.front) drawBandS(g, sg.pts, HP.w ?? 13, false, [H.x, H.y]);
      for (const c of hp.cups) if (c.z >= -0.02) {
        const R = HP.r ?? 45;
        // the slider: from the top of the cup up along the band
        const b = hp.band, end = V.len(sub(b[0].p, [c.x, c.y])) < V.len(sub(b[b.length - 1].p, [c.x, c.y])) ? 0 : b.length - 1;
        // (pass 4) the slider stands on the cup's own top (the dash's face-on cup is turned by cupRot)
        const top = add([c.x, c.y], V.rot([0, -R * 0.95], H.roll + (HP.cupRot ?? 0))), up = b[end === 0 ? 5 : b.length - 6].p;
        drawSlider(g, top, V.mix(top, up, 0.9), HP.w ?? 13);
        drawCupS(g, { x: c.x, y: c.y, r: R, rot: H.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side, face: HP.face ?? 0, faceW: HP.faceW ?? 1, ink: OFF("cupink") ? 1 : (P.ink ?? 1) });
      }
    },
  };
  const cutPath = (c) => { if (body) smoothPath(c, body.map((p) => add(p, mul(nrm(sub(p, [P.body.x || 0, P.body.y || 0])), PX(3)))), true); smoothPath(c, H.out.map((p) => add(p, mul(nrm(sub(p, [H.x, H.y])), PX(3)))), true); };
  // the body and head grown by 7 px: feather lines are not drawn from outline notches inside them (the tracer's cut)
  const cutPolys = [...(body ? [body.map((p) => add(p, mul(nrm(sub(p, [P.body.x || 0, P.body.y || 0])), PX(7))))] : []), H.out.map((p) => add(p, mul(nrm(sub(p, [H.x, H.y])), PX(7))))];
  wings.forEach((G, i) => { G.cut = cutPath; G.cutPolys = cutPolys; G.tone = P.wingTone ? P.wingTone[i] : 0; });
  wings.forEach((G, i) => { layers["wing:" + i] = () => { paintWing(g, G, plu, dl, i + 1, P.wingPoly ? P.wingPoly[i] : null); painted.push(G.union); }; });
  (P.feet || []).forEach((f, i) => { layers["foot:" + i] = () => (f.palm ? drawFootT(g, f) : drawFootS(g, f)); });
  const order = (P.massPoly || P.silTrace) ? ["mass", ...(P.order || ORDER), "keyline"] : (P.order || ORDER);
  // the source's dark keyline round the whole owl (it shows where the owl is over the lit page: books, speaker);
  // along the traced silhouette, kept off the near headphone cup and the feet
  layers.keyline = () => {
    const polys = P.silTrace;
    if (!polys) return;
    g.save();
    g.beginPath(); g.rect(-5000, -5000, 10000, 10000);
    if (hp) for (const c of hp.cups) if (c.z >= -0.02) { const R = (HP.r ?? 45) * 1.15; g.moveTo(c.x + R, c.y); g.ellipse(c.x, c.y, R, R, 0, 0, TAU, true); }
    for (const f of P.feet || []) { const q = f.palm || [f.x, f.y], R = PX(15); g.moveTo(q[0] + R, q[1]); g.arc(q[0], q[1], R, 0, TAU, true); }
    g.clip();
    // (pass 4) not inside the traced wings (the silhouette's slits there are filled; their edges get no keyline):
    // along a wing's outline only the outer half of the line shows, so it is drawn wider
    const WP = (P.wingPoly || []).filter(Boolean);
    if (WP.length) { g.beginPath(); g.rect(-5000, -5000, 10000, 10000); for (const w of WP) { const q = Math.sign(area2(w)) > 0 ? [...w].reverse() : w; g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]); g.closePath(); } g.clip("evenodd"); }
    // (the traced polygons are stroked whole: where two of them meet inside the owl, the tracer split the mass along a
    // dark line of the source — the wing's edge over the body — and the stroke stands for it)
    for (const q of polys) ink(g, [...q, q[0]], PX(WP.length ? 1.9 : 1.3), gv(0.3, 0.85), { end: 0.9, per: 2 });
    g.restore();
  };
  const only = (globalThis.__S17 || {}).only;      // measurement hook (lab only): e.g. ["body", "head"]
  // the source's own silhouette of this drawing clips the body, head, wings, tail (not the headphones or the feet)
  const sil = P.silPoly, clipped = (name) => sil && (name === "body" || name === "head" || name === "tail" || name === "mass" || name.startsWith("wing"));
  // (all subpaths wound the same way, so the nonzero clip is their union)
  const silO = sil ? sil.map((q) => (Math.sign(area2(q)) === Math.sign(area2(sil[0])) ? q : [...q].reverse())) : null;
  const silPath = (c) => { for (const q of silO) { c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); c.closePath(); } };
  for (const name of order) {
    if (!layers[name] || (only && !only.includes(name))) continue;
    if (clipped(name)) { g.save(); g.beginPath(); silPath(g); g.clip(); layers[name](); g.restore(); } else layers[name]();
  }
  PPU = 1; setPPU(1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF, H, eyes, bq, cups: hp ? hp.cups : [] };
}

let SCR = null, SCR2 = null;
const SOFT_PX = 0.35;
// Draw into ctx (frame coordinates). blur: [dx, dy] frame px — a motion smear: shifted copies averaged additively
// in an offscreen canvas (weights sum to 1, so the bird stays opaque), then drawn over.
export function drawOwlS17(ctx, P) {
  if (!SCR) SCR = document.createElement("canvas");
  const L = owlS17Layer(P, SCR);
  const bk = (globalThis.__S17 || {}).blurK;           // lab-only: scale the motion smear (never set in the film)
  if (bk != null && P.blur) P = { ...P, blur: [P.blur[0] * bk, P.blur[1] * bk] };
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
    ctx.save(); ctx.filter = `blur(${SOFT_PX}px)`;
    ctx.drawImage(SCR2, L.x - pad / sx, L.y - pad / sx, w / sx, h / sx);
    ctx.restore();
  } else {
    // the source owl is a little soft: a slight blur
    ctx.save(); ctx.filter = `blur(${SOFT_PX}px)`;
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    ctx.restore();
  }
  return L;
}
