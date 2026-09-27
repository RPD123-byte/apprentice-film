// NOT USED since the traced-cel pass (s23.js now draws the owl and effects from cels.js); kept for reference only.
// s23 owl: the kit's owl (owlInk.js) for head, face, headphones, body and feet, with this shot's own additions:
//  - big layered wings of long pointed feathers (the source's wings in this segment are long primaries with thin
//    grey separations and fine barbs, much bigger than the kit's paddle wings), drawn here;
//  - engraved-looking feather texture on the body (scalloped feather rows, fine flicks), cut into the kit's soft white;
//  - a crown shade (the strip / banner shadows the top of its head while carrying), and an optional dark ink contour
//    round the whole silhouette (the powered-up owl reads as line art on white flame).
// All geometry is in owl units (root = middle of the body, y down, head vertical radius = 100).
import { owlLayer, owlPose, mergePose, gv, LINE, V, ink, flick, headGeom, bodyOutline } from "../../lib/owlInk.js";
import { lerp, rng, clamp } from "../../lib/rng.js";

const D = Math.PI / 180;

// ---------------------------------------------------------------- wings
// wing spec: { S (shoulder), W (wrist), hand [dx,dy] (wrist -> hand tip), pa0, pa1 (primary angles, innermost first),
//   pL0, pL1 (primary lengths), n, sa (secondary angle), sL (secondary length), m, sfan, bend, side (-1 viewer-left,
//   +1 viewer-right), seed, cover (covert band depth), front }
function fanFeathers(w) {
  const r = rng(w.seed ?? 5);
  const n = w.n ?? 12, side = w.side ?? -1, out = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);                                   // 0 = trailing (lower) edge, 1 = leading (upper) edge
    const a = lerp(w.a0, w.a1, f) + (r() - 0.5) * 0.04;
    const pk = w.fpk ?? 0.6;
    const L = (f < pk ? lerp(w.L0, w.Lpk, Math.sin((Math.PI / 2) * f / pk)) : lerp(w.Lpk, w.L1, Math.pow((f - pk) / (1 - pk), 1.4))) * (0.95 + 0.1 * r());
    const hr = (w.hr ?? 30) * (0.6 + 0.4 * f);
    const root = [w.hinge[0] + Math.cos(a) * hr, w.hinge[1] + Math.sin(a) * hr];
    out.push({ root, a, L, w: L * (w.fw ?? 0.32) * (1.1 - 0.2 * f), bend: (w.bend ?? 0.06) * side * (f - 0.3), kind: 1 });
  }
  return out;
}
function wingFeathers(w) {
  if (w.type === "fan") return fanFeathers(w);
  const r = rng(w.seed ?? 5);
  const n = w.n ?? 10, m = w.m ?? 6, side = w.side ?? -1;
  const out = [];
  for (let i = 0; i < m; i++) {
    const f = (i + 0.5) / m;
    const root = [lerp(w.S[0], w.W[0], 0.06 + 0.92 * f), lerp(w.S[1], w.W[1], 0.06 + 0.92 * f)];
    const L = w.sL * (0.78 + 0.28 * f) * (0.93 + 0.14 * r());
    out.push({ root, a: w.sa + (r() - 0.5) * 0.1 + (w.sfan ?? 0.25) * (f - 0.5) * side, L, w: L * (w.sw ?? 0.36), bend: 0.02 * side, kind: 0 });
  }
  const hand = w.hand || [0, 0];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 1 : i / (n - 1);
    const root = [w.W[0] + hand[0] * f, w.W[1] + hand[1] * f];
    const L = lerp(w.pL0, w.pL1, Math.pow(f, 0.8)) * (0.93 + 0.12 * r());
    out.push({ root, a: lerp(w.pa0, w.pa1, f) + (r() - 0.5) * 0.05, L, w: L * (w.pw ?? 0.27) * (1 + 0.15 * (1 - f)), bend: (w.bend ?? 0.05) * side, kind: 1 });
  }
  return out;
}
const tipOf = (f) => { const d = [Math.cos(f.a), Math.sin(f.a)], n = [-d[1], d[0]]; return [f.root[0] + d[0] * f.L + n[0] * f.bend * f.L, f.root[1] + d[1] * f.L + n[1] * f.bend * f.L]; };
// the leading edge of a wing: shoulder -> wrist -> hand tip, arched a little
function leadEdge(w) {
  const hand = w.hand || [0, 0], H = [w.W[0] + hand[0], w.W[1] + hand[1]];
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const p = u < 0.62 ? V.mix(w.S, w.W, u / 0.62) : V.mix(w.W, H, (u - 0.62) / 0.38);
    pts.push(p);
  }
  return pts;
}
// one long pointed feather (a lance): leading vane narrower; path points
function lancePts(f, round = 0) {
  const d = [Math.cos(f.a), Math.sin(f.a)], nn = [-d[1], d[0]];
  const N = 12, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const hw = f.w * 0.5 * Math.min(1, 0.55 + u * 2.4) * Math.pow(Math.max(0, 1 - u), round ? 0.3 : 0.6);
    const c = [f.root[0] + d[0] * u * f.L + nn[0] * f.bend * f.L * u * u, f.root[1] + d[1] * u * f.L + nn[1] * f.bend * f.L * u * u];
    L.push([c[0] - nn[0] * hw * 0.72, c[1] - nn[1] * hw * 0.72]);
    R.push([c[0] + nn[0] * hw, c[1] + nn[1] * hw]);
  }
  return [...L, ...R.reverse()];
}
function polyPath(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
// paint one wing in owl units; px = one frame pixel in units (line widths)
function paintWing(g, w, px, tone = 1) {
  const F = wingFeathers(w);
  const r = rng((w.seed ?? 5) + 101);
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  const edge = gv(0.22, 0.7 * tone), barb = gv(0.55, 0.26 * tone);
  for (const f of F) {
    const pts = lancePts(f);
    g.beginPath(); polyPath(g, pts);
    const d = [Math.cos(f.a), Math.sin(f.a)];
    const gr = g.createLinearGradient(f.root[0], f.root[1], f.root[0] + d[0] * f.L, f.root[1] + d[1] * f.L);
    gr.addColorStop(0, gv(0.93)); gr.addColorStop(0.35, gv(0.975)); gr.addColorStop(0.85, gv(0.96)); gr.addColorStop(1, gv(0.9));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = edge; g.lineWidth = px * 0.95; g.stroke();
    // rachis and barbs: fine grey strokes (the source's feather texture)
    const nn = [-d[1], d[0]];
    const C = (u) => [f.root[0] + d[0] * u * f.L + nn[0] * f.bend * f.L * u * u, f.root[1] + d[1] * u * f.L + nn[1] * f.bend * f.L * u * u];
    g.strokeStyle = gv(0.52, 0.45 * tone); g.lineWidth = px * 0.7;
    g.beginPath(); const c0 = C(0.06), c1 = C(0.8); g.moveTo(c0[0], c0[1]); g.quadraticCurveTo(C(0.45)[0], C(0.45)[1], c1[0], c1[1]); g.stroke();
    g.strokeStyle = barb; g.lineWidth = px * 0.6;
    const nb = f.kind ? 7 : 4;
    for (let k = 0; k < nb; k++) {
      const u = 0.18 + 0.66 * (k + r() * 0.6) / nb, c = C(u), sd = k % 2 ? 1 : -0.7;
      const hw = f.w * 0.42 * Math.pow(1 - u, 0.6) * Math.abs(sd);
      g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + nn[0] * hw * Math.sign(sd) + d[0] * f.L * 0.07, c[1] + nn[1] * hw * Math.sign(sd) + d[1] * f.L * 0.07); g.stroke();
    }
  }
  if (w.type === "fan") { fanCoverts(g, w, px, tone, r); g.restore(); return; }
  // coverts: a white band along the leading edge hiding the feather roots, with two scalloped rows
  const lead = leadEdge(w);
  const cd = w.cover ?? w.sL * 0.5;
  const dirAt = (u) => (u < 0.62 ? w.sa : lerp(w.sa, (w.pa0 + w.pa1) / 2, (u - 0.62) / 0.38));
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) {
    const u = i / (lead.length - 1), a = dirAt(u), k = cd * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
    band.push([lead[i][0] + Math.cos(a) * k, lead[i][1] + Math.sin(a) * k]);
  }
  g.beginPath(); polyPath(g, band);
  g.fillStyle = gv(0.95); g.fill();
  for (const [row, len, cnt] of [[0.55, 0.62, 8], [0.12, 0.42, 9]]) {
    for (let i = 0; i < cnt; i++) {
      const u = (i + 0.5 + (row > 0.3 ? 0.25 : 0)) / cnt, a = dirAt(u);
      const p = lead[Math.min(lead.length - 1, Math.round(u * (lead.length - 1)))];
      const L = cd * len * (0.9 + 0.2 * r());
      const f = { root: [p[0] + Math.cos(a) * cd * row * 0.5, p[1] + Math.sin(a) * cd * row * 0.5], a: a + (r() - 0.5) * 0.12, L, w: L * 0.62, bend: 0 };
      const pts = lancePts(f, 1);
      g.beginPath(); polyPath(g, pts); g.fillStyle = gv(0.96); g.fill();
      g.strokeStyle = gv(0.34, 0.5 * tone); g.lineWidth = px * 0.75; g.stroke();
    }
  }
  // soft grey leading edge
  g.strokeStyle = gv(0.3, 0.55 * tone); g.lineWidth = px * 1.1;
  g.beginPath(); lead.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.restore();
}
// the covert patch of a fan wing: a rounded white shoulder over the feather roots with rows of small scalloped feathers
function fanCoverts(g, w, px, tone, r) {
  const Lc = w.cover ?? 90, a0 = w.a0 - 0.08 * (w.side ?? -1) * 0, a1 = w.a1;
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) { const a = lerp(a0, a1, i / N), k = Lc * (0.75 + 0.35 * Math.sin(Math.PI * i / N)); pts.push([w.hinge[0] + Math.cos(a) * k, w.hinge[1] + Math.sin(a) * k]); }
  const back = w.back ?? 30;
  const am = (a0 + a1) / 2;
  pts.push([w.hinge[0] - Math.cos(am) * back + Math.cos(a1 + Math.PI / 2 * (w.side ?? -1)) * 10, w.hinge[1] - Math.sin(am) * back]);
  g.beginPath(); polyPath(g, pts); g.fillStyle = gv(0.95); g.fill();
  for (const [row, len, cnt] of [[0.62, 0.5, 9], [0.3, 0.42, 7]]) {
    for (let i = 0; i < cnt; i++) {
      const u = (i + 0.5 + (row < 0.5 ? 0.3 : 0)) / cnt, a = lerp(a0, a1, u) + (r() - 0.5) * 0.08;
      const rr = Lc * row * (0.85 + 0.2 * Math.sin(Math.PI * u));
      const L = Lc * len * (0.85 + 0.3 * r());
      const f = { root: [w.hinge[0] + Math.cos(a) * rr, w.hinge[1] + Math.sin(a) * rr], a, L, w: L * 0.7, bend: 0 };
      g.beginPath(); polyPath(g, lancePts(f, 1)); g.fillStyle = gv(0.96); g.fill();
      g.strokeStyle = gv(0.36, 0.5 * tone); g.lineWidth = px * 0.75; g.stroke();
    }
  }
  // leading edge: a soft grey line round the top of the patch into the leading feather
  g.strokeStyle = gv(0.3, 0.5 * tone); g.lineWidth = px * 1.1;
  g.beginPath();
  for (let i = 0; i <= 8; i++) { const a = lerp(a1 - 0.35 * (w.side ?? -1) * 0 , a1, i / 8), k = Lc * (0.2 + 0.9 * i / 8); const p = [w.hinge[0] + Math.cos(a1) * k, w.hinge[1] + Math.sin(a1) * k]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
  g.stroke();
}
// extent of a wing in owl units (feather tips, band)
function wingPts(w) {
  const F = wingFeathers(w), pts = w.type === "fan" ? [w.hinge] : [w.S, w.W];
  if (w.type === "fan") { for (const f of F) pts.push(tipOf(f)); pts.push([w.hinge[0] - 60, w.hinge[1] - 60], [w.hinge[0] + 60, w.hinge[1] + 60]); return pts; }
  for (const f of F) { pts.push(tipOf(f)); pts.push(f.root); }
  const hand = w.hand || [0, 0]; pts.push([w.W[0] + hand[0], w.W[1] + hand[1]]);
  return pts;
}

// mirror a viewer-left wing to the viewer-right side
function mirror(w, over = {}) {
  const m = (p) => (p ? [-p[0], p[1]] : p);
  return { ...w, S: m(w.S), W: m(w.W), hand: m(w.hand), pa0: Math.PI - w.pa0, pa1: Math.PI - w.pa1, sa: Math.PI - w.sa, side: -(w.side ?? -1), seed: (w.seed ?? 5) + 1, ...over };
}
// fan wing from degrees (viewer-left; a0 = trailing/lower edge direction, a1 = leading/upper edge)
function FW(hinge, a0, a1, L0, Lpk, L1, o = {}) {
  return { type: "fan", hinge, a0: a0 * D, a1: a1 * D, L0, Lpk, L1, fpk: o.fpk, n: o.n ?? 12, hr: o.hr, fw: o.fw, cover: o.cover, back: o.back, seed: o.seed ?? 3, bend: o.bend, side: -1, front: o.front };
}
function mirrorFan(w, over = {}) { return { ...w, hinge: [-w.hinge[0], w.hinge[1]], a0: Math.PI - w.a0, a1: Math.PI - w.a1, side: 1, seed: (w.seed ?? 5) + 1, ...over }; }
export { FW, mirrorFan };
// left wing from degrees: primaries fan pa0..pa1 (deg, canvas: 180 = left, 270 = up), secondaries hang at sa
function LW(S, W, pa0, pa1, pL0, pL1, sa, sL, o = {}) {
  return { S, W, pa0: pa0 * D, pa1: pa1 * D, pL0, pL1, sa: sa * D, sL, n: o.n ?? 10, m: o.m ?? 6, hand: o.hand ?? [-30, -10], side: -1, cover: o.cover, seed: o.seed ?? 3, bend: o.bend ?? 0.05, sfan: o.sfan, front: o.front, pw: o.pw, sw: o.sw };
}

// ---------------------------------------------------------------- body texture, crown, contour
// Fine feather texture cut into the kit's soft-white body: staggered rows of scalloped feather edges and a few
// fine flicks, inside the body outline but outside the head.
function bodyTexture(g, P, px) {
  if (!P.body) return;
  const b = P.body, body = bodyOutline(b), H = headGeom(P.head);
  g.save();
  g.beginPath(); body.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
  g.beginPath(); g.rect(-2000, -2000, 4000, 4000); H.out.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip("evenodd");
  const r = rng(P.texSeed ?? 71);
  const cx = b.x ?? 0, cy = b.y ?? 0, ax = b.b ?? 100, ay = b.a ?? 100;     // front bodies: a = vertical half-length
  const step = 23, rs = 11;
  g.lineCap = "round";
  for (let row = 0, y = cy - ay * 0.95; y < cy + ay; y += step * 0.72, row++) {
    for (let x = cx - ax + (row % 2) * step * 0.5; x < cx + ax; x += step) {
      const ex = (x - cx) / ax, ey = (y - cy) / ay, e = ex * ex + ey * ey;
      if (e > 0.92 || r() < 0.18) continue;
      const k = 1 - e;
      const xx = x + (r() - 0.5) * 6, yy = y + (r() - 0.5) * 5;
      g.strokeStyle = gv(0.5, (0.12 + 0.22 * Math.min(1, e * 2.2)) * (P.texA ?? 1)); g.lineWidth = px * (0.7 + 0.35 * r());
      g.beginPath(); g.arc(xx, yy, rs * (0.8 + 0.4 * r()), 0.25 + 0.2 * r(), Math.PI - 0.25 - 0.2 * r()); g.stroke();
      if (r() < 0.5 * k + 0.2) {
        g.strokeStyle = gv(0.5, 0.25 * (P.texA ?? 1)); g.lineWidth = px * 0.6;
        g.beginPath(); g.moveTo(xx + (r() - 0.5) * 8, yy - 6); g.lineTo(xx + (r() - 0.5) * 10, yy + 7); g.stroke();
      }
    }
  }
  // the belly shadow side: a few longer hatch strokes low down
  g.strokeStyle = gv(0.4, 0.3 * (P.texA ?? 1)); g.lineWidth = px * 0.8;
  for (let i = 0; i < 26; i++) {
    const t = Math.PI * (0.1 + 0.8 * r()), x = cx + Math.cos(t) * ax * (0.75 + 0.2 * r()), y = cy + Math.sin(t) * ay * (0.8 + 0.15 * r());
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(t) * 18, y - Math.sin(t) * 22); g.stroke();
  }
  g.restore();
}
// shade the top of the head (the load above it shadows the crown)
function crownShade(g, P, c) {
  const H = headGeom(P.head);
  g.save();
  g.globalCompositeOperation = "source-atop";
  const y0 = H.y - H.ry * 1.6, y1 = H.y - H.ry * (c.to ?? 0.3);
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, gv(c.v ?? 0.12, c.a ?? 0.94)); gr.addColorStop(0.78, gv(c.v ?? 0.12, (c.a ?? 0.94) * 0.9)); gr.addColorStop(1, gv(c.v ?? 0.12, 0));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(H.x, y1 - (y1 - y0) * 0.1, H.rx * 1.9, (y1 - y0) * 1.1, H.roll, Math.PI, 2 * Math.PI); g.lineTo(H.x + H.rx * 1.9, y1 + 2); g.lineTo(H.x - H.rx * 1.9, y1 + 2); g.closePath(); g.fill();
  g.restore();
}
// a dark copy of a canvas (for the ink contour round the silhouette)
function darkCopy(src, v) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in"; g.fillStyle = gv(v); g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------------------------------------------------------------- poses
// The source's owl in this shot: a big head with a flat, tufted brow; a pear body about as wide as the head; visible
// legs with big talons; very large feathered wings. Head centre at (0, -118) units; feet (ankles) ~ 125 below the root.
const TUFTS = [{ at: -0.74, size: 40, width: 0.36, lean: -0.12, second: 0.45, curl: 0.1 }, { at: 0.74, size: 40, width: 0.36, lean: 0.12, second: 0.45, curl: 0.1 }];
const FEET = [{ x: -36, y: 126, rot: 0.12, size: 22, mode: "stand", leg: 24, seed: 2 }, { x: 38, y: 124, rot: -0.2, size: 22, mode: "stand", leg: 22, seed: 5 }];
const BASE = owlPose("frontStand", {
  head: { yaw: -0.3, roll: -0.04, square: 3.1, rx: 118, ry: 106 },
  tufts: TUFTS,
  eyes: { state: "angry", look: [-0.15, 0.1] },
  headphones: { yaw: -0.3 },
  body: { x: 0, y: 40, a: 92, b: 100, egg: -0.22 },
  feet: FEET,
  beak: { w: 30, l: 40 },
});
// strained: angry, lids low, brows heavy
const STRAIN = { state: "angry", brow: 1.25, lid: 0.52, slant: 0.55 };
const SQUEEZE = { state: "angry", brow: 1.35, lid: 0.93, slant: 0.7, curve: -0.1, pupil: 0.3 };
const BLAZE = { state: "angry", brow: 1.3, slant: 0.5, lid: 0.3, pupil: 0.0 };
// walk cycle feet (4 drawings, on twos): [left foot, right foot]
// (ankle y 160 = the lip; the body's lower edge is at ~150, so ~30 units of leg show)
const WALK_FEET = [
  [{ x: -40, y: 160, rot: 0.2, size: 28, mode: "stand", leg: 34, seed: 2 }, { x: 62, y: 128, rot: -0.9, size: 27, mode: "stand", leg: 22, seed: 5 }],
  [{ x: -34, y: 160, rot: 0.1, size: 28, mode: "stand", leg: 34, seed: 2 }, { x: 36, y: 160, rot: -0.15, size: 28, mode: "stand", leg: 34, seed: 5 }],
  [{ x: -62, y: 128, rot: 0.9, size: 27, mode: "stand", leg: 22, seed: 2 }, { x: 40, y: 160, rot: -0.2, size: 28, mode: "stand", leg: 34, seed: 5 }],
  [{ x: -36, y: 160, rot: 0.12, size: 28, mode: "stand", leg: 34, seed: 2 }, { x: 34, y: 160, rot: -0.1, size: 28, mode: "stand", leg: 34, seed: 5 }],
];
// a feathered wing bent like an arm, drawn over the face (the kit paints front wings under the head)
function armOver(g, S, Wr, T, len) {
  const seg = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    seg.push(u < 0.5 ? [lerp(S[0], Wr[0], u * 2), lerp(S[1], Wr[1], u * 2)] : [lerp(Wr[0], T[0], (u - 0.5) * 2), lerp(Wr[1], T[1], (u - 0.5) * 2)]);
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(seg[0][0], seg[0][1]); for (const q of seg.slice(1)) g.lineTo(q[0], q[1]); };
  path(); g.strokeStyle = gv(0.12, 0.9); g.lineWidth = len * 1.55; g.stroke();
  path(); g.strokeStyle = gv(0.94); g.lineWidth = len * 1.4; g.stroke();
  const d = [T[0] - Wr[0], T[1] - Wr[1]], L = Math.hypot(d[0], d[1]), ux = d[0] / L, uy = d[1] / L;
  for (let k = -1; k <= 1; k++) {
    const a = Math.atan2(uy, ux) + k * 0.3, b = [T[0] - ux * len * 0.3, T[1] - uy * len * 0.3];
    const pts = lancePts({ root: b, a, L: len * 1.5, w: len * 0.7, bend: 0 });
    g.beginPath(); polyPath(g, pts); g.fillStyle = gv(0.93); g.fill(); g.strokeStyle = gv(0.12, 0.85); g.lineWidth = 2; g.stroke();
  }
  g.strokeStyle = gv(0.4, 0.5); g.lineWidth = 1.5;
  for (let i = 2; i < 15; i += 3) { const q = seg[i]; g.beginPath(); g.moveTo(q[0] - uy * len * 0.4, q[1] + ux * len * 0.4); g.lineTo(q[0] + ux * len * 0.3, q[1] + uy * len * 0.3); g.stroke(); }
  g.restore();
}
const CROWN = { v: 0.07, a: 0.97, to: 0.5 };
export const POSE = {
  // carrying a load on its head, wings raised in a V (84–88.3); face turned to our left, one eye squeezed shut;
  // the head leans left of the body (measured: head centre ≈ 25–30 px left of the lower body)
  carry: mergePose(BASE, {
    head: { x: -72, y: -118, rx: 112, ry: 102, yaw: -0.5, roll: -0.08 }, headphones: { yaw: -0.5 }, body: { x: 0, y: 70, a: 82, b: 124, egg: -0.25 }, feet: WALK_FEET[1],
    eyes: { ...STRAIN, look: [-0.35, 0.15], right: SQUEEZE }, crown: CROWN, beak: { rot: 0.25 },
  }),
  // 87.76–88.08: head turned to our right, the other eye squeezed
  carryR: mergePose(BASE, {
    head: { x: 30, y: -118, rx: 112, ry: 102, yaw: 0.45, roll: 0.06 }, headphones: { yaw: 0.45 }, body: { x: 0, y: 70, a: 82, b: 124, egg: -0.25 }, feet: WALK_FEET[1],
    eyes: { ...STRAIN, look: [0.4, 0.1], left: SQUEEZE }, crown: CROWN, beak: { rot: -0.2 },
  }),
  // 88.12–88.32: facing us, both eyes open, glaring to our right
  carryF: mergePose(BASE, {
    head: { x: 0, y: -118, rx: 112, ry: 102, yaw: 0, roll: 0 }, headphones: { yaw: 0 }, body: { x: 0, y: 70, a: 82, b: 124, egg: -0.25 }, feet: WALK_FEET[1],
    eyes: { ...STRAIN, lid: 0.45, look: [0.5, 0.1] }, crown: CROWN,
  }),
  // pressing the banner flat, facing us (88.4–89.6)
  press: mergePose(BASE, { head: { yaw: 0, roll: 0 }, headphones: { yaw: 0 }, eyes: { ...STRAIN, lid: 0.45, look: [0, 0.1] } }),
  hop: mergePose(BASE, { head: { yaw: -0.1, roll: 0 }, headphones: { yaw: -0.1 }, eyes: { state: "angry", look: [0, 0.3] }, feet: [{ x: -30, y: 128, rot: 0.1, size: 20, mode: "dangle", leg: 20, seed: 2 }, { x: 30, y: 128, rot: -0.1, size: 20, mode: "dangle", leg: 20, seed: 5 }] }),
  // wiping its brow with the viewer-left wing, eyes shut; the other wing on the planted scissors (90.4–91.8)
  wipe: mergePose(BASE, {
    head: { yaw: -0.12, roll: -0.12 }, headphones: { yaw: -0.12 }, eyes: { state: "closed" },
    kitWings: [{ type: "arm", layer: "front", S: [100, 20], Wr: [160, 70], T: [205, 40], len: 34 }],
    over: (g) => armOver(g, [-95, 10], [-150, -110], [-10, -175], 34),
  }),
  // coiled crouch, wing tips clenched like fists (91.84–92.6)
  crouch: mergePose(BASE, {
    head: { yaw: 0, y: -100, roll: 0 }, headphones: { yaw: 0 }, body: { a: 88, b: 118, y: 44 }, eyes: { ...STRAIN, look: [0, 0.2], lid: 0.55 },
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 20], Wr: [-190, 60], T: [-205, -10], len: 36 },
      { type: "arm", layer: "front", S: [100, 20], Wr: [190, 60], T: [205, -10], len: 36 },
    ],
  }),
  // the one-frame anticipation at 92.60: crouched lower, eyes already blazing
  antic: mergePose(BASE, {
    head: { yaw: 0, y: -96, roll: 0 }, headphones: { yaw: 0 }, body: { a: 86, b: 122, y: 44 }, eyes: BLAZE, beak: { open: 0.3 },
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 20], Wr: [-200, 70], T: [-215, 0], len: 38 },
      { type: "arm", layer: "front", S: [100, 20], Wr: [200, 70], T: [215, 0], len: 38 },
    ],
  }),
  // powering up: yelling, eyes blazing, wings flung up and out (92.64–93.8)
  power: mergePose(BASE, { head: { yaw: -0.05, roll: 0.03 }, headphones: { yaw: -0.05 }, eyes: BLAZE, beak: { open: 0.9 }, texA: 1.3 }),
  // reaching out to the left for the returning scissors (93.84–94.84), the right wing clenched against its chest
  reach: mergePose(BASE, {
    head: { yaw: -0.18, roll: -0.05 }, headphones: { yaw: -0.18 }, eyes: { ...BLAZE, look: [-0.6, 0] }, beak: { open: 0.3 }, texA: 1.3,
    kitWings: [{ type: "arm", layer: "front", S: [100, 10], Wr: [165, 60], T: [150, -10], len: 40 }],
  }),
  // a pair of scissors raised in each wing (94.88–95.92)
  two: mergePose(BASE, {
    head: { yaw: 0, roll: 0 }, headphones: { yaw: 0 }, eyes: { ...STRAIN, look: [0, 0.1] }, beak: { open: 0 }, texA: 1.3,
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 0], Wr: [-190, 20], T: [-215, -80], len: 34 },
      { type: "arm", layer: "front", S: [100, 0], Wr: [190, 20], T: [215, -100], len: 34 },
    ],
  }),
  // shooting up off the speaker with both pairs raised in a V (95.96–96.04)
  vee: mergePose(BASE, {
    head: { yaw: -0.15, roll: -0.1 }, headphones: { yaw: -0.15 }, eyes: { ...STRAIN, look: [-0.3, -0.2] }, beak: { open: 0.15 },
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 0], Wr: [-185, -40], T: [-205, -130], len: 34 },
      { type: "arm", layer: "front", S: [100, 0], Wr: [170, -80], T: [190, -190], len: 34 },
    ],
    feet: [{ x: -30, y: 125, rot: 0.4, size: 22, mode: "dangle", leg: 18, seed: 2 }, { x: 34, y: 120, rot: 0.2, size: 22, mode: "dangle", leg: 18, seed: 5 }],
  }),
  // thrusting both pairs forward like lances, flying (96.08–97.04)
  lance: mergePose(BASE, {
    head: { yaw: -0.35, roll: -0.12 }, headphones: { yaw: -0.35 }, eyes: { ...STRAIN, look: [-0.5, 0.1] }, beak: { open: 0.2 },
    kitWings: [
      { type: "arm", layer: "front", S: [-95, 10], Wr: [-160, 75], T: [-225, 80], len: 32 },
      { type: "arm", layer: "front", S: [90, 20], Wr: [10, 95], T: [-195, 55], len: 32 },
    ],
    feet: [{ x: -30, y: 125, rot: 0.6, size: 22, mode: "dangle", leg: 16, seed: 2 }, { x: 34, y: 120, rot: 0.4, size: 22, mode: "dangle", leg: 16, seed: 5 }],
  }),
  // flying with the scissors (95.96–97.04)
  fly: mergePose(BASE, { head: { yaw: -0.3, roll: -0.15 }, headphones: { yaw: -0.3 }, eyes: { ...STRAIN, look: [-0.4, 0.1] }, beak: { open: 0.2 },
    feet: [{ x: -30, y: 125, rot: 0.5, size: 20, mode: "dangle", leg: 16, seed: 2 }, { x: 34, y: 120, rot: 0.3, size: 20, mode: "dangle", leg: 16, seed: 5 }] }),
};
POSE.walk = WALK_FEET;
// wing sets (the source's wings span ~3× the head width); measured on 2× grids of the source
// carry: narrow wings raised in a V, primaries pointing up and out, tips under the load's lower edge
// measured at 84.4 / 87.2 (root = lower-body centre): left tips reach (-441,-203) / (-372,-246), right (303,-297) / (282,-259)
const carryL = FW([-140, 8], 196, 234, 215, 365, 175, { fpk: 0.5, n: 13, cover: 120, hr: 50, seed: 3, fw: 0.36 });
const carryR = mirrorFan(carryL, { hinge: [118, 20], a0: -36 * D, a1: -84 * D, L0: 175, Lpk: 375, L1: 250, fpk: 0.55, n: 12 });
export const WINGS = {
  carry: () => [carryL, carryR],
  press: () => { const l = LW([-85, 0], [-250, -25], 148, 190, 150, 300, 112, 120, { hand: [-55, 0], seed: 7, n: 11, m: 7, cover: 75 }); return [l, mirror(l)]; },
  // V up (take-off / landing)
  up: () => { const l = LW([-75, 0], [-190, -175], 205, 250, 140, 250, 150, 125, { hand: [-25, -45], seed: 9, n: 10, m: 6, cover: 75 }); return [l, mirror(l)]; },
  spread: () => { const l = LW([-85, 0], [-240, -45], 140, 196, 130, 280, 115, 115, { hand: [-45, -8], seed: 11, n: 10, m: 7, cover: 75 }); return [l, mirror(l)]; },
  half: () => { const l = LW([-85, 10], [-185, 20], 110, 160, 110, 200, 100, 100, { hand: [-35, 5], seed: 13, n: 9, m: 5, cover: 65 }); return [l, mirror(l)]; },
  // flung up and out (measured at 93.2: tips at (-369,-235) / (352,-244) units from the root)
  power: () => { const l = FW([-95, -30], 168, 230, 190, 335, 220, { fpk: 0.72, n: 15, cover: 135, hr: 55, seed: 15, fw: 0.34 }); return [l, mirrorFan(l, { a0: 5 * D, a1: -60 * D })]; },
  // the left wing reaching out to the returning scissors (93.8: tip ≈ (-379,-179) units)
  reach: () => [FW([-95, -25], 150, 206, 190, 305, 250, { fpk: 0.7, n: 14, cover: 135, hr: 60, seed: 17, fw: 0.34 })],
  fly: () => { const l = LW([-75, 0], [-230, -130], 180, 228, 140, 260, 140, 115, { hand: [-35, -25], seed: 19, n: 10, m: 6, cover: 78 }); return [l, mirror(l)]; },
};

// ---------------------------------------------------------------- compositing
// Build the owl (kit body/head/face + texture + wings + props) into its own canvas: { canvas, x, y, w, h, anchors }
// in frame px. key: cache the result (held poses); otherwise `slot` picks one of a few reusable scratch canvases.
// o.outline: ink value of a dark contour round the silhouette (null = none); o.bright: lift the whole owl toward white.
const CACHE = new Map(), SCRATCH = [];
export function owlComp(pose, wings, x, y, s, { rot = 0, flip = false, res = 1.5, extra, props, propBox, key, slot = 0, outline = null, lift = 0 } = {}) {
  if (key && CACHE.has(key)) return CACHE.get(key);
  const P = mergePose(pose, { wings: pose.kitWings || [] });
  if (!SCRATCH[slot]) SCRATCH[slot] = { a: document.createElement("canvas"), b: document.createElement("canvas") };
  const ex = (g, geo) => {
    if (P.body && P.neck !== false) {
      // the head sits straight on the body in the source: hide the kit's rim line along the seam
      const H = geo.H, b = P.body;
      g.save();
      g.beginPath(); g.rect(-3000, -3000, 6000, 6000); H.out.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip("evenodd");
      const bo = bodyOutline(b); g.beginPath(); bo.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
      g.filter = `blur(${Math.max(0.5, 7 * s * res).toFixed(1)}px)`;
      g.fillStyle = gv(0.965);
      g.beginPath(); g.ellipse((H.x + (b.x ?? 0)) / 2, H.y + H.ry * 0.95, H.rx * 0.85, H.ry * 0.42, 0, 0, Math.PI * 2); g.fill();
      g.filter = "none"; g.restore();
    }
    if (pose.over) pose.over(g, geo); if (extra) extra(g, geo);
  };
  const L = owlLayer({ ...P, x, y, s, rot, flip, res, canvas: key ? document.createElement("canvas") : SCRATCH[slot].a, tone: false, extra: ex });
  const co = Math.cos(rot), sn = Math.sin(rot), fl = flip ? -1 : 1;
  const unitT = (g, ox, oy) => g.setTransform(res * s * fl * co, res * s * fl * sn, -res * s * sn, res * s * co, res * (x - ox), res * (y - oy));
  // texture + crown on the kit layer itself (in place)
  {
    const lg = L.canvas.getContext("2d");
    lg.save(); unitT(lg, L.x, L.y);
    lg.globalCompositeOperation = "source-atop";
    bodyTexture(lg, P, 1 / s);
    lg.globalCompositeOperation = "source-over";
    if (P.crown) crownShade(lg, P, P.crown);
    lg.restore();
  }
  const ws = wings || [];
  // canvas bounds from the real geometry: kit layer, every wing feather tip, the props' box
  let x0 = L.x, y0 = L.y, x1 = L.x + L.w, y1 = L.y + L.h;
  const addU = (p) => { const fx = x + s * (co * fl * p[0] - sn * p[1]), fy = y + s * (sn * fl * p[0] + co * p[1]); x0 = Math.min(x0, fx); y0 = Math.min(y0, fy); x1 = Math.max(x1, fx); y1 = Math.max(y1, fy); };
  for (const w of ws) for (const p of wingPts(w)) addU(p);
  if (props) { const b = propBox || [-420, -460, 420, 260]; addU([b[0], b[1]]); addU([b[2], b[1]]); addU([b[0], b[3]]); addU([b[2], b[3]]); }
  const m = 8 + (outline != null ? 3 : 0);
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  if (!ws.length && !props && outline == null) { const out = { ...L }; if (key) CACHE.set(key, out); return out; }
  const c = key ? document.createElement("canvas") : SCRATCH[slot].b;
  const cw = Math.round((x1 - x0) * res), ch = Math.round((y1 - y0) * res);
  if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  const paintWings = (list) => {
    if (!list.length) return;
    g.save(); unitT(g, x0, y0);
    for (const w of list) paintWing(g, w, 1 / s);
    g.restore();
  };
  paintWings(ws.filter((w) => !w.front));
  g.drawImage(L.canvas, (L.x - x0) * res, (L.y - y0) * res, L.w * res, L.h * res);
  paintWings(ws.filter((w) => w.front));
  if (props) { g.save(); unitT(g, x0, y0); props(g); g.restore(); }
  if (outline != null) {
    // ink contour: a dark copy of the silhouette pushed out ~1.6 px in eight directions, behind the owl
    const dk = darkCopy(c, outline), tmp = document.createElement("canvas"); tmp.width = cw; tmp.height = ch;
    const tg = tmp.getContext("2d"), o = 1.6 * res;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; tg.drawImage(dk, Math.cos(a) * o, Math.sin(a) * o); }
    tg.drawImage(c, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.drawImage(tmp, 0, 0);
  }
  if (lift) liftTones(c, lift);
  const out = { canvas: c, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors: L.anchors };
  if (key) CACHE.set(key, out);
  return out;
}
// brighten the owl's soft greys toward white, keeping the ink (the powered-up owl reads as white line art)
function liftTones(c, k) {
  const g = c.getContext("2d"), img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) { const f = v / 255; lut[v] = Math.round(255 * (f < 0.42 ? f : Math.min(1, 0.42 + (f - 0.42) * (1 + k)))); }
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
  g.putImageData(img, 0, 0);
}
export function blitOwl(g, O, alpha = 1, dx = 0, dy = 0) {
  if (!O) return;
  g.save(); g.globalAlpha *= alpha; g.drawImage(O.canvas, O.x + dx, O.y + dy, O.w, O.h); g.restore();
}
// rotate a cached owl about a pivot (frame px) while blitting (walk tilt)
export function blitOwlRot(g, O, px, py, ang, alpha = 1, dx = 0, dy = 0) {
  if (!O) return;
  g.save(); g.globalAlpha *= alpha;
  g.translate(px + dx, py + dy); g.rotate(ang); g.translate(-px, -py);
  g.imageSmoothingQuality = "high";
  g.drawImage(O.canvas, O.x, O.y, O.w, O.h); g.restore();
}
export function releaseOwl23() { CACHE.clear(); SCRATCH.length = 0; }
export { LINE, ink, flick, clamp };
