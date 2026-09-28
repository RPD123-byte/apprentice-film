// Generic painter for the designer key drawings B–E (A has its own, older painter in keyA.js).
// A spec S describes one key frame in frame coordinates: measured part outlines (shapes.js) + hand-placed features.
import { ink, lock, strands, hatch, combStrokes, stubble, softValue, sweat, poly, blob, ell, linear, radial, rng, taper, INK, DARK, TAU, sampleCurve, smoothPath } from "./kit.js";
import { drawIris } from "./keyA.js";

const pathOf = (p) => (p.blob ? blob(p.pts) : poly(p.pts || p));
function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }

// white strands through a black hair polygon, following a flow direction (radians) that may vary across it
export function hairStrands(o, pts, flow, seed, density = 1) {
  const r = rng(seed), [x0, y0, x1, y1] = bbox(pts);
  const area = (x1 - x0) * (y1 - y0);
  const n = Math.round(Math.min(160, area / 2600) * density);
  o.save(); o.beginPath(); poly(pts)(o); o.clip();
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    const a = (typeof flow === "function" ? flow(x, y) : flow) + (r() - 0.5) * 0.25;
    const L = 40 + r() * 110, bend = (r() - 0.5) * 0.5;
    const pts2 = [];
    for (let k = 0; k <= 6; k++) { const u = k / 6, aa = a + bend * u; pts2.push([x + Math.cos(aa) * L * u, y + Math.sin(aa) * L * u]); }
    const w = 0.8 + r() * 1.6;
    o.globalAlpha = 0.35 + 0.5 * r();
    taper(o, pts2, (u) => w * Math.pow(Math.sin(Math.PI * u), 0.6) + 0.1, INK);
  }
  o.restore();
}
// the eye: white, iris, heavy upper lid, lower lid with lashes and a hatched bag underneath
export function drawEye(o, E, k = 0) {
  const op = E.open, n = op.length;
  o.fillStyle = "#f3f2ee"; o.beginPath(); smoothPath(o, op, true); o.fill();
  if (E.c) drawIris(o, op, E.c, E.r, E.look || [0, 0]);
  const iu = E.upper ?? 5;                              // index where the upper lid ends
  const up = op.slice(0, iu + 1), low = [...op.slice(iu), op[0]];
  ink(o, up, E.lidW ?? 6, DARK, "mid");
  if (E.crease !== false) ink(o, up.slice(1, Math.max(2, iu)).map(([x, y]) => [x, y - (E.creaseDy ?? 15)]), 2, "rgba(10,10,10,0.75)");
  ink(o, low, 2.2, DARK);
  combStrokes(o, low, { dir: [0, 1], len: [6, 18], step: 5, w: 1.1, alpha: 0.5, seed: 60 + k });
  if (E.bag !== false) combStrokes(o, low.map(([x, y]) => [x, y + 9]), { dir: E.bagDir || [0.1, 1], len: [12, 36], step: 4, w: 1.05, alpha: 0.42, seed: 70 + k });
}
function brow(o, pts, seed, lean = -0.9) {
  const q = sampleCurve(pts, 10), rr = rng(seed);
  for (let i = 0; i < q.length; i++) for (let k = 0; k < 3; k++) {
    const p = q[i], L = 9 + rr() * 11, a = lean + (rr() - 0.5) * 0.5;
    const x = p[0] + (rr() - 0.5) * 6, y = p[1] + (rr() - 0.5) * 10;
    taper(o, [[x, y], [x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2], [x + Math.cos(a) * L, y + Math.sin(a) * L]], (u) => 2.3 * Math.sin(Math.PI * u) + 0.3, DARK);
  }
}

export function paintFigure(P, S) {
  const o = P.o;
  // ---- the lit figure (shirt / arm): pale cloth
  for (const t of S.torso) P.fill(pathOf(t), t.v ?? 0.9, t.angle ?? 1.5, { style: 2 });
  for (const s of S.shade || []) softValue(P, pathOf(s), s.v, s.blur ?? 18, s.alpha ?? 0.85);
  for (const h of S.hatch || []) {
    const pts = h.pts; const b = bbox(pts);
    hatch(o, poly(pts), [b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20], { angle: h.angle ?? 0.6, spacing: h.spacing ?? 6, len: h.len || [30, 90], w: h.w ?? 1.2, alpha: h.alpha ?? 0.6, seed: h.seed ?? 5, density: h.density ?? 1 });
    if (h.cross) hatch(o, poly(pts), [b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20], { angle: h.cross, spacing: (h.spacing ?? 6) * 1.3, len: h.len || [30, 90], w: (h.w ?? 1.2) * 0.85, alpha: (h.alpha ?? 0.6) * 0.75, seed: (h.seed ?? 5) + 1, density: 0.8 });
  }
  for (const f of S.folds || []) combStrokes(o, f.pts, { dir: f.dir || [0, 1], len: f.len || [60, 160], step: f.step ?? 10, w: f.w ?? 1.4, alpha: f.alpha ?? 0.5, seed: f.seed ?? 9, bend: 0.12 });
  // ---- skin (face, neck, ear, hands)
  for (const s of S.skin || []) P.fill(pathOf(s), s.v ?? 0.96, 1.2, { style: 2 });
  for (const s of S.skinShade || []) softValue(P, pathOf(s), s.v, s.blur ?? 14, s.alpha ?? 0.85);
  for (const h of S.skinHatch || []) {
    const b = bbox(h.pts);
    hatch(o, poly(h.pts), [b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20], { angle: h.angle ?? 1, spacing: h.spacing ?? 5, len: h.len || [15, 45], w: h.w ?? 1.05, alpha: h.alpha ?? 0.5, seed: h.seed ?? 11, density: h.density ?? 1 });
    if (h.cross) hatch(o, poly(h.pts), [b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20], { angle: h.cross, spacing: (h.spacing ?? 5) * 1.2, len: h.len || [15, 45], w: (h.w ?? 1.05) * 0.9, alpha: (h.alpha ?? 0.5) * 0.8, seed: (h.seed ?? 11) + 1 });
  }
  // measured dark regions inside the silhouette (hair tips over the shirt, the shadow under the jaw)
  for (const d of S.dark || []) { P.light(poly(d), 0.03); o.fillStyle = "rgba(7,7,7,0.92)"; o.beginPath(); poly(d)(o); o.fill(); }
  for (const s of S.stubble || []) stubble(o, s[0], s[1], s[2], s[3], s[4], s[5] ?? 91, { alpha: s[6] ?? 0.5 });
  for (const l of S.lines || []) ink(o, l.pts, l.w ?? 2.4, l.color ?? DARK, l.prof ?? "mid");
  for (const [x, y, s] of S.sweat || []) sweat(o, x, y, s ?? 1.2);
  for (const f of S.fills || []) { o.fillStyle = f.color ?? DARK; o.beginPath(); pathOf(f)(o); o.fill(); }
  (S.eyes || []).forEach((E, k) => drawEye(o, E, k));
  (S.brows || []).forEach((b, k) => brow(o, b.pts || b, 50 + k, b.lean ?? -0.9));
  // ---- hair: measured black masses, pointed locks, light strands along the flow
  for (const [i, h] of (S.hair || []).entries()) {
    P.light(poly(h), 0.0);
    o.fillStyle = DARK; o.beginPath(); poly(h)(o); o.fill();
    hairStrands(o, h, S.hairFlow ?? 1.6, 30 + i, S.strandDensity ?? 1);
  }
  for (const L of S.locks || []) { lock(o, L.pts, L.w, DARK, 1.1); lock(P.v, L.pts, L.w, "#000", 1.1); if (L.w > 22) strands(o, L.pts, 3, L.w * 0.5, 1.2, INK, 90 + L.w, 0.7); }
  // ---- beanie: knit value with ribs, a darker turning side, the cuff fold
  const B = S.beanie;
  if (B) {
    for (const bp of B.polys) {
      P.fill(poly(bp), B.value, B.ribAngle ?? 1.57, { style: 3, spacing: 0.22 });
    }
    for (const s of B.shade || []) softValue(P, pathOf(s), s.v, s.blur ?? 22, s.alpha ?? 0.8);
    const r = rng(B.seed ?? 5);
    o.save(); o.beginPath(); for (const bp of B.polys) poly(bp)(o); o.clip();
    // rib lines: from the lower edge (hairline) toward the fold, fanning as given by two guide curves
    if (B.lower && B.upper) {
      const q1 = sampleCurve(B.lower, 8), q2 = sampleCurve(B.upper, 8), N = B.nRibs ?? 60;
      for (let i = 0; i <= N; i++) {
        const f = i / N, p0 = q1[Math.round(f * (q1.length - 1))], p1 = q2[Math.round(f * (q2.length - 1))];
        const w = 1.3 + 1.5 * Math.pow(Math.abs(f - (B.litAt ?? 0.3)), 0.8) * 1.6;
        ink(o, [p0, [(p0[0] + p1[0]) / 2 + (r() - 0.5) * 4, (p0[1] + p1[1]) / 2], p1], w, "rgba(8,8,8,0.7)", "mid", 4);
      }
      ink(o, B.upper, 2.6, "rgba(6,6,6,0.85)");
    }
    for (const c of B.crossHatch || []) { const b = bbox(c.pts); hatch(o, poly(c.pts), [b[0] - 20, b[1] - 20, b[2] + 20, b[3] + 20], { angle: c.angle ?? 0.9, spacing: c.spacing ?? 8, len: [15, 50], w: 1.3, alpha: c.alpha ?? 0.55, seed: c.seed ?? 21 }); }
    o.restore();
    for (const l of B.edges || []) ink(o, l.pts, l.w ?? 2.6, l.color ?? DARK);
  }
  for (const l of S.over || []) ink(o, l.pts, l.w ?? 2.4, l.color ?? DARK, l.prof ?? "mid");
}
