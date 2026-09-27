// s18 shot A: the owl's feet, redrawn (fix pass 2 of review 2). Replaces handdraw.js footRig for shot A.
// The source's feet are chunky, softly shaded talons: a thick white shank coming out of the belly's underside
// (~20 px at the top, ~12 px at the ankle, no dark outline, merging with the belly), three long front toes
// (~9-12 px thick, knuckle pads, a grey underside, thin grey separations where they overlap, small dark claws) lying
// along the key, a short back toe; a lifted foot is a soft white clenched "C" (the curled toes pressed together,
// grey separations, not black); a foot swinging forward is a dark-grey motion-blurred smear.
// A foot is a few parameters (registered coords, the frame-1356 placement; the film moves them by PATH_A):
//   k: "P" planted, "C" clenched (lifted), "B" swinging (planted geometry, dark, smeared)
//   a: ankle [x, y]; h: shank top [x, y] (under the belly)
//   P / B: th toe heading (deg, screen: 0 right, 90 down, 180 left), L middle-toe length, fan (deg between the outer
//          toes), bend (toe droop, + = tips curve down), back [deg, len] or null
//   C:     th first heading, L outer-toe length, curl 0..1, palm +1 clockwise / -1, spread (deg)
//   tw toe width at the root, lw shank width at the ankle, lt shank width at the top, v fill value, blur [dx, dy] smear,
//   s extra softening passes
// The per-frame parameters (data/feetA2.js) were fitted by a pattern search of these parameters against the source
// frame's feet (blurred error in the feet box, the rest of the frame drawn as the film draws it), starting from the
// earlier eye-read placement, within bounds (snapshots/s18-fix2-h/fitfeet.*). Only the numbers are stored.
import { taper } from "../../lib/ink.js";
import { cpuCanvas } from "./inkdraw.js";

const d2r = Math.PI / 180;
const gv = (v, a = 1) => { const c = Math.max(0, Math.min(255, Math.round(v))); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };

// quadratic from A to B, the control point pushed off the chord by bend * |AB| (to the chord's right when bend > 0)
function arcPts(A, B, bend, n = 14) {
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend * L, cy = my + (dx / L) * bend * L, out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * A[0] + 2 * u * t * cx + t * t * B[0], u * u * A[1] + 2 * u * t * cy + t * t * B[1]]); }
  return out;
}
function curlPts(A, th0, L, K, palm, n = 18) {
  const pts = [[A[0], A[1]]]; let x = A[0], y = A[1];
  for (let i = 1; i <= n; i++) { const s = i / n, th = th0 + palm * K * Math.pow(s, 1.4), ds = L / n; x += Math.cos(th) * ds; y += Math.sin(th) * ds; pts.push([x, y]); }
  return pts;
}
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// the toe centre-lines of a foot: [{ pts, w0, w1 }], back toe first, outer toes before the middle one
export function footGeom(F) {
  const A = F.a, tw = F.tw ?? 11, out = [];
  if (F.k === "C") {
    const L = F.L, K = 0.35 + 3.2 * (F.curl ?? 0.75), palm = F.palm ?? -1, sp = (F.spread ?? 30) * d2r, th = F.th * d2r;
    // outer toe longest, inner ones shorter and curled tighter; drawn outer first so the inner ones lie on it
    for (const [a, k, kc] of [[th + palm * sp / 2, 1, 1], [th, 0.82, 1.12], [th - palm * sp / 2, 0.64, 1.25]])
      out.push({ pts: curlPts(A, a, k * L, K * kc, palm), w0: tw * (0.9 + 0.2 * k), w1: tw * 0.7, claw: palm });
    return out;
  }
  if (F.back) {
    const [bd, bl] = F.back, B = [A[0] + Math.cos(bd * d2r) * bl, A[1] + Math.sin(bd * d2r) * bl];
    out.push({ pts: arcPts(A, B, B[0] < A[0] ? -0.12 : 0.12, 8), w0: tw * 0.85, w1: tw * 0.55, claw: B[0] < A[0] ? -1 : 1 });
  }
  const th = F.th * d2r, fan = (F.fan ?? 10) * d2r, L = F.L, bend = F.bend ?? 0.08;
  const toes = [[th - fan / 2, 0.9], [th + fan / 2, 0.86], [th, 1]];
  for (const [t, k] of toes) {
    const T = [A[0] + Math.cos(t) * L * k, A[1] + Math.sin(t) * L * k], left = T[0] < A[0];
    out.push({ pts: arcPts(A, T, left ? -bend : bend), w0: tw, w1: tw * 0.6, claw: left ? -1 : 1 });
  }
  return out;
}

// a toe: a thin grey rim, the grey underside, the lit top (narrower, shifted up), a small dark hooked claw
function toe(g, T, lit, shade, rim) {
  const kn = (u) => 1 + 0.09 * Math.abs(Math.sin(Math.PI * 2 * u)) - 0.03;   // two knuckle pads
  const W = (u) => (T.w0 + (T.w1 - T.w0) * u) * kn(u);
  const cap = (pts, w, col) => { for (const [p, u] of [[pts[0], 0], [pts[pts.length - 1], 1]]) { g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], w(u) / 2, 0, 2 * Math.PI); g.fill(); } };
  if (rim != null) { const w = (u) => W(u) + 1.6; taper(g, T.pts, w, gv(rim)); cap(T.pts, w, gv(rim)); }
  taper(g, T.pts, W, gv(shade)); cap(T.pts, W, gv(shade));
  const up = shift(T.pts, 0, -0.16 * T.w0), w2 = (u) => W(u) * 0.66;
  taper(g, up, w2, gv(lit)); cap(up, w2, gv(lit));
  // the claw: from the toe's end, hooking down onto the key
  const n = T.pts.length - 1, e = T.pts[n], q = T.pts[Math.max(0, n - 2)];
  let th = Math.atan2(e[1] - q[1], e[0] - q[0]), x = e[0] + Math.cos(th) * (W(1) / 2 - 1.5), y = e[1] + Math.sin(th) * (W(1) / 2 - 1.5);
  const c = [[x, y]];
  for (let i = 1; i <= 5; i++) { th += T.claw * 0.26; x += Math.cos(th) * 1.3; y += Math.sin(th) * 1.3; c.push([x, y]); }
  taper(g, c, (u) => 2.2 * (1 - 0.85 * u), gv(28));
}

// the shank: a tapered white tube from above the top point (it runs up into the belly) down to the ankle, lit on
// its left, grey on its right; no outline
function shank(g, F, lit, shade) {
  if (!F.h) return;
  const A = F.a, H = F.h, dx = H[0] - A[0], dy = H[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const top = [H[0] + dx / L * 8, H[1] + dy / L * 8], lw = F.lw ?? 12, lt = F.lt ?? 20;
  const pts = [top, H, [(H[0] + A[0]) / 2, (H[1] + A[1]) / 2], A];
  taper(g, pts, (u) => lt + (lw - lt) * u, gv(shade));
  const ox = -0.14 * lw;
  taper(g, shift(pts, ox, 0), (u) => (lt + (lw - lt) * u) * 0.62, gv(lit));
  g.fillStyle = gv(shade); g.beginPath(); g.arc(A[0], A[1], lw * 0.55, 0, 2 * Math.PI); g.fill();
  g.fillStyle = gv(lit); g.beginPath(); g.arc(A[0] + ox, A[1] - 1, lw * 0.36, 0, 2 * Math.PI); g.fill();
}

export function footRig2(g, F) {
  const v = F.v ?? 230, dark = F.k === "B";
  // (the clenched foot's toes are pressed together: soft grey separations, not dark gaps)
  const lit = v, shade = dark ? v * 0.8 : (F.k === "C" ? 184 : 160), rim = dark ? null : (F.k === "C" ? 172 : 62);
  g.lineJoin = "round"; g.lineCap = "round";
  const T = footGeom(F);
  if (F.k === "C") {
    // the lifted foot: the shank first, then the clenched toes over it
    shank(g, F, lit, shade + 20);
    for (const t of T) toe(g, t, lit, shade, rim);
    return;
  }
  // planted / swinging: the back toe, the shank, then the front toes
  if (F.back) toe(g, T[0], lit, shade, rim);
  shank(g, F, lit, dark ? shade : shade + 30);
  for (const t of T.slice(F.back ? 1 : 0)) toe(g, t, lit, shade, rim);
}

export function footBox2(F) {
  let x0 = F.a[0], y0 = F.a[1], x1 = x0, y1 = y0;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  if (F.h) { const dx = F.h[0] - F.a[0], dy = F.h[1] - F.a[1], L = Math.hypot(dx, dy) || 1; add(F.h[0] + dx / L * 8, F.h[1] + dy / L * 8); }
  for (const t of footGeom(F)) for (const [x, y] of t.pts) add(x, y);
  const r = 16, bx = F.blur ? Math.abs(F.blur[0]) / 2 + 4 : 0, by = F.blur ? Math.abs(F.blur[1]) / 2 + 4 : 0;
  return [x0 - r - bx, y0 - r - by, x1 + r + bx, y1 + r + by];
}

// A foot into a scratch canvas, optionally motion-blurred along blur [dx, dy] (the average of 9 shifted copies, as
// premultiplied colour), softened, then drawn onto g (whose transform is taken as is).
let _fs = null, _fb = null;
export function drawFoot2(g, F, softHalf) {
  const b = footBox2(F), X0 = Math.floor(b[0]), Y0 = Math.floor(b[1]), w = Math.ceil(b[2]) - X0, h = Math.ceil(b[3]) - Y0;
  if (!_fs || _fs.width < w || _fs.height < h) { _fs = cpuCanvas(Math.max(w, _fs ? _fs.width : 0), Math.max(h, _fs ? _fs.height : 0)); _fb = cpuCanvas(_fs.width, _fs.height); }
  const s = _fs.getContext("2d"); s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.globalCompositeOperation = "source-over"; s.clearRect(0, 0, _fs.width, _fs.height);
  s.translate(-X0, -Y0); footRig2(s, F); s.setTransform(1, 0, 0, 1, 0, 0);
  let out = _fs;
  if (F.blur) {
    const bg = _fb.getContext("2d"), N = 9, [bx, by] = F.blur;
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalCompositeOperation = "source-over"; bg.globalAlpha = 1; bg.clearRect(0, 0, _fb.width, _fb.height);
    bg.globalCompositeOperation = "lighter"; bg.globalAlpha = 1 / N;
    for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; bg.drawImage(_fs, u * bx, u * by); }
    bg.globalCompositeOperation = "source-over"; bg.globalAlpha = 1;
    out = _fb;
  }
  softHalf(out, 1, 2 + (F.s || 0) + (F.blur ? 3 : 0), [0, 0, w, h]);
  g.drawImage(out, 0, 0, w, h, X0, Y0, w, h);
}

// the footprint grown by grow px, opaque (for cutting the traced marks round the foot)
export function footMask2(g, F, grow = 4) {
  g.save(); g.strokeStyle = "#000"; g.fillStyle = "#000"; g.lineCap = "round"; g.lineJoin = "round";
  const st = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke(); };
  const bl = F.blur || [0, 0];
  for (const u of F.blur ? [-0.5, -0.25, 0, 0.25, 0.5] : [0]) {
    g.save(); g.translate(u * bl[0], u * bl[1]);
    if (F.h) st([F.h, F.a], (F.lt ?? 20) + 2 * grow);
    for (const t of footGeom(F)) st(t.pts, t.w0 + 2 * grow);
    g.restore();
  }
  g.restore();
}

// Where the shank enters the belly the source has no line: the white of the shank runs on into the belly. Drawn after
// the body: a soft lit patch over the belly's inked edge, the shank's width, at the belly's underside (yb at the
// shank's x), feathered.
export function drawShankTop(g, F, yb, softHalf) {
  if (!F.h || F.k === "B" || Math.abs(F.h[1] - yb) > 12) return;
  const H = F.h, A = F.a, dx = H[0] - A[0], dy = H[1] - A[1];
  const x = H[0], w = (F.lt ?? 20) * 0.9, X0 = Math.floor(x - w), Y0 = Math.floor(yb - 14), W = Math.ceil(2 * w) + 2, Hh = 26;
  if (!_st || _st.width < W || _st.height < Hh) _st = cpuCanvas(Math.max(W, 64), Math.max(Hh, 32));
  const s = _st.getContext("2d"); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, _st.width, _st.height);
  s.translate(-X0, -Y0);
  s.fillStyle = gv(F.v ?? 230); s.beginPath(); s.ellipse(x, yb, w / 2, 4.5, Math.atan2(dy, dx) + Math.PI / 2, 0, 2 * Math.PI); s.fill();
  s.setTransform(1, 0, 0, 1, 0, 0);
  softHalf(_st, 1, 4, [0, 0, W, Hh]);
  g.drawImage(_st, 0, 0, W, Hh, X0, Y0, W, Hh);
}
let _st = null;
