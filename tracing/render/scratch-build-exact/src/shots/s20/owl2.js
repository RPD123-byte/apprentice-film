// The s20 owl, drawn the way the source draws it: one continuous pear-shaped silhouette (head about as wide as the
// body, no neck), soft white plumage with scalloped chest rows, fine fur strokes and shadow-side hatching, big round
// eyes (small pupil + catch-light, thin brow arcs), a small hooked beak, dark metallic headphones (ribbed ear pads,
// bright rim, a thick band hugging the skull), folded or fanned feathered wings, short feathered legs and scaly toes.
//
// Units: frame px at s = 1 (the 64.12 front pose is s ≈ 1). root (0,0) = the middle of the body, y down.
// The head is an ellipsoid (rx = rz) turned by yaw (+ = face toward the viewer's right, ±π = back to camera),
// roll and pitch; features and the headphone rig ride on it. Everything is seeded (held poses never boil).
import { drawBandage, drawBeak, plumage, softShade, ink, flick, setPPU, LINE, gv, V } from "../../lib/owlInk.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng, clamp } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const { add, sub, mul, nrm, perp } = V;
const mix = V.mix;

// ---------------------------------------------------------------- geometry helpers
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function distPoly(p, poly, step = 3) {
  let d = 1e9;
  for (let i = 0; i < poly.length; i += step) { const q = poly[i]; const e = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (e < d) d = e; }
  return Math.sqrt(d);
}
function resample(poly, step, closed = true) {
  const pts = closed ? [...poly, poly[0]] : poly, out = [];
  let acc = 0;
  out.push(pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = step - acc;
    while (d <= L) { out.push([a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L]); d += step; }
    acc = L - (d - step);
  }
  if (closed && out.length > 1) { const l = out[out.length - 1]; if (Math.hypot(l[0] - pts[0][0], l[1] - pts[0][1]) < step * 0.5) out.pop(); }
  return out;
}
const polyPath = (poly) => (c) => { c.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) c.lineTo(poly[i][0], poly[i][1]); c.closePath(); };
function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }

// signed distance (approximate) to a superellipse; sq = exponent of the top half
function dEll(px, py, e) {
  let x = px - e.x, y = py - e.y;
  if (e.rot) { const c = Math.cos(-e.rot), s = Math.sin(-e.rot); const X = x * c - y * s; y = x * s + y * c; x = X; }
  let ry = e.ry;
  if (y > 0 && e.low) ry *= e.low;
  const n = y < 0 ? (e.sq || 2) : (e.sqLow || 2);
  let rx = e.rx;
  if (e.egg) rx *= 1 - e.egg * clamp(-y / ry, -1, 1);          // egg > 0: narrower at the top
  const k = Math.pow(Math.pow(Math.abs(x / rx), n) + Math.pow(Math.abs(y / ry), n), 1 / n);
  return (k - 1) * Math.min(rx, ry);
}
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

// ---------------------------------------------------------------- the head on a sphere
export function headRig(h) {
  const { x = 0, y = 0, rx = 90, ry = 82, yaw = 0, pitch = 0, roll = 0 } = h;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // head-local (X right = owl's left when facing us, Y down, Z toward the viewer), in head radii
  const rot3 = (X, Y, Z) => {
    const Y1 = Y * cp - Z * sp, Z1 = Y * sp + Z * cp;
    return [X * cy + Z1 * sy, Y1, -X * sy + Z1 * cy];
  };
  const toF = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
  const L = (X, Y, Z) => { const [a, b, c] = rot3(X, Y, Z); const p = toF(a * rx, b * ry); return { x: p[0], y: p[1], z: c }; };
  const P = (az, el, lift = 1) => L(Math.sin(az) * Math.cos(el) * lift, -Math.sin(el) * lift, Math.cos(az) * Math.cos(el) * lift);
  return { x, y, rx, ry, yaw, pitch, roll, cr, sr, L, P, rot3, toF };
}

// ---------------------------------------------------------------- the silhouette (head + body, one pear)
function silhouette(p) {
  const H = p.head, B = p.body;
  const he = { x: H.x, y: H.y, rx: H.rx, ry: H.ry, rot: H.roll || 0, sq: H.sq ?? 2.5, sqLow: 2, low: H.low ?? 1 };
  const be = { x: B.x, y: B.y, rx: B.rx, ry: B.ry, rot: B.rot || 0, egg: B.egg || 0, sq: 2, sqLow: B.sqLow ?? 2.2 };
  const k = p.k ?? 50;
  const f = (x, y) => smin(dEll(x, y, he), dEll(x, y, be), k);
  const C = [lerp2(H.x, B.x, 0.55), lerp2(H.y, B.y, 0.55)];
  const N = 420, out = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU - Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a);
    let lo = 0, hi = 480;
    for (let it = 0; it < 26; it++) { const m = (lo + hi) / 2; if (f(C[0] + dx * m, C[1] + dy * m) < 0) lo = m; else hi = m; }
    out.push([C[0] + dx * lo, C[1] + dy * lo]);
  }
  let poly = resample(out, 2.2);
  // ear tufts: pointed spikes pushed out of the head outline (phi = polar angle from the head's top, + clockwise)
  const r = rng(p.seed ?? 31);
  const disp = poly.map(() => [0, 0]);
  for (const t of p.tufts || []) {
    const spikes = t.spikes || [[0, 1, 0.12], [t.side2 ?? 0.16, 0.62, 0.09]];
    for (const [off, k2, wd] of spikes) {
      const phi = t.phi + off * Math.sign(t.phi || 1), dir = [Math.sin(phi + (H.roll || 0)), -Math.cos(phi + (H.roll || 0))];
      const lean = t.lean || 0, dvec = V.rot(dir, lean * Math.sign(t.phi || 1));
      const width = (t.w ?? 1) * wd;
      poly.forEach((q, i) => {
        const ang = Math.atan2(q[0] - H.x, -(q[1] - H.y)) - (H.roll || 0);
        let dA = ang - phi; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
        const u = 1 - Math.abs(dA) / width;
        if (u > 0) { const m = t.size * k2 * Math.pow(u, 1.6); disp[i][0] += dvec[0] * m; disp[i][1] += dvec[1] * m; }
      });
    }
  }
  // fluffy lower edge: small seeded feather points on the lower body (not on the head)
  const lowY = B.y + B.ry * (p.fluffFrom ?? 0.45);
  let acc = 0;
  const period = p.fluffP ?? 18, amp = p.fluff ?? 2.4;
  const phase = r() * 10;
  poly.forEach((q, i) => {
    acc += 2.2;
    if (q[1] < lowY) return;
    const k3 = clamp((q[1] - lowY) / 30);
    const s = (acc / period + phase) % 1, spike = Math.pow(Math.max(0, 1 - Math.abs(s - 0.5) * 2), 3);
    const n = nrm(sub(q, C));
    const nz = noise((acc / period) | 0, p.seed ?? 31);
    const a = amp * k3 * spike * (nz < 0.35 ? 0 : 0.4 + 1.2 * nz);
    disp[i][0] += n[0] * a; disp[i][1] += n[1] * a;
  });
  poly = poly.map((q, i) => [q[0] + disp[i][0], q[1] + disp[i][1]]);
  return { poly, C, f };
}
const lerp2 = (a, b, t) => a + (b - a) * t;
function noise(i, seed) { const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); }

// ---------------------------------------------------------------- strokes
function fine(g, pts, w, color) { if (pts.length > 1) taper(g, pts.length > 2 ? sampleCurve(pts, 5) : pts, (u) => w * (0.25 + 0.75 * Math.sin(Math.PI * clamp(u))), color); }
function outlineInk(g, poly, light, { w = 2.4, heavy = 1.6, color = LINE, from = 0, to = 1 } = {}) {
  const cw = area(poly) > 0, n = poly.length;
  const i0 = Math.floor(from * n), i1 = Math.floor(to * n);
  const seg = [];
  for (let i = i0; i <= i1; i++) seg.push(poly[i % n]);
  const W = seg.map((p, j) => {
    const a = seg[Math.max(0, j - 1)], b = seg[Math.min(seg.length - 1, j + 1)];
    const t = nrm(sub(b, a)), out = cw ? [t[1], -t[0]] : [-t[1], t[0]];
    const away = -(out[0] * light[0] + out[1] * light[1]);
    return w * (0.8 + 0.2 * noise(j >> 3, 7)) + heavy * Math.max(0, away);
  });
  taper(g, seg, (u) => W[Math.min(W.length - 1, Math.round(u * (W.length - 1)))], color);
}

// rows of small scallops (feather edges) inside a region; rows along +x, stacked along +y (in a local frame)
function scallops(g, poly, { x0, x1, y0, y1, dy = 12, dx = 15, depth = 4.5, color = 0.5, alpha = 0.45, w = 1.0, seed = 3, light, inset = 10, skip = 0.25, grow = 0.25, rot = 0, cx = 0, cy = 0 }) {
  const r = rng(seed);
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const T = (x, y) => [cx + x * cr - y * sr, cy + x * sr + y * cr];
  let row = 0;
  for (let y = y0; y <= y1; y += dy, row++) {
    const f = (y - y0) / Math.max(1, y1 - y0), sc = 1 + grow * f;
    for (let x = x0 + ((row % 2) * dx) / 2 + r() * 3; x <= x1; x += dx * sc) {
      if (r() < skip) continue;
      const hw = dx * sc * 0.55, dp = depth * sc * (0.8 + 0.4 * r());
      const yy = y + (r() - 0.5) * 3;
      const q = [T(x - hw, yy - dp * 0.35), T(x, yy + dp), T(x + hw, yy - dp * 0.35)];
      const m = q[1];
      if (!inPoly(m, poly)) continue;
      const d = distPoly(m, poly);
      if (d < inset) continue;
      let a = alpha * clamp((d - inset) / 16);
      if (light) { const shadeK = clamp(0.5 - 0.5 * ((m[0] - cx) * light[0] + (m[1] - cy) * light[1]) / 80); a *= 0.55 + 0.9 * shadeK; }
      fine(g, q, w * (0.8 + 0.4 * r()), gv(color, clamp(a)));
    }
  }
}
// short fur strokes scattered in the polygon, running along `flow`, denser away from the light
function fur(g, poly, { n = 150, len = 11, w = 0.9, color = 0.48, alpha = 0.32, flow = [0, 1], light = [-0.55, -0.83], c = [0, 0], seed = 5, inset = 6, spread = 0.5, bias = 0.9, region = null }) {
  const r = rng(seed);
  let xs = Infinity, ys = Infinity, xe = -Infinity, ye = -Infinity;
  for (const [x, y] of poly) { xs = Math.min(xs, x); ys = Math.min(ys, y); xe = Math.max(xe, x); ye = Math.max(ye, y); }
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const p = [xs + r() * (xe - xs), ys + r() * (ye - ys)];
    if (region && !region(p)) continue;
    if (!inPoly(p, poly)) continue;
    const d = distPoly(p, poly);
    if (d < inset) continue;
    const sh = clamp(0.5 + 0.5 * (-(p[0] - c[0]) * light[0] - (p[1] - c[1]) * light[1]) / 90);
    if (r() > 0.25 + bias * sh) continue;
    i++;
    const dir = V.rot(nrm(flow), (r() - 0.5) * spread + (p[0] - c[0]) * 0.0025);
    flick(g, p, dir, len * (0.6 + 0.8 * r()), w * (0.7 + 0.6 * r()), gv(color, alpha * (0.5 + 0.8 * sh)), (r() - 0.5) * 0.4);
  }
}
// inward strokes along the part of an outline that faces away from the light
function rimStrokes(g, poly, { light, step = 4.5, len = 14, w = 0.9, color = 0.42, alpha = 0.5, flow = [0, 1], seed = 9, from = 0, to = 1, thr = 0.1 }) {
  const cw = area(poly) > 0, r = rng(seed), n = poly.length;
  for (let i = Math.floor(from * n); i < to * n; i += Math.max(1, Math.round(step / 2.2 * (0.6 + 0.8 * r())))) {
    const p = poly[i % n], a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n];
    const t = nrm(sub(b, a)), inw = cw ? [-t[1], t[0]] : [t[1], -t[0]];
    const k = (inw[0] * light[0] + inw[1] * light[1] - thr) / (1 - thr);
    if (k <= 0 || r() > 0.3 + 0.7 * k) continue;
    const d = nrm(add(mul(inw, 0.65), mul(nrm(flow), 0.35)));
    flick(g, add(p, mul(inw, 1 + r() * 1.5)), V.rot(d, (r() - 0.5) * 0.4), len * (0.4 + 0.9 * k) * (0.6 + 0.7 * r()), w * (0.7 + 0.6 * r()), gv(color, alpha * (0.5 + 0.5 * k)), (r() - 0.5) * 0.3);
  }
}

// ---------------------------------------------------------------- eyes
// e: { x, y, r, sx (foreshortening), rot, look [lx,ly], pupil (radius fraction), lid (0..1 of the eye covered from
// the top), slant (+ = inner corner of the lid lower), low (lower lid), closed ('shut' | 'squint'), side (-1 viewer
// left, +1 right), brow { lift, tilt, len, w } | false }
export function eye2(g, e) {
  const { x, y, r, sx = 1, rot = 0, look = [0, 0], pupil = 0.4, lid = 0, slant = 0, low = 0, side = 1, closed = false, plum = 0.95 } = e;
  const inner = -side;                     // the inner corner (toward the beak) is on the -side
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  if (closed) {
    // squeezed shut: a heavy arc bowed down, a faint crease above, a lash flick at the outer end
    const k = closed === "squint" ? 1 : 0.6;
    const pts = [[-1.05, -0.05], [-0.5, 0.25 * k], [0.1, 0.32 * k], [0.6, 0.18 * k], [1.05, -0.12]].map(([a, b]) => [a * r * sx * side, b * r]);
    ink(g, pts, r * 0.16, LINE, { end: 0.12, bias: 0.5 });
    ink(g, [[-0.9, -0.42], [-0.2, -0.62], [0.7, -0.5]].map(([a, b]) => [a * r * sx * side, b * r]), r * 0.05, gv(0.35, 0.6), { end: 0.1 });
    g.restore();
    return;
  }
  const RX = r * sx, RY = r;
  const lidY = (u) => -RY + 2 * RY * clamp(lid + slant * 0.5 * (u * inner));   // u = x / RX in -1..1
  const lidded = lid > 0 || slant > 0;
  g.save(); g.beginPath(); g.ellipse(0, 0, RX, RY, 0, 0, TAU); g.clip();
  g.fillStyle = gv(0.975); g.fillRect(-RX - 2, -RY - 2, RX * 2 + 4, RY * 2 + 4);
  const sg = g.createLinearGradient(0, -RY, 0, RY * 0.1); sg.addColorStop(0, gv(0.7, 0.75)); sg.addColorStop(1, gv(0.97, 0));
  g.fillStyle = sg; g.fillRect(-RX - 2, -RY - 2, RX * 2 + 4, RY * 1.2);
  const pr = pupil * r, px = look[0] * (RX - pr * 1.05), py = look[1] * (RY - pr * 1.05);
  g.fillStyle = "#080808"; g.beginPath(); g.ellipse(px, py, pr * Math.max(0.7, sx), pr, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,0.97)"; g.beginPath(); g.arc(px - pr * 0.36 * sx, py - pr * 0.38, pr * 0.34, 0, TAU); g.fill();
  if (lidded) {
    g.fillStyle = gv(plum); g.beginPath(); g.moveTo(-RX - 2, -RY - 2);
    for (let i = 0; i <= 24; i++) { const u = -1 + (i / 24) * 2; g.lineTo(u * RX, lidY(u)); }
    g.lineTo(RX + 2, -RY - 2); g.closePath(); g.fill();
    // lid shadow on the eyeball just under the lid
    g.strokeStyle = gv(0.55, 0.5); g.lineWidth = r * 0.12; g.beginPath();
    for (let i = 0; i <= 24; i++) { const u = -1 + (i / 24) * 2; const yy = lidY(u) + r * 0.08; i ? g.lineTo(u * RX, yy) : g.moveTo(u * RX, yy); } g.stroke();
  }
  if (low > 0) { const yy = RY - 2 * RY * low; g.fillStyle = gv(plum); g.fillRect(-RX - 2, yy, RX * 2 + 4, RY * 2); }
  g.restore();
  // outline ring, heavier low down
  const ring = [];
  for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU; ring.push([Math.cos(a) * RX, Math.sin(a) * RY]); }
  if (!lidded) taper(g, ring, (u) => r * (0.06 + 0.04 * Math.max(0, Math.sin(u * TAU))) + 0.4, LINE);
  else {
    const low2 = [];
    for (let i = 0; i <= 30; i++) { const a = -0.25 + (i / 30) * (Math.PI + 0.5); low2.push([Math.cos(a) * RX, Math.sin(a) * RY]); }
    taper(g, low2, (u) => r * (0.05 + 0.06 * Math.sin(Math.PI * u)), LINE);
    const up = [];
    for (let i = 0; i <= 20; i++) { const a = Math.PI + 0.15 + (i / 20) * (Math.PI - 0.3); up.push([Math.cos(a) * RX, Math.sin(a) * RY]); }
    taper(g, up, (u) => r * 0.05 * Math.sin(Math.PI * u), gv(0.3, 0.6));
    // the heavy lid line inside the ring, with a lash flick past the outer corner
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const u = -1 + (i / 28) * 2, yy = lidY(u), lim = Math.sqrt(Math.max(0, 1 - u * u)) * RY;
      if (Math.abs(yy) <= lim + 0.5) pts.push([u * RX, yy]);
    }
    if (pts.length > 1) {
      const outerEnd = side > 0 ? pts[pts.length - 1] : pts[0];
      const seq = side > 0 ? [...pts, [outerEnd[0] + RX * 0.18, outerEnd[1] - RY * 0.12]] : [[outerEnd[0] - RX * 0.18, outerEnd[1] - RY * 0.12], ...pts];
      taper(g, seq, (u) => r * (0.05 + 0.15 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.5)), "#070707");
    }
  }
  if (low > 0) { const yy = RY - 2 * RY * low; ink(g, [[-RX * 0.85, yy + RY * 0.1], [0, yy - RY * 0.04], [RX * 0.85, yy + RY * 0.1]], r * 0.07, gv(0.25, 0.8), { end: 0.1 }); }
  g.restore();
}
// brow arc above an eye (thin, grey-dark), and the facial-disc line down the outer cheek
function brow2(g, e, b) {
  if (!b) return;
  const { x, y, r, sx = 1, rot = 0, side = 1 } = e;
  const inner = -side;
  const lift = b.lift ?? 0, tilt = b.tilt ?? 0, w = b.w ?? 1.6, len = b.len ?? 1;
  g.save(); g.translate(x, y); g.rotate(rot);
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const u = -1 + 2 * i / 8;                     // -1 outer -> +1 inner
    const xx = (u * inner) * r * sx * 1.12 * len;
    const yy = -r * (1.28 + lift) + r * 0.22 * u * u - r * tilt * u * 0.5;
    pts.push([xx, yy]);
  }
  ink(g, pts, w * (b.heavy ?? 1), b.color ?? gv(0.18, 0.9), { end: 0.2, bias: b.bias ?? 0.55 });
  g.restore();
}

// ---------------------------------------------------------------- headphones
function band3(p, R) {
  // head-local band: cups at lateral ±cx, y = dy (head radii); arch apex above the crown
  const H = p.head, hp = p.hp, rx = H.rx, ry = H.ry;
  const cx = (hp.cx ?? 1.0) + 0, dy = hp.dy ?? 0.02;
  const yEnd = dy - (hp.r / ry) * 0.72, apex = -(hp.apex ?? 1.24);
  const bx = hp.bx ?? cx, yc = yEnd, bh = yEnd - apex;
  const D = (hp.depth ?? 24) / rx, T = (hp.thick ?? 9) / ry;
  const out = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI;
    const X = bx * Math.cos(th), Y = yc - bh * Math.sin(th);
    const nX = Math.cos(th) / bx, nY = -Math.sin(th) / bh, nl = Math.hypot(nX, nY), ox = nX / nl, oy = nY / nl;
    const pts = [];
    const sh = (q) => ({ x: q.x + (hp.bandDx || 0), y: q.y + (hp.bandDy || 0), z: q.z });
    for (const [k, z] of [[0, -D / 2], [0, D / 2], [T, D / 2], [T, -D / 2]]) pts.push(sh(R.L(X + ox * k, Y + oy * k, z)));
    out.push({ th, pts, mid: sh(R.L(X + ox * T * 0.5, Y + oy * T * 0.5, 0)), top: sh(R.L(X + ox * T, Y + oy * T, 0)) });
  }
  return out;
}
function hull(pts) {
  const P = pts.map((q) => [q.x, q.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function drawBandSegs(g, segs, light, which) {
  // which: "back" draws segments whose centre is behind the head centre plane, "front" the rest
  const pick = (s) => (which === "back" ? s.mid.z < -0.08 : s.mid.z >= -0.08);
  g.save(); g.lineJoin = "round";
  const hulls = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i], b = segs[i + 1];
    if (!pick(a) && !pick(b)) continue;
    hulls.push(hull([...a.pts, ...b.pts]));
  }
  const fillAll = (col) => { g.fillStyle = col; for (const h of hulls) { g.beginPath(); h.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fill(); } };
  // dark keyline (slightly grown), then the band body in dark padded grey
  g.strokeStyle = gv(0.04); g.lineWidth = 2.6;
  for (const h of hulls) { g.beginPath(); h.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.stroke(); }
  fillAll(gv(0.27));
  // streaks along the band and one highlight line along its lit edge
  const ed = (k) => segs.filter(pick).map((s) => { const q = s.pts; const A = q[2], B = q[3]; return [A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k]; });
  for (const [k, col, w] of [[0.3, gv(0.32, 0.8), 1.4], [0.55, gv(0.12, 0.8), 1.2], [0.72, gv(0.36, 0.7), 1.1]]) { const q = ed(k); if (q.length > 2) taper(g, sampleCurve(q, 3), (u) => w * Math.sin(Math.PI * clamp(u)) + 0.3, col); }
  const hl = [];
  for (const s of segs) if (pick(s)) hl.push([s.top.x, s.top.y]);
  const lit = ed(light[0] < 0 ? 0.06 : 0.94);
  if (lit.length > 2) taper(g, sampleCurve(lit, 3), (u) => 2.2 * Math.sin(Math.PI * clamp(u)) + 0.4, gv(0.72, 0.9));
  if (hl.length > 2) taper(g, sampleCurve(hl, 3), (u) => 1.6 * Math.sin(Math.PI * clamp(u)) + 0.3, gv(0.55, 0.8));
  g.restore();
}
// A headphone cup: a short cylinder on the head's lateral axis. c: centre (frame of owl units), ax: projected axis
// (unit, xy), az: axis z (toward the viewer), R radius, T thickness.
function cup3(g, c, ax, az, R, T, light, roll) {
  const minor = (k) => Math.max(R * Math.abs(az) * k, R * 0.16 * k);
  const at = (f) => add(c, mul(ax, T * (f - 0.5)));        // f = 0 inner face (head side) .. 1 outer face
  const up = perp(ax);                                     // the ellipse major axis
  const ang = Math.atan2(ax[1], ax[0]);
  const E = (q, rMaj, rMin) => (cc) => cc.ellipse(q[0], q[1], rMin, rMaj, ang, 0, TAU);
  const slab = (f0, f1, rMaj, fill) => {
    const a = at(f0), b = at(f1), m = minor(rMaj / R);
    g.fillStyle = fill;
    g.beginPath(); E(a, rMaj, m)(g); g.fill();
    g.beginPath(); E(b, rMaj, m)(g); g.fill();
    g.beginPath(); const q = [add(a, mul(up, rMaj)), add(b, mul(up, rMaj)), add(b, mul(up, -rMaj)), add(a, mul(up, -rMaj))]; q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  };
  g.save(); g.lineCap = "round";
  // ear pad (inner 0..0.5): dark, with rib rings
  slab(0, 0.52, R * 0.97, gv(0.08));
  g.strokeStyle = gv(0.3, 0.85); g.lineWidth = 1.0;
  for (let k = 1; k <= 5; k++) {
    const f = k * 0.09, q = at(f), m = minor(0.97);
    g.beginPath(); g.ellipse(q[0], q[1], m, R * 0.95, ang, -Math.PI / 2 * 0.98, Math.PI / 2 * 0.98, az < 0); g.stroke();
  }
  // shell (0.5..1): dark metal
  const gr = g.createLinearGradient(c[0] - up[0] * R, c[1] - up[1] * R, c[0] + up[0] * R, c[1] + up[1] * R);
  gr.addColorStop(0, gv(0.26)); gr.addColorStop(0.4, gv(0.13)); gr.addColorStop(1, gv(0.06));
  slab(0.48, 1, R, gr);
  const o = at(1), mO = minor(1);
  // bright rim on the lit side of the outer edge
  const litUp = (up[0] * light[0] + up[1] * light[1]) > 0 ? 1 : -1;
  g.strokeStyle = gv(0.85, 0.95); g.lineWidth = 1.8;
  if (az > 0.12) {
    g.beginPath(); g.ellipse(o[0], o[1], mO * 0.97, R * 0.97, ang, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
  } else {
    // edge-on: a bright line along the outer face
    const a = add(o, mul(up, -R * 0.85 * litUp)), b = add(o, mul(up, R * 0.3 * litUp));
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // plate (outer face) when it faces the viewer: rings + brushed metal + a small dark mark
  if (az > 0.12) {
    const rings = [[0.97, gv(0.12)], [0.8, gv(0.7)], [0.76, gv(0.16)], [0.66, null]];
    for (const [k, col] of rings) { if (!col) break; g.fillStyle = col; g.beginPath(); g.ellipse(o[0], o[1], mO * k, R * k, ang, 0, TAU); g.fill(); }
    g.save(); g.beginPath(); g.ellipse(o[0], o[1], mO * 0.66, R * 0.66, ang, 0, TAU); g.clip();
    const pg = g.createLinearGradient(o[0] - up[0] * R * 0.66, o[1] - up[1] * R * 0.66, o[0] + up[0] * R * 0.66, o[1] + up[1] * R * 0.66);
    pg.addColorStop(0, gv(0.66)); pg.addColorStop(0.5, gv(0.5)); pg.addColorStop(1, gv(0.28));
    g.fillStyle = pg; g.fillRect(o[0] - R, o[1] - R, R * 2, R * 2);
    const rr = rng(77);
    for (let i = 0; i < 16; i++) { const t = (rr() - 0.5) * 1.3 * mO, L = R * (0.3 + rr() * 0.7); const p0 = add(add(o, mul(ax, t)), mul(up, -L * 0.6)); const p1 = add(p0, mul(up, L)); g.strokeStyle = rr() < 0.5 ? gv(0.2, 0.35) : gv(0.85, 0.3); g.lineWidth = 0.8 + rr(); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); }
    g.restore();
    g.strokeStyle = gv(0.2, 0.8); g.lineWidth = 1.2; g.beginPath(); g.ellipse(o[0], o[1], mO * 0.4, R * 0.4, ang, 0, TAU); g.stroke();
    g.fillStyle = gv(0.08); g.beginPath(); g.ellipse(o[0] + ax[0] * 2, o[1] + ax[1] * 2, Math.max(1.2, mO * 0.1), R * 0.05, ang + Math.PI / 2, 0, TAU); g.fill();
  } else {
    // edge-on: a soft highlight down the middle of the shell
    const a = add(at(0.74), mul(up, -R * 0.7)), b = add(at(0.74), mul(up, R * 0.55));
    g.strokeStyle = gv(0.5, 0.55); g.lineWidth = Math.max(1, T * 0.12); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  // dark keyline round the whole cup
  g.strokeStyle = LINE; g.lineWidth = 1.8;
  const a = at(0), b = at(1), m = minor(1);
  g.beginPath(); g.ellipse(b[0], b[1], m, R, ang, 0, TAU); g.stroke();
  g.beginPath(); const q = [add(a, mul(up, R)), add(b, mul(up, R))]; g.moveTo(q[0][0], q[0][1]); g.lineTo(q[1][0], q[1][1]);
  const q2 = [add(a, mul(up, -R)), add(b, mul(up, -R))]; g.moveTo(q2[0][0], q2[0][1]); g.lineTo(q2[1][0], q2[1][1]); g.stroke();
  g.restore();
}
function cupsGeo(p, R) {
  const H = p.head, hp = p.hp;
  const out = [];
  for (const side of [1, -1]) {
    if (hp.only && hp.only !== side) continue;
    const c = R.L(side * (hp.cx ?? 1.0), hp.dy ?? 0.02, 0);
    const c1 = R.L(side * ((hp.cx ?? 1.0) + 0.3), hp.dy ?? 0.02, 0);
    const dxy = [c1.x - c.x, c1.y - c.y], dl = Math.hypot(dxy[0], dxy[1]);
    const ax = dl > 1e-3 ? [dxy[0] / dl, dxy[1] / dl] : [Math.cos(H.roll || 0), Math.sin(H.roll || 0)], az = (c1.z - c.z) / 0.3;
    const axLen = Math.sqrt(Math.max(0, 1 - az * az));
    // the cup straddles the head surface: its middle sits T/2 outside the lateral point
    const T = hp.T ?? 30;
    const cc = [c.x + ax[0] * T * 0.5 * axLen, c.y + ax[1] * T * 0.5 * axLen];
    const ov = (hp.cupOv && hp.cupOv[side]) || {};
    const az2 = ov.az ?? az, axL2 = Math.sqrt(Math.max(0, 1 - az2 * az2));
    out.push({ side, c: [cc[0] + (ov.dx || 0), cc[1] + (ov.dy || 0)], ax, az: az2, z: ov.z ?? c.z, T: (ov.T ?? T) * Math.max(0.08, axL2), R: ov.R ?? hp.r });
  }
  return out;
}

// ---------------------------------------------------------------- wings
// Folded wing: S shoulder, T tip, w width, side (+1: the convex outer edge is clockwise of S→T), n feather tips,
// bold: "inner" | "outer" (which edge carries the heavy keyline).
function foldedWing2(g, W, light) {
  const { S, T, w = 40, side = 1, n = 5, bold = "inner", rows = 2, seed = 11, tipFrom = 0.42, innerBow = 0.16 } = W;
  const d = sub(T, S), L = V.len(d), u = nrm(d), nn = mul(perp(u), side);
  const prof = (t) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(t), W.pow ?? 0.75)), 0.85);
  const outerAt = (t, k = 1) => add(add(S, mul(u, L * t)), mul(nn, w * prof(t) * k));
  const innerAt = (t) => add(add(S, mul(u, L * t)), mul(nn, -w * innerBow * Math.sin(Math.PI * t)));
  const outer = [], tips = [];
  const NT = 40;
  for (let i = 0; i <= NT; i++) {
    const t = i / NT;
    if (t < tipFrom) { outer.push(outerAt(t)); continue; }
    // serrated: feather tips with notches between them
    const f = (t - tipFrom) / (1 - tipFrom) * n, fr = f % 1;
    const notch = 1 - (W.notch ?? 0.2) * Math.pow(Math.sin(Math.PI * fr), 2) * (t < 0.98 ? 1 : 0);
    outer.push(outerAt(t, notch));
  }
  for (let k = 0; k < n; k++) tips.push(outerAt(tipFrom + (1 - tipFrom) * (k / n)));
  const inner = [];
  for (let i = NT; i >= 0; i--) inner.push(innerAt(i / NT));
  const poly = [...outer, ...inner.slice(1)];
  const path = polyPath(poly);
  plumage(g, path, { base: 0.965, shade: 0.8, light, depth: 14, blur: 7 });
  g.save(); g.beginPath(); path(g); g.clip();
  // covert rows: scalloped curves across the wing, bulging toward the tip
  const r = rng(seed);
  const rowsT = W.rowsT || [0.26, 0.44, 0.6].slice(0, rows);
  for (const t0 of rowsT) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12, t = t0 + 0.1 * Math.sin(Math.PI * f) * (W.rowBulge ?? 1);
      pts.push(mix(innerAt(t), outerAt(t), 0.04 + f * 0.92));
    }
    for (let i = 0; i + 2 <= pts.length - 1; i += 2) {
      const a = pts[i], b = pts[i + 2], m = mix(a, b, 0.5), bulge = add(m, mul(u, 5 + 2 * r()));
      fine(g, [a, bulge, b], 1.15, gv(0.4, 0.55 + 0.25 * r()));
    }
  }
  // primaries: separation lines from inside the wing out to each tip
  for (let k = 0; k < n; k++) {
    const tt = tipFrom + (1 - tipFrom) * ((k + 0.5) / n);
    const tipP = outerAt(Math.min(1, tt + 0.5 / n * (1 - tipFrom)), 0.82);
    const root = mix(innerAt(Math.max(0.1, tt - 0.3)), outerAt(Math.max(0.1, tt - 0.3)), 0.3 + 0.5 * (k + 0.5) / n);
    ink(g, [root, mix(root, tipP, 0.55), tipP], 1.3, gv(0.25, 0.75), { end: 0.15, bias: 0.8 });
    fine(g, [mix(root, tipP, 0.15), mix(root, tipP, 0.8)].map((q) => add(q, mul(nn, -3))), 0.7, gv(0.55, 0.4));
  }
  // soft shade along the inner edge
  softShade(g, path, (c) => { const q = sampleCurve([innerAt(0.1), innerAt(0.5), innerAt(0.9)], 4); c.moveTo(q[0][0], q[0][1]); q.forEach((p) => c.lineTo(p[0], p[1])); for (let i = q.length - 1; i >= 0; i--) c.lineTo(q[i][0] + nn[0] * 12, q[i][1] + nn[1] * 12); c.closePath(); }, 0.72, 0.5, 6);
  g.restore();
  // keylines
  const innerLine = inner.slice().reverse();
  ink(g, innerLine.filter((_, i) => i % 2 === 0), bold === "inner" ? (W.boldW ?? 3.2) : 1.8, LINE, { end: 0.25, bias: 0.5 });
  ink(g, outer.filter((_, i) => i % 2 === 0), bold === "outer" ? (W.boldW ?? 3.2) : 1.9, LINE, { end: 0.25, bias: 0.45, per: 3 });
  return { poly, tips };
}
// Fanned wing: lead = shoulder → wrist → tip (leading edge), tips = feather tips from the outer tip back to the body.
function fanWing2(g, W, light) {
  const { lead, tips, seed = 17, cov = 0.36, fw = 22, reach = 0.9 } = W;
  const n = tips.length;
  const leadAt = (t) => { const f = clamp(t) * (lead.length - 1), i = Math.min(lead.length - 2, Math.floor(f)); return mix(lead[i], lead[i + 1], f - i); };
  const rr0 = W.rootRange ? W.rootRange[0] : 1 - 0.3 / n * reach, rr1 = W.rootRange ? W.rootRange[1] : 1 - ((n - 0.7) / n) * reach;
  const roots = W.roots || (W.rootLine ? tips.map((tp, i) => mix(W.rootLine[0], W.rootLine[1], n > 1 ? i / (n - 1) : 0)) : tips.map((tp, i) => leadAt(rr0 + (rr1 - rr0) * (n > 1 ? i / (n - 1) : 0))));
  const r = rng(seed);
  // whole-wing base silhouette (so gaps between feathers are filled)
  const out = W.rootLine ? [W.rootLine[0], ...lead.slice(1)] : [...lead];
  for (let i = 0; i < n; i++) { out.push(tips[i]); if (i < n - 1) out.push(mix(mix(tips[i], tips[i + 1], 0.5), mix(roots[i], roots[i + 1], 0.5), W.notch ?? 0.14)); }
  if (W.rootLine) out.push(W.rootLine[1], mix(W.rootLine[1], W.rootLine[0], 0.5)); else out.push(mix(tips[n - 1], lead[0], 0.5));
  const base = (c) => smoothPath(c, out, true, 0.3);
  if (W.base !== false) plumage(g, base, { base: 0.96, shade: 0.8, light, depth: 12, blur: 6 });
  // feathers, inner first (outer primaries on top): long vanes with rounded-pointed tips; the visible lower edge
  // of each feather carries a thin dark line
  for (let i = n - 1; i >= 0; i--) {
    const tp = tips[i], rt = roots[i];
    const d = sub(tp, rt), Lf = V.len(d) || 1, uu = mul(d, 1 / Lf);
    let pn = perp(uu);
    const nxt = tips[Math.min(n - 1, i + 1)], prv = tips[Math.max(0, i - 1)];
    const ref = i < n - 1 ? sub(nxt, tp) : sub(tp, prv);
    if (ref[0] * pn[0] + ref[1] * pn[1] < 0) pn = mul(pn, -1);   // pn → the next (inner) feather's side
    const ww = Math.min(Lf * 0.24, fw);
    const P = (f, k) => add(add(rt, mul(uu, Lf * f)), mul(pn, ww * k));
    const vane = [P(0, -0.3), P(0.5, -0.36), P(0.86, -0.3), P(0.97, -0.12), P(1, 0.05), P(0.96, 0.3), P(0.82, 0.55), P(0.45, 0.62), P(0, 0.5)];
    const vp = (c) => smoothPath(c, vane, true, 0.45);
    plumage(g, vp, { base: 0.965, shade: 0.86, light, depth: 6, blur: 3.5 });
    ink(g, [P(0.25, 0.6), P(0.6, 0.6), P(0.84, 0.52), P(0.96, 0.3), P(1, 0.05), P(0.97, -0.12)], W.featherW ?? 1.5, gv(0.12, 0.9), { end: 0.2, bias: 0.75, per: 4 });
    fine(g, [P(0.2, 0.05), P(0.85, 0.08)], 0.8, gv(0.55, 0.4));
    for (let k = 0; k < 3; k++) flick(g, P(0.45 + 0.14 * k, 0.15), nrm(add(uu, mul(pn, 0.45))), Lf * 0.1, 0.7, gv(0.55, 0.35), 0.05);
  }
  // coverts band along the leading edge, its lower edge scalloped, with a second row inside
  const band = [...lead];
  const NB = 10, low = [];
  for (let i = NB; i >= 0; i--) {
    const t = i / NB, k = cov * (1 - 0.55 * t);
    const tgt = tips[Math.min(n - 1, Math.round((1 - t) * (n - 1)))];
    low.push(mix(leadAt(t), mix(tgt, roots[Math.min(n - 1, Math.round((1 - t) * (n - 1)))], 0.5), k));
  }
  band.push(...low);
  const bp = (c) => smoothPath(c, band, true, 0.4);
  plumage(g, bp, { base: 0.975, shade: 0.86, light, depth: 8, blur: 5 });
  for (let i = 0; i < low.length - 1; i++) { const a = low[i], b = low[i + 1], m = mix(a, b, 0.5); const dd = nrm(perp(sub(b, a))); fine(g, [a, add(m, mul(dd, -4)), b], 1.2, gv(0.3, 0.7)); }
  // inner row of small covert scallops
  const row2 = low.map((q, i) => mix(q, leadAt(1 - i / NB), 0.5));
  for (let i = 0; i < row2.length - 1; i++) { const a = row2[i], b = row2[i + 1], m = mix(a, b, 0.5); const dd = nrm(perp(sub(b, a))); fine(g, [a, add(m, mul(dd, -3)), b], 0.9, gv(0.45, 0.5)); }
  ink(g, lead, W.leadW ?? 2.8, LINE, { end: 0.3, bias: 0.6 });
  return { poly: out, tips };
}

// A wing drawn from an explicit outline (bent poses): pts outline, lines = feather separations, bold = keyline run
function shapeWing2(g, W, light) {
  const path = (c) => smoothPath(c, W.pts, true, 0.4);
  plumage(g, path, { base: 0.965, shade: 0.8, light, depth: 12, blur: 6 });
  g.save(); g.beginPath(); path(g); g.clip();
  for (const [a, b] of W.lines || []) ink(g, [a, mix(a, b, 0.5), b], 1.3, gv(0.25, 0.75), { end: 0.15 });
  softShade(g, path, (c) => c.ellipse(W.pts[0][0], W.pts[0][1], 40, 30, 0, 0, TAU), 0.75, 0.4, 8);
  g.restore();
  ink(g, [...W.pts, W.pts[0]], 1.9, LINE, { end: 0.3, per: 4 });
  if (W.bold) ink(g, W.bold, 3, LINE, { end: 0.3, per: 4 });
  return { poly: W.pts, tips: [] };
}

// ---------------------------------------------------------------- feet and tail
function foot2(g, f) {
  const { x, y, dir = Math.PI / 2, size = 40, leg = 20, flat = 0.5, w = 0.24, spread = 0.55, trousers = 0 } = f;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const tw = size * w;
  const stroke2 = (pts, wd) => {
    for (const [col, ww] of [[LINE, wd + 2.4], [gv(0.9), wd]]) { g.strokeStyle = col; g.lineWidth = ww; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
  };
  if (leg > 0) {
    stroke2([[x, y - leg - 14], [x, y]], tw * 1.1);
    g.strokeStyle = gv(0.35, 0.7); g.lineWidth = 0.9;
    for (let k = 1; k < 4; k++) { const yy = y - leg * k / 4; g.beginPath(); g.moveTo(x - tw * 0.45, yy); g.lineTo(x + tw * 0.45, yy + 1.2); g.stroke(); }
  }
  const toes = [[dir + Math.PI + 0.4, 0.36], [dir - spread, 0.85], [dir + spread, 0.85], [dir, 1.0]];
  for (const [a, k] of toes) {
    const Ln = size * k;
    let d = [Math.cos(a), Math.sin(a) * flat + 0.12]; d = nrm(d);
    const nn = [-d[1], d[0]];
    const P = (t) => [x + d[0] * Ln * t, y + d[1] * Ln * t + Math.abs(0.07 * Ln) * Math.sin(Math.PI * t)];
    const pts = [P(0), P(0.36), P(0.7), P(1)];
    for (let i = 0; i < 3; i++) stroke2([pts[i], pts[i + 1]], tw * (1 - 0.16 * i));
    g.strokeStyle = gv(0.3, 0.75); g.lineWidth = 0.9;
    for (const t of [0.2, 0.36, 0.52, 0.7, 0.85]) { const p = P(t); g.beginPath(); g.moveTo(p[0] - nn[0] * tw * 0.4, p[1] - nn[1] * tw * 0.4); g.lineTo(p[0] + nn[0] * tw * 0.4, p[1] + nn[1] * tw * 0.4); g.stroke(); }
    // dark hooked claw
    const e = pts[3], cl = tw * 1.3;
    const tip = [e[0] + d[0] * cl * 0.85, e[1] + d[1] * cl * 0.85 + cl * 0.6];
    const b0 = add(e, mul(nn, -tw * 0.32)), b1 = add(e, mul(nn, tw * 0.32)), mid = [e[0] + d[0] * cl * 0.75, e[1] + d[1] * cl * 0.75 - tw * 0.15];
    g.fillStyle = gv(0.12); g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(mid[0], mid[1] - tw * 0.2, tip[0], tip[1]); g.quadraticCurveTo(mid[0] - d[0] * tw * 0.2, mid[1] + tw * 0.25, b1[0], b1[1]); g.closePath(); g.fill();
    g.strokeStyle = gv(0.6, 0.7); g.lineWidth = 0.8; g.beginPath(); g.moveTo(mid[0], mid[1] - tw * 0.1); g.quadraticCurveTo(tip[0] - d[0] * 2, tip[1] - 4, tip[0], tip[1]); g.stroke();
  }
  // feathered trousers over the top of the leg
  if (trousers > 0 && leg > 0) {
    const tw2 = tw * 2.1 * trousers, top = y - leg - 12, bot = y - leg * 0.35;
    const pts = [[x - tw2, top], [x - tw2 * 1.05, bot - 6], [x - tw2 * 0.55, bot], [x - tw2 * 0.2, bot - 4], [x + tw2 * 0.15, bot + 1], [x + tw2 * 0.55, bot - 3], [x + tw2 * 1.02, bot - 7], [x + tw2, top]];
    const pp = (c) => smoothPath(c, pts, true, 0.3);
    g.fillStyle = gv(0.93); g.beginPath(); pp(g); g.fill();
    ink(g, pts.slice(1, 7), 1.5, LINE, { end: 0.3, per: 3 });
    for (let k = 0; k < 4; k++) flick(g, [x - tw2 * 0.6 + k * tw2 * 0.4, top + 4], [0.1, 1], (bot - top) * 0.7, 0.8, gv(0.5, 0.45));
  }
  g.restore();
}
function tail2(g, t, light) {
  const { base, tip, w = 26, n = 3 } = t;
  const d = sub(tip, base), L = V.len(d), u = nrm(d), pn = perp(u);
  for (let i = n - 1; i >= 0; i--) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const b0 = add(base, mul(pn, f * w * 0.9)), e = add(add(b0, mul(u, L * (1 - 0.1 * Math.abs(f)))), mul(pn, f * w * (t.fan ?? 0.8)));
    const uu = nrm(sub(e, b0)), pp = perp(uu), hw = w * 0.34;
    const sh = [add(b0, mul(pp, -hw)), add(add(b0, mul(uu, L * 0.6)), mul(pp, -hw * 0.85)), add(e, mul(uu, -hw * 0.3)), e, add(add(e, mul(uu, -hw * 1.1)), mul(pp, hw * 0.5)), add(add(b0, mul(uu, L * 0.5)), mul(pp, hw * 0.8)), add(b0, mul(pp, hw))];
    const path = (c) => smoothPath(c, sh, true, 0.4);
    plumage(g, path, { base: 0.95, shade: 0.78, light, depth: 6, blur: 4 });
    ink(g, sh.slice(0, 5), 1.7, LINE, { end: 0.2, per: 4 });
    fine(g, [mix(b0, e, 0.1), mix(b0, e, 0.85)], 0.7, gv(0.5, 0.45));
  }
}

// ---------------------------------------------------------------- the whole owl
export function drawOwl2(g, p) {
  const light = p.light || [-0.55, -0.83];
  const H = p.head;
  const R = headRig(H);
  const sil = silhouette(p);
  const poly = sil.poly, path = polyPath(poly);
  const hp = p.hp;
  const cups = hp ? cupsGeo(p, R) : [];
  const segs = hp ? band3(p, hp.bandYaw !== undefined ? headRig({ ...H, yaw: hp.bandYaw }) : R) : [];
  g.lineCap = "round"; g.lineJoin = "round";
  // --- behind the body
  if (p.tail) tail2(g, p.tail, light);
  const wingFn = (w) => (w.type === "fan" ? fanWing2 : w.type === "shape" ? shapeWing2 : foldedWing2);
  for (const w of p.wings || []) if (w.layer === "back") wingFn(w)(g, w, light);
  for (const f of p.feet || []) foot2(g, f);
  if (hp) {
    drawBandSegs(g, segs, light, "back");
    for (const c of cups) if (c.z < -0.3) cup3(g, c.c, c.ax, c.az, c.R, c.T, light, H.roll || 0);
  }
  // --- plumage
  plumage(g, path, { base: 0.955, shade: p.shade ?? 0.74, light, depth: p.depth ?? 34, blur: p.blur ?? 20, keep: p.keep });
  g.save(); g.beginPath(); path(g); g.clip();
  // belly/back shade (turned from the light) and a soft shadow under the head
  softShade(g, path, (c) => c.ellipse(p.body.x - light[0] * p.body.rx * 0.75, p.body.y - light[1] * p.body.ry * 0.6, p.body.rx * 0.75, p.body.ry * 0.7, 0, 0, TAU), p.bellyV ?? 0.7, p.bellyA ?? 0.45, 26);
  const cen = [p.body.x, p.body.y];
  const chestTop = H.y + H.ry * (p.chestFrom ?? 0.7);
  if (p.chest !== false) scallops(g, poly, { x0: p.body.x - p.body.rx, x1: p.body.x + p.body.rx, y0: chestTop, y1: p.body.y + p.body.ry * (p.chestTo ?? 0.35), dy: 12, dx: 16, depth: 4, color: 0.5, alpha: p.chestA ?? 0.3, w: 1.0, seed: (p.seed ?? 31) + 1, light, cx: 0, cy: 0, inset: 14, skip: 0.45 });
  fur(g, poly, { n: p.furN ?? 170, len: 11, color: 0.46, alpha: 0.34, flow: p.flow || [0, 1], light, c: cen, seed: (p.seed ?? 31) + 2, region: (q) => q[1] > H.y + H.ry * 0.35 });
  // head texture: fine strokes fanning from the face, heavier along the crown
  fur(g, poly, { n: 60, len: 9, color: 0.5, alpha: 0.25, flow: [0, -1], light, c: [H.x, H.y], seed: (p.seed ?? 31) + 3, region: (q) => q[1] < H.y + H.ry * 0.3, spread: 1.2 });
  g.restore();
  rimStrokes(g, poly, { light, flow: p.flow || [0, 1], seed: (p.seed ?? 31) + 4, len: 13, alpha: 0.55 });
  outlineInk(g, poly, light, { w: p.lineW ?? 2.1, heavy: 1.5 });
  // fluffy notches: a few inward strokes at the lower edge
  // --- face
  const E = p.eyes || {};
  const eyesDrawn = [];
  if (E && !E.hidden) {
    for (const side of [-1, 1]) {
      const o = { ...E, ...(side < 0 ? E.left : E.right) };
      if (o.hidden) continue;
      const az = side * (o.az ?? 0.46), el = o.el ?? 0.0;
      const q = R.P(az, el, 1.0);
      if (q.z < 0.12) continue;
      const sx = clamp(q.z * 1.05, 0.3, 1);
      const e = { x: q.x + (o.dx || 0), y: q.y + (o.dy || 0), r: o.r ?? 23.5, sx, rot: (H.roll || 0) + (o.rot || 0), look: o.look || [0, 0], pupil: o.pupil ?? 0.4, lid: o.lid ?? 0, slant: o.slant ?? 0, low: o.low ?? 0, side, closed: o.closed || false };
      eyesDrawn.push([e, o]);
    }
    // facial disc: brows and a V between them, lines down the outer cheeks
    for (const [e, o] of eyesDrawn) {
      if (o.brow !== false) brow2(g, e, { lift: 0.02, tilt: -0.35, w: 1.4, color: gv(0.3, 0.85), ...(o.brow || {}) });
      if (o.disc !== false && !e.closed) {
        const s = e.side, r0 = e.r, k = e.sx;
        g.save(); g.translate(e.x, e.y); g.rotate(e.rot);
        ink(g, [[s * r0 * k * 1.25, -r0 * 1.1], [s * r0 * k * 1.75, -r0 * 0.1], [s * r0 * k * 1.6, r0 * 1.0], [s * r0 * k * 1.1, r0 * 1.75]], 1.1, gv(0.5, 0.45), { end: 0.1 });
        g.restore();
      }
    }
    for (const [e] of eyesDrawn) eye2(g, e);
  }
  // beak
  if (p.beak && !p.beak.hidden) {
    const b = p.beak;
    const q = R.P(b.az ?? 0, b.el ?? -0.2, 1.0);
    if (q.z > -0.2) {
      if (b.profile) beakSide(g, { x: q.x + (b.dx || 0), y: q.y + (b.dy || 0), dir: b.dir ?? -1, l: b.l ?? 30, h: b.h ?? 30, rot: (H.roll || 0) + (b.rot || 0), open: b.open || 0 });
      else drawBeak(g, { x: q.x + (b.dx || 0), y: q.y + (b.dy || 0), w: b.w ?? 28, l: b.l ?? 32, rot: (H.roll || 0) + (b.rot || 0), turn: b.turn ?? Math.sin(H.yaw || 0) * 1.2, open: b.open || 0, smirk: b.smirk || 0 });
    }
  }
  if (p.bandS) { const [dx, dy, size, rot, sx = 1, sy = 1, cross = 1.45] = p.bandS; bandage2(g, { x: H.x + dx, y: H.y + dy, size, rot, sx, sy, cross }); }
  if (p.sweat) {
    const [dx, dy] = p.sweat, x = H.x + dx, y = H.y + dy;
    g.save(); g.fillStyle = gv(0.85); g.strokeStyle = LINE; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y - 6); g.quadraticCurveTo(x + 4.2, y + 1, x + 2.6, y + 3.4); g.arc(x, y + 3, 3, 0.2, Math.PI - 0.2); g.quadraticCurveTo(x - 4.2, y + 1, x, y - 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = gv(0.3); g.beginPath(); g.arc(x + 0.6, y + 3.4, 1.2, 0, TAU); g.fill(); g.restore();
  }
  // --- front wings, then headphones on top of the head
  const wingOut = [];
  for (const w of p.wings || []) if (w.layer !== "back") wingOut.push(wingFn(w)(g, w, light));
  if (hp) {
    for (const c of cups) if (c.z >= -0.3) cup3(g, c.c, c.ax, c.az, c.R, c.T, light, H.roll || 0);
    drawBandSegs(g, segs, light, "front");
  }
  if (p.extra) p.extra(g, { R, poly, wings: wingOut, cups });
  return { poly, R, wings: wingOut };
}
// the crossed plasters as the source draws them: two equal rounded strips in an X, pale with a dark keyline,
// a lighter pad where they cross, perforation dots
function bandage2(g, { x, y, size = 50, rot = 0.6, sx = 1, sy = 1, cross = 1.45 }) {
  g.save(); g.translate(x, y); g.scale(sx, sy); g.rotate(rot);
  const L = size, w = size * 0.3;
  const strip = (a, top) => {
    g.save(); g.rotate(a);
    g.fillStyle = gv(0.9); g.beginPath(); g.roundRect(-L / 2, -w / 2, L, w, w / 2); g.fill();
    g.fillStyle = gv(0.7, 0.35); g.beginPath(); g.roundRect(-L / 2, w * 0.1, L, w * 0.4, w * 0.2); g.fill();
    if (top) { g.fillStyle = gv(0.96); g.beginPath(); g.roundRect(-w * 0.6, -w * 0.42, w * 1.2, w * 0.84, w * 0.12); g.fill(); g.strokeStyle = gv(0.35, 0.8); g.lineWidth = 0.9; g.stroke(); }
    g.fillStyle = gv(0.25, 0.8);
    for (const t of [-0.38, -0.3, 0.3, 0.38]) for (const q of [-0.18, 0.18]) { g.beginPath(); g.arc(t * L, q * w, 0.75, 0, TAU); g.fill(); }
    g.strokeStyle = LINE; g.lineWidth = 1.4; g.beginPath(); g.roundRect(-L / 2, -w / 2, L, w, w / 2); g.stroke();
    g.restore();
  };
  strip(0, false); strip(cross, true);
  g.restore();
}
// profile beak (pointing along dir = -1 left / +1 right): hooked upper mandible, darker gape
function beakSide(g, b) {
  const { x, y, dir = -1, l = 30, h = 30, rot = 0, open = 0 } = b;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(dir, 1);
  // origin = the base top; the beak runs toward +x (after the flip toward dir)
  const up = [[-l * 0.15, -h * 0.35], [l * 0.35, -h * 0.3], [l * 0.85, -h * 0.02], [l * 1.0, h * 0.35], [l * 0.82, h * 0.62], [l * 0.7, h * 0.34], [l * 0.3, h * 0.28], [-l * 0.1, h * 0.3]];
  const path = (c) => smoothPath(c, up, true, 0.4);
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(0.84); g.fill();
  g.fillStyle = gv(0.62, 0.8); g.beginPath(); g.ellipse(l * 0.55, h * 0.2, l * 0.4, h * 0.2, 0.2, 0, TAU); g.fill();
  g.fillStyle = gv(0.97, 0.9); g.beginPath(); g.ellipse(l * 0.3, -h * 0.12, l * 0.3, h * 0.1, 0.1, 0, TAU); g.fill();
  g.restore();
  // lower mandible
  g.fillStyle = gv(0.55); g.beginPath(); smoothPath(g, [[l * 0.1, h * 0.3], [l * 0.6, h * (0.36 + open)], [l * 0.55, h * (0.5 + open)], [l * 0.05, h * 0.5]], true, 0.4); g.fill();
  ink(g, [up[0], up[1], up[2], up[3], up[4]], 2.0, LINE, { end: 0.25, per: 4 });
  ink(g, [up[4], up[5], up[6], up[7]], 1.5, LINE, { end: 0.2, per: 4 });
  ink(g, [[l * 0.05, h * 0.5], [l * 0.55, h * (0.5 + open)]], 1.2, LINE, { end: 0.2 });
  g.fillStyle = LINE; g.beginPath(); g.ellipse(l * 0.18, -h * 0.05, 1.8, 1.4, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- cached layer (placement in frame px)
// place: { x, y (frame position of the root), s, rot, flip, res }
export function owl2Layer(pose, place, canvas) {
  const { x, y, s = 1, rot = 0, flip = false, res = 1 } = place;
  const k = s * res;
  // bounding box in owl units: silhouette + wings + feet + tail + headphones, generous margin
  const H = pose.head, B = pose.body;
  const pts = [[H.x - H.rx - 70, H.y - H.ry * 1.6 - 60], [H.x + H.rx + 70, H.y - H.ry * 1.6 - 60], [B.x - B.rx - 60, B.y + B.ry + 90], [B.x + B.rx + 60, B.y + B.ry + 90]];
  for (const w of pose.wings || []) for (const q of w.pts ? w.pts : w.lead ? [...w.lead, ...w.tips] : [w.S, w.T]) pts.push(q);
  if (pose.tail) pts.push(pose.tail.tip);
  for (const e of pose.ext || []) pts.push(e);
  // to frame
  const c = Math.cos(rot), sn = Math.sin(rot), fx = flip ? -1 : 1;
  const F = (q) => [x + (q[0] * fx * c - q[1] * sn) * s, y + (q[0] * fx * sn + q[1] * c) * s];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) { const f = F(q); x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0]); y1 = Math.max(y1, f[1]); }
  const pad = 40 * s;
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad); x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
  const cv = canvas || document.createElement("canvas");
  cv.width = Math.max(4, Math.round((x1 - x0) * res)); cv.height = Math.max(4, Math.round((y1 - y0) * res));
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  g.translate(x, y); g.rotate(rot); g.scale(fx * s, s);
  setPPU(k);
  // light in owl units: frame light rotated back and mirrored
  const lf = place.lightFrame || [-0.55, -0.83];
  const lr = V.rot(lf, -rot);
  const out = drawOwl2(g, { ...pose, light: [lr[0] * fx, lr[1]] });
  setPPU(1);
  const anchors = {};
  for (const [kk, q] of Object.entries(pose.anchors || {})) anchors[kk] = F(q);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors, F, poly: out.poly.map(F) };
}
