// s23 — the white flame aura, redrawn in the targeted fix (2026-09-27, frame px).
//
// The ending critic: the 1b / fix-2 aura read as a soft grey cloud (a flat grey-white mass, dark inked contours, blurred
// edges). On the source (2327 / 2330 / 2360 / 2385, 3x crops) the fire is:
//  - a WHITE body (≈ 240–250) with no ink outline: its edges go soft grey where it meets the dark (smoke), crisp only at
//    the thin tips;
//  - separate thin, S-curved wisps with curled tips along the top and flanks, with dark room between them;
//  - fine grey flow lines running up through the mass (the engraving of the flames) and the lit edges of nearer
//    tongues showing as soft grey S-lines where they overlap farther ones;
//  - grey smoke round its outer parts (the right flank fades out into grey, the left has smoky dark pockets).
// The tongue layout keeps the measured profile of the earlier passes (flames.js: AURA_TIPS top profile, flank edges,
// the lower licks, the dark band over the speaker's top). Everything is procedural and seeded; 6 boil variants.
import { rng } from "../../lib/rng.js";
import { AURA_TIPS, coreTop, blob, flareShapes } from "./flames.js";

const TAU = Math.PI * 2;
const sstep = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// a flame wisp from base B to tip T: base width w, S amplitude `sway` (px), tip curl `hook` (px, + = to the left of
// B→T), phase ph, profile exponent prof (higher = thinner, wispier top). Returns { pts, C (centre line), HW (half width) }.
export function wisp(B, T, w, sway, hook, ph, prof = 0.9, N = 44) {
  const dx = T[0] - B[0], dy = T[1] - B[1], L = Math.hypot(dx, dy) || 1, n = [-dy / L, dx / L];
  const C = (u) => {
    const s = sway * Math.sin(Math.PI * 1.7 * u + ph) * Math.pow(u, 0.6) + hook * u * u * u;
    return [B[0] + dx * u + n[0] * s, B[1] + dy * u + n[1] * s];
  };
  // a flame lick: a full belly at ~30 % of its length, then a concave taper into a fine curling tip (prof = the
  // taper's exponent: higher = thinner tip)
  const HW = (u) => (w / 2) * (u < 0.3 ? 0.55 + 0.45 * Math.sin((Math.PI / 2) * (u / 0.3)) : Math.pow((1 - u) / 0.7, prof)) * (1 + 0.16 * Math.sin(u * 13 + ph * 2.3));
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = C(u), c2 = C(Math.min(1, u + 0.02)), c1 = C(Math.max(0, u - 0.02));
    const t = [c2[0] - c1[0], c2[1] - c1[1]], tl = Math.hypot(t[0], t[1]) || 1, nn = [-t[1] / tl, t[0] / tl];
    // the outside of the curl is fuller than the inside
    const hw = HW(u), kl = hook > 0 ? 0.8 : 1.15, kr = hook > 0 ? 1.15 : 0.8;
    Lp.push([c[0] + nn[0] * hw * kl, c[1] + nn[1] * hw * kl]);
    Rp.push([c[0] - nn[0] * hw * kr, c[1] - nn[1] * hw * kr]);
  }
  return { pts: [...Lp, ...Rp.reverse()], C, HW, left: Lp, w0: w };
}
const path = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
function line(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); }

// ---------------------------------------------------------------- layout
// Flames RISE (fix 2 of this pass: a radial layout read as a spiky burr): a white core behind the owl (from behind the
// head down to a soft bottom edge at y ≈ 560–600), and every tongue grows up out of it — tall S-curved licks on the
// measured top profile (AURA_TIPS), flank tongues leaving the core's sides and curling up and out (tips at x ≈ 470 /
// 905), short licks rising from the floor on both sides of the speaker. Tongue bases are buried in the core.
const OX = 697;
function fireShapes(variant) {
  const R = rng(8100), rv = rng(8100 + variant * 71), j = (a) => (rv() - 0.5) * 2 * a, S = [];
  const add = (o) => S.push(o);
  // a tongue from base B to tip T with an S and a curled tip scaled to its length
  const tg = (B, Tp, w, o = {}) => {
    const L = Math.hypot(Tp[0] - B[0], Tp[1] - B[1]), sd = o.sd ?? (Tp[0] < OX ? -1 : 1);
    return wisp([B[0] + j(1.5), B[1] + j(1.5)], [Tp[0] + j(2.5), Tp[1] + j(2.5)], w, (o.sway ?? L * (0.11 + 0.07 * R())) * (R() < 0.5 ? 1 : -1), o.hook ?? sd * L * (0.1 + 0.1 * R()) * (R() < 0.25 ? -1 : 1), R() * TAU + j(0.4), o.prof ?? 1.25);
  };
  // 0) the core
  add({ ...blob(700, 420, 84, 60, 0.05, 1.1 + j(0.15)), core: true });
  add({ ...blob(697, 486, 172, 70, 0.03, 2.3 + j(0.15)), core: true });
  add({ ...blob(548, 516, 62, 36, 0.05, 0.4 + j(0.15)), core: true });
  add({ ...blob(500, 592, 60, 46, 0.05, 1.7 + j(0.15)), core: true });
  add({ ...blob(846, 526, 48, 34, 0.05, 2.9 + j(0.15)), core: true });
  // 1) top tongues (tips measured), bases buried in the core below them, leaning a little in toward the owl
  AURA_TIPS.forEach(([tx, ty], i) => {
    const far = tx < 560 || tx > 830, side = far || tx < 600 || tx > 800;
    const bx = tx + (OX - tx) * (far ? 0.28 : 0.15), by = Math.max(coreTop(bx) + 40, ty + 90);
    const w = far ? 20 + 6 * R() : side ? 30 + 8 * R() : 38 + 12 * R();
    add({ ...tg([bx, by], [tx, ty], w, { prof: far ? 1.5 : 1.3 }), a: far ? 0.95 : 1, flow: 1, edge: !far && i % 3 === 1 });
  });
  for (const [x, ty] of [[612, 356], [648, 342], [684, 326], [722, 322], [758, 336], [792, 352]]) add({ ...tg([x + (700 - x) * 0.2, ty + 115], [x, ty], 46 + 8 * R(), { prof: 1.25 }), flow: 1, edge: x > 640 && x < 760 });
  // 2) flank tongues: from inside the core's sides, up and out, tips curling up (edges x ≈ 470 left, ≈ 905 right)
  for (const [tx, ty] of [[500, 418], [482, 448], [468, 480], [460, 512], [452, 546], [440, 580], [432, 614]]) add({ ...tg([tx + 60, Math.min(ty + 95, 640)], [tx, ty], 36 + 8 * R(), { sd: -1, hook: -14 }), flow: 1, edge: ty < 520 });
  for (const [tx, ty] of [[872, 410], [890, 440], [904, 474], [910, 508], [906, 540]]) add({ ...tg([tx - 58, Math.min(ty + 90, 580)], [tx, ty], 34 + 8 * R(), { sd: 1, hook: 14 }), flow: 1, edge: ty < 520 });
  // 3) the lower edge: at the left, licks rising from the floor over the boxes (x 440–600, tips 560–600); at the right,
  // licks over the speaker's front (x 810–900); nothing over the speaker's top (x 560–800 below y ≈ 552)
  for (const [bx, by, tx, ty] of [[590, 650, 578, 590], [560, 656, 540, 572], [530, 660, 506, 566], [500, 662, 476, 580]]) add({ ...tg([bx, by], [tx, ty], 30 + 6 * R(), { prof: 1.4, sd: -1 }), a: 0.95, flow: 1 });
  for (const [bx, by, tx, ty] of [[818, 606, 836, 552], [846, 610, 866, 556], [872, 604, 896, 562]]) add({ ...tg([bx, by], [tx, ty], 28 + 6 * R(), { prof: 1.4, sd: 1 }), a: 0.95, flow: 1 });
  // 4) inner tongues over the core: only their edges and flow lines show (the grey S-lines inside the mass)
  for (const [x, top] of [[566, 462], [604, 436], [640, 414], [760, 412], [798, 432], [834, 458], [590, 506], [812, 500], [520, 530], [860, 516]]) add({ ...tg([x + (OX - x) * 0.25, Math.min(top + 100, 548)], [x, top], 34 + 8 * R()), flow: 1 });
  return S;
}
// grey smoke: soft wisps round the outer parts (the left boxes, the right flank fading out, pockets at the top)
function smokeShapes(variant) {
  const r = rng(8300 + variant), S = [];
  for (const [x, y, h, w, v, a] of [[418, 470, 170, 40, 140, 0.4], [452, 436, 160, 38, 150, 0.42], [486, 404, 120, 30, 140, 0.34], [372, 440, 110, 26, 120, 0.25],
    [930, 470, 150, 44, 150, 0.4], [960, 520, 120, 40, 140, 0.32], [905, 405, 120, 30, 140, 0.3], [520, 360, 90, 26, 130, 0.3], [860, 350, 90, 26, 130, 0.3],
    [925, 530, 200, 60, 160, 0.3], [898, 440, 170, 44, 155, 0.28], [446, 530, 180, 50, 150, 0.28]]) {
    const sd = x < OX ? -1 : 1;
    const t = wisp([x - sd * 20, y + h * 0.45], [x + sd * 8 + (r() - 0.5) * 6, y - h * 0.55], w, 10, sd * 10, r() * TAU, 0.7);
    S.push({ ...t, v, a });
  }
  return S;
}

// ---------------------------------------------------------------- render
function renderFire(box, shapes, smoke, o = {}) {
  const [X0, Y0, W, H] = box, mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const msk = mk(), mg = msk.getContext("2d");
  mg.translate(-X0, -Y0);
  for (const s of shapes) { path(mg, s.pts); mg.fillStyle = `rgba(255,255,255,${s.a ?? 1})`; mg.fill(); }
  const blurred = (px) => { const c = mk(), g = c.getContext("2d"); g.filter = `blur(${px}px)`; g.drawImage(msk, 0, 0); return c; };
  // 1) smoke: the mask's wide blur, grey, plus the smoke wisps (blurred)
  const out = mk(), og = out.getContext("2d");
  og.save(); og.filter = `blur(${o.smokeBlur ?? 16}px)`; og.globalAlpha = o.smokeA ?? 0.42; og.drawImage(msk, 0, 0); og.restore();
  og.save(); og.globalCompositeOperation = "source-in"; og.fillStyle = `rgb(${o.smokeV ?? 150},${o.smokeV ?? 150},${(o.smokeV ?? 150) - 3})`; og.fillRect(0, 0, W, H); og.restore();
  og.save(); og.translate(-X0, -Y0); og.filter = "blur(7px)";
  for (const s of smoke) { path(og, s.pts); og.fillStyle = `rgba(${s.v},${s.v},${s.v - 3},${s.a})`; og.fill(); }
  og.restore();
  // 2) the white body, painted back to front: each tongue first lays a soft grey contour, then its white fill, so a
  // nearer flame's edge shows over the farther ones (the source's inner flame lines) and is hidden where a nearer
  // one covers it; everything is clipped to the union afterwards and greyed within a few px of the silhouette
  const body = mk(), bg = body.getContext("2d");
  bg.translate(-X0, -Y0); bg.lineCap = "round"; bg.lineJoin = "round";
  const WH = o.white ?? 247, fillC = `rgb(${WH},${WH},${WH - 3})`;
  for (const s of shapes) if (s.core) { path(bg, s.pts); bg.fillStyle = fillC; bg.fill(); }
  const r = rng(8500);
  for (const s of shapes) {
    if (s.core) continue;
    if (s.edge) {
      bg.save(); bg.filter = `blur(${o.edgeSoft ?? 1.3}px)`;
      path(bg, s.pts); bg.strokeStyle = `rgba(${o.lineRGB ?? "138,138,134"},${o.edgeA ?? 0.55})`; bg.lineWidth = o.edgeW ?? 3.2; bg.stroke();
      bg.restore();
    }
    path(bg, s.pts); bg.fillStyle = fillC; bg.fill();
    // the tongue's shadow side: a soft grey band just inside one edge (the source's flames are shaded, not flat)
    if (s.left && (o.shadeA ?? 0.4) > 0) {
      const n = s.left.length, side = (s.shadeSide ?? (r() < 0.5 ? 1 : -1)), run = side > 0 ? s.left.slice(Math.round(n * 0.08)) : s.pts.slice(n, 2 * n - Math.round(n * 0.08));
      bg.save(); path(bg, s.pts); bg.clip(); bg.filter = `blur(${o.shadeBlur ?? 3.5}px)`;
      bg.strokeStyle = `rgba(${o.shadeRGB ?? "170,170,166"},${(o.shadeA ?? 0.4) * (0.6 + 0.4 * r())})`; bg.lineWidth = Math.max(4, (s.w0 ?? 30) * 0.35);
      line(bg, run); bg.stroke(); bg.restore();
    }
    for (let f = 0; f < (s.flow ?? 0); f++) {
      const k = (r() - 0.5) * 0.5, u0 = 0.05 + 0.1 * r(), u1 = 0.7 + 0.2 * r(), pts = [];
      for (let i = 0; i <= 24; i++) { const u = u0 + (u1 - u0) * (i / 24), c = s.C(u), c2 = s.C(Math.min(1, u + 0.02)), c1 = s.C(Math.max(0, u - 0.02)), t = [c2[0] - c1[0], c2[1] - c1[1]], tl = Math.hypot(t[0], t[1]) || 1; pts.push([c[0] - t[1] / tl * s.HW(u) * k * 2, c[1] + t[0] / tl * s.HW(u) * k * 2]); }
      bg.save(); bg.filter = "blur(0.8px)";
      bg.strokeStyle = `rgba(${o.lineRGB ?? "150,150,146"},${(o.flowA ?? 0.28) * (0.6 + 0.4 * r())})`; bg.lineWidth = 1.2 + 0.5 * r();
      line(bg, pts); bg.stroke(); bg.restore();
    }
  }
  bg.setTransform(1, 0, 0, 1, 0, 0);
  // clip to the union and grey the silhouette's rim
  const b = blurred(o.edgeBlur ?? 3).getContext("2d").getImageData(0, 0, W, H).data;
  const img = bg.getImageData(0, 0, W, H), D = img.data, M = mg.getImageData(0, 0, W, H).data, GR = o.rim ?? 182;
  for (let i = 0; i < D.length; i += 4) {
    const m = M[i + 3] / 255;
    if (m <= 0) { D[i + 3] = 0; continue; }
    const px = (i >> 2) % W + X0, py = ((i >> 2) / W | 0) + Y0, dd = Math.hypot((px - (o.cx ?? 697)) / (o.rx ?? 240), (py - (o.cy ?? 470)) / (o.ry ?? 160));
    const fall = 1 - (o.fall ?? 0.07) * sstep(0.45, 1.1, dd);
    const e = sstep(0.35, 0.95, b[i + 3] / 255), k = fall * (GR + (WH - GR) * e) / WH;
    // the flames' feet fade into the dark floor (no hard bottom edge)
    const foot = 1 - sstep(o.foot0 ?? 612, o.foot1 ?? 664, py);
    D[i] *= k; D[i + 1] *= k; D[i + 2] *= k; D[i + 3] = Math.round(D[i + 3] * m * foot);
  }
  bg.putImageData(img, 0, 0);
  og.drawImage(body, 0, 0);
  return { c: out, x: X0, y: Y0 };
}

const CACHE = new Map();
export function fireCanvas(variant = 0) {
  if (!CACHE.has(variant)) CACHE.set(variant, renderFire([300, 250, 720, 430], fireShapes(variant), smokeShapes(variant)));
  return CACHE.get(variant);
}
export function drawFire(g, variant, alpha = 1) {
  const A = fireCanvas(variant % 6);
  g.save(); g.globalAlpha *= alpha; g.drawImage(A.c, A.x, A.y); g.restore();
}
// the flare (94.88–95.12): the measured flare shapes of flames.js (tips per stage), painted like the aura — a white
// body with soft grey rims, crisp tongue edges, a faint halo, no hard floor edge
const FL = new Map();
export function drawFlareE(g, stage) {
  if (!FL.has(stage)) {
    const F = renderFire([200, -20, 1020, 720], flareShapes(stage), [], { foot0: 640, foot1: 700, smokeA: 0.5, smokeBlur: 22, smokeV: 200, rim: 200, fall: 0.04, shadeA: 0 });
    FL.set(stage, F);
  }
  const F = FL.get(stage); g.drawImage(F.c, F.x, F.y);
}
export function releaseFire() { CACHE.clear(); FL.clear(); }
