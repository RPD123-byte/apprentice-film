// Spread wings drawn feather by feather in frame px, from measured feather tips (the kit's spread wing is a simple
// paddle fan; the s24 close-ups show every primary). spec:
//   lead  [[x,y]...]  the leading edge, shoulder -> wing tip
//   root  [[x,y]...]  where the flight feathers leave the covert band (feather i starts at u = i/(n-1) along it)
//   tips  [[x,y]...]  measured feather tips, leading feather first
//   w     feather width (px) at its widest, or [w0, w1] leading -> trailing
//   cov   covert rows (number of scalloped rows along the leading edge), covW = band depth (px)
//   order "lead-top" (leading feather drawn last, on top — default) or "trail-top"
import { gv, LINE, ink, V } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

function arcLen(poly) { const L = [0]; for (let i = 1; i < poly.length; i++) L.push(L[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])); return L; }
function at(poly, L, u) {
  const d = u * L[L.length - 1];
  let i = 1; while (i < L.length - 1 && L[i] < d) i++;
  const a = poly[i - 1], b = poly[i], f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

// one flight feather from root to tip, half-width profile swelling near the root, slightly curved toward `bend`
export function featherOutline(root, tip, W, bend = 0.06) {
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const pts = [], back = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hw = W * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(0.999, 0.12 + 0.88 * t)), 0.55) * (1 - 0.25 * t) * (t > 0.85 ? Math.pow((1 - t) / 0.15, 0.5) : 1);
    const c = V.add(root, V.add(V.mul(u, L * t), V.mul(n, L * bend * Math.sin(Math.PI * t))));
    pts.push(V.add(c, V.mul(n, hw))); back.push(V.add(c, V.mul(n, -hw)));
  }
  return [...pts, ...back.reverse()];
}

export function paintWing(g, spec) {
  const { lead, root, tips, w = 34, cov = 2, covW = 50, seed = 1, order = "lead-top", bend = 0.05, hatch = 1, lw = 2.0, base = null } = spec;
  const r = rng(seed);
  if (base) {
    // the wing's inner mass (arm and shoulder) as one soft white shape under the feathers
    g.save(); g.beginPath(); smoothPath(g, base, true);
    g.fillStyle = gv(0.93); g.fill();
    g.lineWidth = lw; g.strokeStyle = LINE; g.stroke();
    g.restore();
  }
  const rp = sampleCurve(root, 8), rL = arcLen(rp);
  const n = tips.length;
  const feathers = tips.map((tip, i) => {
    const u = n === 1 ? 0 : i / (n - 1);
    const rt = at(rp, rL, u);
    const W = Array.isArray(w) ? w[0] + (w[1] - w[0]) * u : w;
    return { root: rt, tip, W, out: featherOutline(rt, tip, W, bend * (i % 2 ? 1 : 0.6)) };
  });
  const idx = feathers.map((_, i) => i);
  if (order === "lead-top") idx.reverse();
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  for (const i of idx) {
    const f = feathers[i];
    const u = V.nrm(V.sub(f.tip, f.root)), L = V.len(V.sub(f.tip, f.root));
    g.beginPath(); smoothPath(g, f.out, true);
    const gr = g.createLinearGradient(f.root[0], f.root[1], f.tip[0], f.tip[1]);
    gr.addColorStop(0, gv(0.8)); gr.addColorStop(0.35, gv(0.93)); gr.addColorStop(1, gv(0.95));
    g.fillStyle = gr; g.fill();
    g.lineWidth = lw; g.strokeStyle = LINE; g.stroke();
    // fine grey hatch strokes from the root along the vane (the source's feather texture)
    if (hatch) {
      const nn = V.perp(u);
      const k = Math.max(3, Math.round(f.W / 7));
      for (let j = 0; j < k; j++) {
        const off = (j / (k - 1) - 0.5) * f.W * 0.6;
        const a = V.add(V.add(f.root, V.mul(u, L * (0.08 + 0.1 * r()))), V.mul(nn, off));
        const b = V.add(a, V.mul(u, L * (0.25 + 0.3 * r())));
        ink(g, [a, V.mix(a, b, 0.5), b], 1.1 * hatch, gv(0.35, 0.55), { end: 0.1, bias: 0.3 });
      }
    }
  }
  // covert band between the leading edge and the feather roots: a white base, then rows of shorter overlapping
  // feathers pointing the same way as the flight feathers (the source's scalloped layers)
  const lp = sampleCurve(lead, 8);
  const band = [...lp, ...[...rp].reverse()];
  g.beginPath(); smoothPath(g, band, true);
  g.fillStyle = gv(0.95); g.fill();
  const lL = arcLen(lp);
  const dirAt = (u) => {
    const x = u * (n - 1), i0 = Math.max(0, Math.min(n - 1, Math.floor(x))), i1 = Math.min(n - 1, i0 + 1), f = x - i0;
    const a = V.nrm(V.sub(feathers[i0].tip, feathers[i0].root)), b = V.nrm(V.sub(feathers[i1].tip, feathers[i1].root));
    const La = V.len(V.sub(feathers[i0].tip, feathers[i0].root)), Lb = V.len(V.sub(feathers[i1].tip, feathers[i1].root));
    return { d: V.nrm(V.mix(a, b, f)), L: La + (Lb - La) * f, W: feathers[i0].W + (feathers[i1].W - feathers[i0].W) * f };
  };
  for (let row = 0; row < cov; row++) {
    const f = cov === 1 ? 0.5 : row / (cov - 1);          // 0 = next to the flight feathers, 1 = at the leading edge
    const m = Math.max(3, Math.round(n * (1.2 + 0.5 * row)));
    const k = 0.5 - 0.14 * row;                            // covert length vs the flight feather
    const list = [];
    for (let j = 0; j < m; j++) {
      const u = (j + 0.5 + (row % 2) * 0.35) / (m + 0.35);
      const base = V.mix(at(rp, rL, u), at(lp, lL, u), 0.15 + 0.7 * f);
      const { d, L, W } = dirAt(u);
      list.push({ base, d, L: L * k * (0.9 + 0.2 * r()), W: W * (0.75 - 0.1 * row) });
    }
    if (order === "lead-top") list.reverse();
    for (const c of list) {
      const tip = V.add(c.base, V.mul(c.d, c.L));
      const out = featherOutline(V.add(c.base, V.mul(c.d, -c.L * 0.25)), tip, c.W, 0.03);
      g.beginPath(); smoothPath(g, out, true);
      g.fillStyle = gv(0.95); g.fill();
      // keyline only round the tip half (the root is buried under the next row)
      const half = out.slice(Math.round(out.length * 0.3), Math.round(out.length * 0.7));
      ink(g, half, lw * 0.9, LINE, { end: 0.15 });
      if (hatch) { const nn = V.perp(c.d); for (let q = -1; q <= 1; q++) { const a = V.add(V.add(c.base, V.mul(c.d, c.L * 0.1)), V.mul(nn, q * c.W * 0.2)); ink(g, [a, V.add(a, V.mul(c.d, c.L * 0.45))], 0.9, gv(0.4, 0.5), { end: 0.1 }); } }
    }
  }
  // leading edge keyline
  ink(g, lead, lw * 1.3, LINE, { end: 0.4 });
  g.restore();
}
