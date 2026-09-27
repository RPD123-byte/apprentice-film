// s02: the owl on the cartons and in flight, drawn with the B&W owl kit (src/lib/owlInk.js) plus this shot's own inking.
//   sitting (hold frame): the kit's `perch`, placed on its measured eyes (s 0.68), glossy eyes; blink read frame by
//   frame (380 heavy lids, 381-389 shut, 390-391 heavy, 392 open again); crouch 397-404 (measured head track);
//   take-off 398-406: wings open from behind the shoulders (measured right-wing tips, mirrored); flight 405-477: the
//   kit's `flyFront` with each wing's tip set per frame from the measured silhouette extremes (owltrack.js), root /
//   scale / bank on the measured track (re-fitted this pass on the source's face: fix1h-lab/facetrack.py).
// Fix pass 1 (the reviewer's owl defects), all in this file:
//   - dark edge-on headphone cups (a dark ribbed cushion + a dark grey shell with a light rim line), a heavier band
//   - a 2 px ink contour round the body and head (the source's owl is inked, not a soft cut-out), and a dark outline
//     round the whole silhouette (the alpha of the layer dilated, under it)
//   - chest scallops and side shading (sitting and flying)
//   - flight: white dangling talons ~40 px under the belly; the body 16 px narrower and 9 px right (fitted on 446/462);
//     the wings drawn in their own pass so only they carry the measured motion softness (the body and head stay crisp)
//   - sitting: feet moved in (measured talons 1044-1079 / 1109-1139), dark hooked claws, smaller eyes set higher
//     (measured 1051/1122, y 191, r 17-19 px), worried brow arcs, a rhombus beak
import { owlLayer, owlPose, POSES, bodyOutline, outsideRun, headGeom, LINE } from "../../../lib/owlInk.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";
import { TIPS, TIPS_F0, OWL_ROOT, OWL_F0, WLIFT, WLIFT_F0, ROOT_FIX, ROOT_FIX_F0 } from "./owltrack.js";
import { applyTone } from "./tone.js";
import { OWL_TONE } from "./tonedata.js";
import { wing2Geom, paintWing2, wing2Points } from "./wing2.js";

// sitting placement in hold-frame px: silhouette IoU fit against the hold average (snapshots/s02-r3-lab/owlfit*.py)
export const SIT = { x: 1090, y: 272, s: 0.68 };
// perch re-proportioned to this frame's silhouette (IoU 0.86 -> 0.91 against the hold average): a lower, flatter head,
// a body fuller at the shoulders and narrower at the bottom
const SIT_HEAD = { y: -150, ry: 88, rx: 116 }, SIT_BODY = { b: 130, a: 100, egg: 0.12 };
// crouch before the jump, head track (px, hold frame), frames 397..404
const CROUCH = { 397: 10, 398: 15, 399: 19, 400: 21, 401: 19, 402: 19, 403: 13, 404: 2 };
// talons over the lid edge: measured toe spans 1044-1079 and 1109-1139 (hold average, 2.6x crop) -> units at s 0.68
const SIT_FEET = [{ x: -40, y: 84, rot: 0.08, size: 30, mode: "grip", toes: 3, spread: 0.55, claw: "dark", front: true, seed: 2 }, { x: 53, y: 84, rot: -0.08, size: 30, mode: "grip", toes: 3, spread: 0.55, claw: "dark", front: true, seed: 5 }];
export function sitEyes(f) {
  if (f === 380 || f === 390) return { state: "tired", lid: 0.62, droop: 0.05, iris: 0.8 };
  if (f === 400) return { state: "tired", lid: 0.62, droop: 0.05 };
  if (f === 391) return { state: "tired", lid: 0.5, droop: 0.05, iris: 0.8 };
  // 392: open again, the upper lids only ~10 % lowered (source 15.68 s; fix pass 2: the review read f392 as open)
  if (f === 392) return { state: "glossy", lid10: true };
  if ((f >= 381 && f <= 389) || f >= 401) return { state: "shut" };
  return { state: "glossy" };
}
const v2 = (a, b) => [a, b];
function wingFromTip(S, tip, side, k, base, arch = 0.22) {
  // T on the S->tip line (the rendered feathers overshoot T by ~20%), the wrist arched above the line, trail rotated with the wing
  const T = [S[0] + (tip[0] - S[0]) * k, S[1] + (tip[1] - S[1]) * k];
  const d = [T[0] - S[0], T[1] - S[1]], L = Math.hypot(d[0], d[1]) || 1, e = [d[0] / L, d[1] / L];
  const nUp = side < 0 ? [-e[1], e[0]] : [e[1], -e[0]];
  const Wr = [S[0] + d[0] * 0.55 + nUp[0] * L * arch, S[1] + d[1] * 0.55 + nUp[1] * L * arch];
  const th = Math.atan2(d[1], d[0]), th0 = Math.atan2(base.T[1] - base.S[1], base.T[0] - base.S[0]);
  const da = th - th0 + side * -(WT.tr || 0), c = Math.cos(da), s = Math.sin(da), tr = base.trail;
  return { ...base, S, Wr, T, trail: [tr[0] * c - tr[1] * s, tr[0] * s + tr[1] * c] };
}
// fix pass 2: the wing drawn by wing2.js (long primaries under a smooth covert band). The spec keeps the measured tip:
// the geometry is built, then its span (the outline point farthest from the shoulder) is scaled onto |tip - S|.
// cf = chord factor on the kit's secondary length (0.73 len); the review measured the source's chord ~1.4-1.5x the
// first pass's
function wing2At(S, tip, side, base, arch, cf, seed, pk = 1) {
  const d = [tip[0] - S[0], tip[1] - S[1]], D = Math.hypot(d[0], d[1]) || 1;
  const c = 0.73 * base.len * cf;
  let k = 0.78, G = null;
  for (let it = 0; it < 4; it++) {
    const W = wingFromTip(S, tip, side, k, base, arch);
    G = wing2Geom({ S, Wr: W.Wr, T: W.T, trail: W.trail, c, n: 6, m: 6, spread: base.spread ?? 0.95, seed, priK: pk });
    let m = 0; for (const p of wing2Points(G)) m = Math.max(m, Math.hypot(p[0] - S[0], p[1] - S[1]));
    k *= Math.max(0.5, Math.min(1.5, D / m));
  }
  return G;
}
const tipsAt = (f) => { const i = Math.max(0, Math.min(TIPS.length / 4 - 1, f - TIPS_F0)); return TIPS.slice(4 * i, 4 * i + 4); };
// flight wing tuning (fitted by silhouette IoU on flight frames, snapshots/s02-r3-lab/flyfit.py). kL was 0.79; the
// reviewer measured the left tip 30-45 px too far out (f428 x 967 vs 1011, f462 1193 vs 1222): kL 0.72 pulls it in ~35 px
export const WT = { sy: 0, ty: 0, kL: 0.72, kR: 0.84, len: 1, arch: 0.22, tr: 0, tyL: null, tyR: null };
// the root track, plus this pass's correction from the source's face track (owltrack.js ROOT_FIX: dx, dy, dbank)
const rootOld = (f) => { const i = Math.max(0, Math.min(OWL_ROOT.length / 4 - 1, f - OWL_F0)); return OWL_ROOT.slice(4 * i, 4 * i + 4); };
export const rootAt = (f) => {
  const r = rootOld(f), k = f - ROOT_FIX_F0;
  if (k >= 0 && k < ROOT_FIX.length / 3) { r[0] += ROOT_FIX[3 * k]; r[1] += ROOT_FIX[3 * k + 1]; r[3] += ROOT_FIX[3 * k + 2]; }
  return r;
};
// the measured wing tips are frame positions expressed in units of the OLD root: re-express them for the corrected root
function tipFix(f, u) {
  const [x0, y0, s, b0] = rootOld(f), [x1, y1, , b1] = rootAt(f);
  const fx = x0 + s * (Math.cos(b0) * u[0] - Math.sin(b0) * u[1]), fy = y0 + s * (Math.sin(b0) * u[0] + Math.cos(b0) * u[1]);
  const dx = (fx - x1) / s, dy = (fy - y1) / s;
  return [Math.cos(b1) * dx + Math.sin(b1) * dy, -Math.sin(b1) * dx + Math.cos(b1) * dy];
}

// ---- this shot's inking on top of the kit's drawing (owl units; ppu = frame px per unit)
function cupDark(g, c, r, ppu) {
  // an edge-on cup covering the kit's (which spans -0.32r..0.6r across): the ribbed cushion toward the head, the shell
  // outside it (source 462, 3.5x crop s462cups: cushion ~27 px, shell ~31 px, ~110 px tall at r 58)
  const s = c.side, lw = 2.2 / ppu;
  g.save(); g.translate(c.x, c.y);
  const shell = (q) => q.ellipse(s * r * 0.3, 0, r * 0.31, r * 0.93, 0, 0, 2 * Math.PI);
  const gr = g.createLinearGradient(0, 0, s * r * 0.62, 0);
  // (fix pass 1: darker shell, the source's cups read near black with a bright rim line, not a grey barrel)
  gr.addColorStop(0, "rgb(26,26,26)"); gr.addColorStop(0.45, "rgb(70,70,70)"); gr.addColorStop(0.7, "rgb(44,44,44)"); gr.addColorStop(1, "rgb(22,22,22)");
  g.fillStyle = gr; g.beginPath(); shell(g); g.fill();
  g.strokeStyle = LINE; g.lineWidth = lw; g.beginPath(); shell(g); g.stroke();
  g.strokeStyle = "rgba(210,210,210,0.7)"; g.lineWidth = 1.3 / ppu; g.beginPath();
  if (s > 0) g.ellipse(s * r * 0.33, 0, r * 0.2, r * 0.8, 0, -1.25, 1.25); else g.ellipse(s * r * 0.33, 0, r * 0.2, r * 0.8, 0, Math.PI - 1.25, Math.PI + 1.25);
  g.stroke();
  const cush = (q) => q.ellipse(-s * r * 0.1, 0, r * 0.24, r * 0.98, 0, 0, 2 * Math.PI);
  g.fillStyle = "rgb(20,20,20)"; g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  for (let k = -6; k <= 6; k++) {
    const y = k / 6.5 * r * 0.9, hw = Math.sqrt(Math.max(0, 1 - (y / (r * 0.98)) ** 2)) * r * 0.19;
    g.strokeStyle = `rgba(125,125,125,${0.32 + 0.16 * ((k + 6) % 2)})`; g.lineWidth = 1.3 / ppu;
    g.beginPath(); g.moveTo(-s * r * 0.1 - hw, y - 1 / ppu); g.quadraticCurveTo(-s * r * 0.1, y + 2.5 / ppu, -s * r * 0.1 + hw, y - 1 / ppu); g.stroke();
  }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = lw; g.beginPath(); cush(g); g.stroke();
  g.restore();
}
function strokePts(g, pts, w, col, closed = false) {
  if (pts.length < 2) return;
  g.beginPath(); smoothPath(g, pts, closed, 0.5); g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
}
// scallops: rows of small down-facing arcs over a region (feather tips on the chest / folded wings)
function scallops(g, rows, ppu, col) {
  g.strokeStyle = col; g.lineWidth = 1.3 / ppu; g.lineCap = "round";
  for (const [x0, x1, y, r] of rows) for (let x = x0; x <= x1; x += r * 1.7) { g.beginPath(); g.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
}
// the flying owl's feet (source 446 / 462, 3x crops): a short white feathered leg out of the belly, three white toes
// hanging together, a thin dark outline and small dark hooked claws; ~45 units below the belly (owl units)
const FLY_FEET = [{ x: -78, y: 80, rot: 0.2, seed: 2 }, { x: 58, y: 86, rot: -0.1, seed: 5 }];
function dangleFoot(g, F, ppu) {
  g.save(); g.translate(F.x, F.y); g.rotate(F.rot);
  const line = "rgba(28,28,28,0.9)", lw = 1.5 / ppu;
  // leg: a short rounded feathered shaft out of the belly
  g.beginPath(); g.ellipse(0, 8, 19, 26, 0, 0, 2 * Math.PI); g.fillStyle = "rgb(238,238,238)"; g.fill();
  g.strokeStyle = line; g.lineWidth = lw;
  g.beginPath(); g.moveTo(-19, 4); g.quadraticCurveTo(-20, 20, -13, 32); g.moveTo(19, 4); g.quadraticCurveTo(20, 20, 13, 32); g.stroke();
  // three toes fanning out and down, each a tapered white pad with a crease, ending in a dark hook curling inward
  for (let i = 0; i < 3; i++) {
    const f0 = i - 1, a = Math.PI / 2 - f0 * 0.42, L = 40 - Math.abs(f0) * 6, x0 = f0 * 12, y0 = 26, c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c;
    const P = (u, w) => [x0 + c * L * u + nx * w, y0 + sn * L * u + ny * w];
    const pts = [P(0, -7), P(0.5, -5.5), P(1, -3.8), P(1, 3.8), P(0.5, 5.5), P(0, 7)];
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); g.quadraticCurveTo(pts[4][0], pts[4][1], pts[5][0], pts[5][1]); g.closePath();
    g.fillStyle = "rgb(242,242,242)"; g.fill(); g.strokeStyle = line; g.lineWidth = lw; g.stroke();
    const m = P(0.55, -4.5), m2 = P(0.55, 4.5); g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(m2[0], m2[1]); g.lineWidth = 1 / ppu; g.stroke();
    // claw: dark, curling back toward the foot's middle (outer toes) or straight under (middle toe)
    const e = P(1, 0), hk = f0 === 0 ? 1 : -f0, t = P(1.28, hk * 7), base1 = P(1, -3.8), base2 = P(1, 3.8);
    g.beginPath(); g.moveTo(base1[0], base1[1]); g.quadraticCurveTo(P(1.2, -2)[0], P(1.2, -2)[1], t[0], t[1]); g.quadraticCurveTo(P(1.12, 3)[0], P(1.12, 3)[1], base2[0], base2[1]); g.closePath();
    g.fillStyle = "rgb(26,26,26)"; g.fill();
  }
  g.restore();
}
// fix pass 2 (review low x2): the tuft as ONE curved plume (the kit's spiky 3-point tuft read as a crown): a leaf rising
// from the head's upper right and curling over to the right, two smaller points along its outer edge, soft grey edges
function plume(g, H, phi, size, lean, ppu) {
  const A = H.at(phi), n = A.n, c = Math.cos(lean), s = Math.sin(lean), d = [n[0] * c - n[1] * s, n[0] * s + n[1] * c], rt = [-d[1], d[0]];
  const p0 = [A.p[0] - n[0] * 8, A.p[1] - n[1] * 8];
  const P = (u, off = 0) => { const curl = 0.32 * u * u * size; return [p0[0] + d[0] * size * u + rt[0] * (curl + off), p0[1] + d[1] * size * u + rt[1] * (curl + off)]; };
  const wl = (u) => size * 0.2 * Math.pow(1 - u, 0.85);
  const L = [], R = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; L.push(P(u, -wl(u))); R.push(P(u, wl(u))); }
  const sub = [[0.28, 0.5, 0.5], [0.52, 0.36, 0.62]];   // [u, length, angle toward the outside]
  const shape = (q) => { q.moveTo(L[0][0], L[0][1]); for (const p of L) q.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) q.lineTo(R[i][0], R[i][1]); q.closePath(); };
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (const [u, l, ang] of sub) {
    const b = P(u, wl(u) * 0.6), dd = [d[0] * Math.cos(ang) + rt[0] * Math.sin(ang), d[1] * Math.cos(ang) + rt[1] * Math.sin(ang)], t = [b[0] + dd[0] * size * l, b[1] + dd[1] * size * l];
    const m = [(b[0] + t[0]) / 2 + rt[0] * size * 0.05, (b[1] + t[1]) / 2 + rt[1] * size * 0.05], w = size * 0.1;
    g.beginPath(); g.moveTo(b[0] - d[0] * w, b[1] - d[1] * w); g.quadraticCurveTo(m[0] - rt[0] * w * 0.4, m[1] - rt[1] * w * 0.4, t[0], t[1]); g.quadraticCurveTo(m[0] + rt[0] * w, m[1] + rt[1] * w, b[0] + d[0] * w, b[1] + d[1] * w); g.closePath();
    g.fillStyle = "rgb(236,236,236)"; g.fill(); g.strokeStyle = "rgba(70,70,70,0.6)"; g.lineWidth = 1.1 / ppu; g.stroke();
  }
  g.beginPath(); shape(g); g.fillStyle = "rgb(242,242,242)"; g.fill();
  g.beginPath(); for (let i = 3; i < L.length; i++) (i === 3 ? g.moveTo : g.lineTo).call(g, L[i][0], L[i][1]); for (let i = R.length - 1; i >= 3; i--) g.lineTo(R[i][0], R[i][1]);
  g.strokeStyle = "rgba(70,70,70,0.65)"; g.lineWidth = 1.2 / ppu; g.stroke();
  for (const off of [-0.25, 0.3]) { g.beginPath(); for (let i = 2; i <= 11; i++) { const u = i / 14, q = P(u, off * wl(u)); (i === 2 ? g.moveTo : g.lineTo).call(g, q[0], q[1]); } g.strokeStyle = "rgba(120,120,120,0.45)"; g.lineWidth = 0.9 / ppu; g.stroke(); }
  g.restore();
}
// chest feathers: rows of faint small V / arc marks across the chest (sitting owl, source hold average)
function chestMarks(g, bx, by, bw, bh, ppu, rows = 4) {
  // soft V marks, staggered and jittered (seeded), fading toward the sides
  let sd = 7; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  for (let k = 0; k < rows; k++) {
    const y = by - bh * 0.05 + k * bh * 0.19, half = bw * (0.58 - 0.06 * k), n = 6 - (k > 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (k % 2) * 0.5 - 0.25) / n, x = bx - half + u * 2 * half + (r() - 0.5) * bw * 0.06, yy = y + (r() - 0.5) * bh * 0.05, w = bw * (0.07 + r() * 0.04);
      g.strokeStyle = `rgba(140,140,140,${(0.3 * (1 - 0.5 * Math.abs(u - 0.5) * 2)).toFixed(3)})`; g.lineWidth = (1.0 + r() * 0.5) / ppu;
      g.beginPath(); g.moveTo(x - w, yy - w * 0.55); g.lineTo(x, yy + w * 0.2); g.lineTo(x + w, yy - w * 0.55); g.stroke();
    }
  }
  g.restore();
}
function inkExtra(pose, mode, feet = FLY_FEET, tuft = null) {
  return (g, geo) => {
    const ppu = Math.hypot(g.getTransform().a, g.getTransform().b);
    const H = geo.H, body = bodyOutline(pose.body);
    // side and belly shading of the body (outside the head), multiplied, soft
    g.save();
    g.beginPath(); smoothPath(g, body, true, 0.5); g.clip();
    g.beginPath(); g.rect(-400, -400, 800, 800); smoothPath(g, H.out, true, 0.5); g.clip("evenodd");
    g.globalCompositeOperation = "multiply";
    const bx = pose.body.x || 0, by = pose.body.y || 0, bw = pose.body.b, bh = pose.body.a;
    const gr = g.createRadialGradient(bx - bw * 0.15, by - bh * 0.25, bw * 0.45, bx, by, bw * 1.1);
    gr.addColorStop(0, "rgb(255,255,255)"); gr.addColorStop(0.7, "rgb(235,235,235)"); gr.addColorStop(1, "rgb(185,185,185)");
    g.fillStyle = gr; g.fillRect(bx - bw * 1.3, by - bh * 1.3, bw * 2.6, bh * 2.6);
    g.globalCompositeOperation = "source-over";
    // chest scallops on the lower sides
    const sc = [];
    for (let k = 0; k < 2; k++) {
      const y = by + bh * (0.3 + k * 0.22), half = bw * (0.8 - k * 0.14);
      sc.push([bx - half, bx - half + bw * 0.28, y, 6], [bx + half - bw * 0.28, bx + half, y, 6]);
    }
    scallops(g, sc, ppu, "rgba(110,110,110,0.35)");
    g.restore();
    // ink contours: the body where it is not buried in the head, the head where it is not buried in the body
    const bo = outsideRun(body, H.out), ho = outsideRun(H.out, body);
    strokePts(g, bo.pts, 1.7 / ppu, "rgba(30,30,30,0.8)", bo.closed);
    strokePts(g, ho.pts, 1.6 / ppu, "rgba(30,30,30,0.75)", ho.closed);
    // dark cups over the kit's
    if (geo.hp) for (const c of geo.hp.cups) cupDark(g, c, pose.headphones.r ?? 50, ppu);
    if (mode === "fly") for (const F of feet) dangleFoot(g, F, ppu);
    if (tuft) plume(g, H, tuft.at, tuft.size, tuft.lean, ppu);
    if (mode === "sit") chestMarks(g, bx, by + bh * 0.15, bw, bh, ppu);
    if (mode === "sit" && pose.eyes && pose.eyes.state === "tired" && (pose.eyes.lid ?? 0.43) >= 0.4) {
      // under the heavy lids the source's irises read near black (380, 390, 391): darken what the kit's lid leaves
      const E = pose.eyes, lid = E.lid ?? 0.43, droop = E.droop ?? 0, ir = E.iris ?? 0.76;
      for (const e of geo.eyes) {
        const outer = e.side > 0 ? 1 : -1, ly = (x) => -1 + 2 * lid + droop * (x * outer + 1) * 0.5 - 0.06 * (1 - x * x);
        g.save(); g.translate(e.x, e.y); g.scale(e.r, e.r);
        g.beginPath(); g.arc(0, 0, ir * 0.97, 0, 2 * Math.PI); g.clip();
        g.beginPath(); g.moveTo(-1.2, 1.3); for (let i = 0; i <= 20; i++) { const x = -1.1 + 2.2 * i / 20; g.lineTo(x, ly(x) + 0.06); } g.lineTo(1.2, 1.3); g.closePath();
        g.fillStyle = "rgba(12,12,12,0.78)"; g.fill();
        g.restore();
      }
    }
    if (mode === "sit" && pose.eyes && pose.eyes.lid10) {
      // f392: the eyes open again, the upper lids only ~10 % down: a pale lid over the top of each eye with a dark edge
      for (const e of geo.eyes) {
        g.save(); g.translate(e.x, e.y); g.scale(e.r, e.r);
        g.beginPath(); g.arc(0, 0, 1.0, 0, 2 * Math.PI); g.clip();
        g.beginPath(); g.moveTo(-1.2, -1.3); g.lineTo(1.2, -1.3); g.lineTo(1.2, -0.58); g.quadraticCurveTo(0, -0.72, -1.2, -0.58); g.closePath();
        g.fillStyle = "rgb(236,236,236)"; g.fill();
        g.beginPath(); g.moveTo(-1.1, -0.59); g.quadraticCurveTo(0, -0.72, 1.1, -0.59); g.strokeStyle = "rgba(25,25,25,0.9)"; g.lineWidth = 2.2 / (ppu * e.r); g.stroke();
        g.restore();
      }
    }
    if (mode === "sit") {
      // worried brows: short dark arcs over the top of each eye, higher at the inner end (source hold average, 4.5x)
      for (const e of geo.eyes) {
        const s = e.side, r = e.r;
        // (e.side: -1 = viewer's left eye; its inner end is to the right)
        strokePts(g, [[e.x + s * r * 0.95, e.y - r * 0.7], [e.x + s * r * 0.45, e.y - r * 1.02], [e.x - s * r * 0.2, e.y - r * 1.12], [e.x - s * r * 0.75, e.y - r * 1.38]], 1.9 / ppu, "rgba(25,25,25,0.9)");
      }
      // (the facial disc's heart lobes and V notch are the kit's disc: "line")
      // folded-wing scallops on both sides
      scallops(g, [[bx - bw * 0.95, bx - bw * 0.7, by + bh * 0.05, 6], [bx + bw * 0.7, bx + bw * 0.95, by + bh * 0.05, 6]], ppu, "rgba(80,80,80,0.5)");
    }
  };
}

// wing chord factor per frame and wing [left, right] (fix pass 2): the review measured the source's chord ~1.5x the first
// pass's at the take-off and ~1.4x on the right wing late in the flight; refined by silhouette IoU (snapshots/s02-fix2-lab)
// rows [frame, chordL, chordR, primaryL, primaryR] (primary = primary-length factor)
export const CHORD = { base: [1.6, 2.0, 0.65, 0.6], tab: [[398, 1.8, 1.9, 0.62, 0.6], [420, 1.8, 1.9, 0.65, 0.6], [436, 1.65, 2.0, 0.7, 0.6], [477, 1.6, 2.0, 0.6, 0.65]] };
export function chordAt(f, i) {
  const T = CHORD.tab; if (!T.length) return CHORD.base[i];
  if (f <= T[0][0]) return T[0][1 + i];
  for (let k = 1; k < T.length; k++) if (f <= T[k][0]) { const a = T[k - 1], b = T[k], t = (f - a[0]) / (b[0] - a[0]); return a[1 + i] + (b[1 + i] - a[1 + i]) * t; }
  return T[T.length - 1][1 + i];
}
// flight pose overrides (fix pass 1; the lab can swap them to compare)
// fix pass 2 (review high #2c): the body x1.12 wider and the belly ~20 units lower (source f464 y 400: x 1493-1773; belly
// bottom 499 vs 473)
export const FLYV = { body: { x: 6, y: -2, b: 141, a: 112 }, head: { jowl: 0.6 }, eyes: { el: -0.56 }, beak: { el: -0.63 } };
// the head sat ~22 px right of the source's at f432-440 (beak 1464-1478 vs 1439-1456): offset it there (frame px)
const HEAD_DX = (f) => -20 * Math.max(0, Math.min(1, (f - 428) / 4, (444 - f) / 4));
// the left foot hung ~50 px left of the source's from f440 (f464 1480-1533 vs 1533-1573): its root moves in (units)
const footL = (f) => 50 * Math.max(0, Math.min(1, (f - 434) / 8));
// the pose for frame f (sitting / take-off / flight) and its placement (in frame px of the camera the caller gives)
export function owlAt(f) {
  const FF = POSES.flyFront;
  if (f < 405) {
    // sitting on the lid: perch; from 398 the wings open from behind the shoulders
    const pose = owlPose("perch", {
      // fix pass 1: eyes r 26.5 -> 30 (the source's outer ring measures r ~18 px at s 0.68 on the hold average, 2x crop
      // sit367), a smaller softer tuft than the kit's
      // fix pass 2 (review low): eyes 5 px lower (el -0.25 -> -0.33), the cups ~20 % shorter (r 58 -> 47; source left cup
      // y 153-224 vs 137-228), the tuft a single curved plume (drawn in inkExtra)
      eyes: { ...sitEyes(f), r: 30, el: -0.33 }, beak: { el: -0.5, w: 34, l: 40 },
      tufts: [{ at: -0.98, size: 12, width: 0.2, lean: 0.2, second: 0.4, curl: 0.1 }],
      headphones: { r: 47, open: 1.0, cupEl: -0.1, w: 10 }, feet: SIT_FEET, head: SIT_HEAD, body: SIT_BODY, tail: null,
    });
    if (f >= 398) {
      const [lx, ly, rx, ry] = tipsAt(f), grow = Math.min(1, (f - 397) / 8);
      // take-off: the wings unfold from behind the shoulders (rooted ~60 px / 88 units higher than the first pass)
      const baseL = { ...FF.wings[0], len: 40 + 80 * grow, layer: "back" }, baseR = { ...FF.wings[1], len: 38 + 70 * grow, layer: "back" };
      // (fix pass 2: drawn by wing2.js with the chord x1.5 of the first pass's, review high #2)
      pose.wings = [];
      pose.w2 = [[wing2At([-96, -128], [lx, ly - 30], -1, baseL, 0.22, chordAt(f, 0), 21, chordAt(f, 2)), -1], [wing2At([96, -128], [rx, ry - 30], 1, baseR, 0.22, chordAt(f, 1), 23, chordAt(f, 3)), 1]];
    }
    pose.extra = inkExtra(pose, "sit", FLY_FEET, { at: 0.72, size: 58, lean: 0.35 });
    const dy = CROUCH[f] || 0;
    return { pose, place: { x: SIT.x, y: SIT.y + dy, s: SIT.s, rot: 0 }, key: `sit-${f >= 398 ? f : JSON.stringify(sitEyes(f))}` };
  }
  const [x, y, s, b] = rootAt(f);
  const [lx, ly, rx, ry] = tipsAt(f);
  // the flight headphones: big dark cups at eye level (source 17.6-19.1 s), a heavier band
  const pose = owlPose("flyFront", {
    headphones: { yaw: 0, r: 58, open: 1.0, lift: 1.12, cupEl: -0.15, w: 11 },
    body: FLYV.body,
    // the source's head is lower on the body with fuller cheeks, the eyes and beak lower (462: eyes 20 px under the kit's)
    head: { ...FLYV.head, x: 7 + HEAD_DX(f) / s }, eyes: FLYV.eyes, beak: FLYV.beak,
    // white talons dangling ~40 px under the belly (source 446 / 462: 1470-1520 and 1633-1680, y 500-550)
    feet: [],
    // fix pass 1: a fuller body (source 462: 250 px wide at the belly vs 230) so head and body read as one mass, a
    // smaller softer tuft
    tufts: [],
  });
  const T = WT, SL = [FF.wings[0].S[0], FF.wings[0].S[1] + T.sy], SR = [FF.wings[1].S[0], FF.wings[1].S[1] + T.sy];
  // per-frame lift of each wing's tip (units), fitted by silhouette IoU against the source frame (WLIFT, owltrack.js)
  const k = f - WLIFT_F0, dL = T.tyL ?? (k >= 0 && k < WLIFT.length / 2 ? WLIFT[2 * k] : 0), dR = T.tyR ?? (k >= 0 && k < WLIFT.length / 2 ? WLIFT[2 * k + 1] : 0);
  // fix pass 2: the wings drawn by wing2.js (long primaries, a smooth covert band), the span kept on the measured tips
  pose.wings = [];
  pose.w2 = [[wing2At(SL, tipFix(f, [lx, ly + T.ty + dL]), -1, { ...FF.wings[0], len: FF.wings[0].len * T.len }, T.arch, chordAt(f, 0), 21, chordAt(f, 2)), -1],
    [wing2At(SR, tipFix(f, [rx, ry + T.ty + dR]), 1, { ...FF.wings[1], len: FF.wings[1].len * T.len }, T.arch, chordAt(f, 1), 23, chordAt(f, 3)), 1]];
  pose.extra = inkExtra(pose, "fly", [{ ...FLY_FEET[0], x: FLY_FEET[0].x + footL(f) / s }, FLY_FEET[1]], { at: 0.72, size: 50, lean: 0.4 });
  return { pose, place: { x, y, s, rot: b }, key: `fly-${f}` };
}

// a dark outline round a layer's silhouette: its alpha, tinted ink and stamped at 8 offsets under it
function outlined(src, d, dst) {
  const w = src.width + 2 * d, h = src.height + 2 * d;
  if (dst.width !== w || dst.height !== h) { dst.width = w; dst.height = h; }
  const g = dst.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
  g.clearRect(0, 0, w, h);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.drawImage(src, d + Math.round(Math.cos(a) * d), d + Math.round(Math.sin(a) * d)); }
  g.globalCompositeOperation = "source-in"; g.fillStyle = "rgb(34,34,34)"; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over"; g.drawImage(src, d, d);
  return dst;
}

// cached layers: held sitting poses are built once; flight frames are built per frame (reused canvases)
const cache = new Map();
let C = null;
const cv = () => document.createElement("canvas");
// soft = the measured motion softness of the wings (px sigma); the body and head are drawn crisp
export function owlLayerAt(f, ox, oy, soft = 0) {
  const { pose, place, key } = owlAt(f);
  if (key.startsWith("sit-") && !key.startsWith("sit-3") && !key.startsWith("sit-4")) {
    // held sitting pose: cache in hold-frame coords and shift
    let L = cache.get(key);
    if (!L) {
      L = owlLayer({ ...pose, ...place });
      let c = cv(); c.width = L.canvas.width; c.height = L.canvas.height; c.getContext("2d", { willReadFrequently: true }).drawImage(L.canvas, 0, 0);
      // value-study correction of the sitting owl (hold-frame coords), baked into the held layer
      if (OWL_TONE.length && !globalThis.__NOTONE) applyTone(c, L.x, L.y, OWL_TONE, { sc: L.canvas.width / L.w });
      const o = outlined(c, 1, cv());
      L = { canvas: o, x: L.x - 1, y: L.y - 1, w: L.w + 2, h: L.h + 2 };
      cache.set(key, L);
    }
    return { canvas: L.canvas, x: L.x + ox, y: L.y + oy, w: L.w, h: L.h };
  }
  if (!C) C = { core: cv(), wing: cv(), out: cv(), o1: cv(), o2: cv() };
  const P = { ...pose, ...place, x: place.x + ox, y: place.y + oy };
  const core = owlLayer({ ...P, canvas: C.core });
  if (!pose.w2 || !pose.w2.length) { const o = outlined(core.canvas, 1, C.o1); return { canvas: o, x: core.x - 1, y: core.y - 1, w: core.w + 2, h: core.h + 2, anchors: core.anchors }; }
  // the wings (wing2.js) on their own canvas in frame px, outlined and softened; the crisp wingless owl on top
  const sc = P.s, ca = Math.cos(P.rot || 0), sa = Math.sin(P.rot || 0), toF = (u) => [P.x + sc * (ca * u[0] - sa * u[1]), P.y + sc * (sa * u[0] + ca * u[1])];
  let x0 = core.x, y0 = core.y, x1 = core.x + core.w, y1 = core.y + core.h;
  for (const [G] of pose.w2) for (const p of wing2Points(G)) { const q = toF(p); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const d = 1, pad = Math.ceil(3 * soft) + d + 4;
  x0 = Math.floor(x0) - pad; y0 = Math.floor(y0) - pad; x1 = Math.ceil(x1) + pad; y1 = Math.ceil(y1) + pad;
  const W = x1 - x0, Hh = y1 - y0;
  const wg = C.wing; if (wg.width !== W || wg.height !== Hh) { wg.width = W; wg.height = Hh; }
  const g = wg.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none"; g.clearRect(0, 0, W, Hh);
  g.setTransform(sc * ca, sc * sa, -sc * sa, sc * ca, P.x - x0, P.y - y0);
  for (const [G, side] of pose.w2) paintWing2(g, G, side, sc);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const wo = outlined(wg, d, C.o1), co = outlined(core.canvas, d, C.o2);
  const out = C.out; if (out.width !== W || out.height !== Hh) { out.width = W; out.height = Hh; }
  const og = out.getContext("2d");
  og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = "source-over"; og.clearRect(0, 0, W, Hh);
  og.filter = soft > 0.25 ? `blur(${soft.toFixed(2)}px)` : "none";
  og.drawImage(wo, -d, -d);
  og.filter = "none";
  og.drawImage(co, core.x - x0 - d, core.y - y0 - d);
  return { canvas: out, x: x0, y: y0, w: W, h: Hh, anchors: core.anchors };
}
export function releaseOwl() { cache.clear(); C = null; }
