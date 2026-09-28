// s23 — the owl's white flame aura (92.64–95.56) and the flare (94.88–95.12), fix pass 1b (frame px).
//
// The source's aura is a soft, glowing white fire drawn behind the owl: many wavy candle-flame tongues whose thin tips
// curl and stand apart (dark room between them near the top), a bright mass behind the head and body, the edges
// shading off to grey like smoke, faint grey licks inside where tongues overlap, the lower flames licking over the
// speaker and down over the boxes at the left, translucent there. It is one drawing held through the power-up, the
// reach and the two pairs (its top profile is the same, ±3 px, over 2320–2344, 2346–2370 and 2380–2389).
// Measured on the source (white = grey > 185 and chroma < 40, columns every 20 px, rows every 20 px):
//   tongue tips (x: top y) 490: 448, 510: 443, 530: 383, 550: 396, 570: 390, 590: 353, 610: 360, 630: 356, 650: 339,
//   670: 352, 690: 303, 710: 313, 730: 303, 750: 334, 770: 359, 790: 329, 810: 395, 830: 408 (right of 840 the banner's
//   pale lettering hides them; the earlier pass read 840: 393, 870: 400, 900: 435);
//   white fraction across x 480–920: y 440 0.6, 480 0.85, 520 0.9, 560 0.59, 580 0.3, 620 0.2; lower-left flames to
//   y ≈ 620–640 over x 480–590.
// The flare (per source frame, same measure): a 2372–2373 tips 530: 187, 620: 225, 680: 246, 710: 164, 770: 186,
//   830: 215, a thin ray from (560, 340) up-left past (380, 130); b 2374–2376 tips 440: 162, 470: 193, 530: 37,
//   560: 99, 620: 121, 680: 110, 710: 61, 740: 26, 770: 0, 800: 55, 860: 193, 890: 155, a ray up-right (850, 370) ->
//   (1090, 150); c 2377 tips 560: 342, 620: 324, 650: 276, 680: 258, 740: 224, 800: 314, 830: 348; d 2378 tips 590: 377,
//   620: 347, 650: 293, 710: 281, 740: 241, 800: 325; bottom ≈ 620 (rounded), left edge 420–490.
//
// Drawing: every flame is a filled tongue polygon (white, its outline a thin grey line: where a nearer tongue overlaps
// a farther one its outline reads as an inner lick). The union's mask is blurred and used to shade the mass (grey
// toward its edges, white inside) and to add a soft halo. Six boil variants (tips ±3 px, phases jittered).
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
// one tongue from base B to tip T: base width w, S-sway amplitude (px), tip hook (px, + = to the tongue's left),
// phase ph. Returns the outline (closed polygon).
export function tongue(B, T, w, sway, hook, ph, N = 30, prof = 0.65) {
  const dx = T[0] - B[0], dy = T[1] - B[1], L = Math.hypot(dx, dy) || 1, d = [dx / L, dy / L], n = [-d[1], d[0]];
  const C = (u) => {
    const s = sway * Math.sin(Math.PI * u * 1.55 + ph) * Math.sin(Math.PI * Math.min(1, u * 1.1)) + hook * u * u * u;
    return [B[0] + dx * u + n[0] * s, B[1] + dy * u + n[1] * s];
  };
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = C(u), c2 = C(Math.min(1, u + 0.03)), c1 = C(Math.max(0, u - 0.03));
    const t = [c2[0] - c1[0], c2[1] - c1[1]], tl = Math.hypot(t[0], t[1]) || 1, nn = [-t[1] / tl, t[0] / tl];
    // a candle-flame profile: full near the base, thinning to a fine curling wisp; slow lobes along the edges
    const hw = (w / 2) * Math.pow(Math.max(0, 1 - u), prof) * (1 + 0.16 * Math.sin(u * 11 + ph * 1.7));
    // the outer side of the hook is fuller than the inner (flames lick with a sharp outside curve)
    const kl = hook > 0 ? 0.85 : 1.1, kr = hook > 0 ? 1.1 : 0.85;
    Lp.push([c[0] + nn[0] * hw * kl, c[1] + nn[1] * hw * kl]);
    Rp.push([c[0] - nn[0] * hw * kr, c[1] - nn[1] * hw * kr]);
  }
  return { pts: [...Lp, ...Rp.reverse()], C };
}
// a smooth blob (core masses): centre, radii, wobble
export function blob(cx, cy, rx, ry, wob, ph, N = 48) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, k = 1 + wob * Math.sin(a * 5 + ph) + wob * 0.6 * Math.sin(a * 9 + ph * 2);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return { pts };
}
const path = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };

// Render a flame mass: shapes [{ pts, a (fill alpha, default 1), ink (outline alpha) }] in back-to-front order, in a
// frame box [x0, y0, w, h]. o: { shade (blur px of the mask for the edge shading), grey (value at the edge, 0–255),
// halo (alpha of the soft outer glow), haloBlur, soft (final blur px), alpha }
function renderMass(box, shapes, o = {}) {
  const [X0, Y0, W, H] = box, mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const col = mk(), msk = mk(), cg = col.getContext("2d"), mg = msk.getContext("2d");
  cg.translate(-X0, -Y0); mg.translate(-X0, -Y0);
  cg.lineJoin = "round";
  if (o.contour) {
    // fix pass 2: ink only the silhouette of the union (every shape's outline drawn first, then every fill over it:
    // the outlines survive only outside all the fills), plus the chosen inner licks — per-shape outlines over the
    // interior read as fur, not fire
    for (const s of shapes) { path(cg, s.pts); cg.strokeStyle = `rgba(${o.inkRGB ?? "118,118,114"},${Math.min(1, (s.ink ?? 0.5) * 1.6)})`; cg.lineWidth = 2 * (s.lw ?? 1.3); cg.stroke(); }
    for (const s of shapes) { path(mg, s.pts); mg.fillStyle = `rgba(255,255,255,${s.a ?? 1})`; mg.fill(); path(cg, s.pts); cg.fillStyle = "rgb(250,250,247)"; cg.fill(); }
    for (const s of shapes) for (const l of s.licks || []) {
      cg.beginPath(); l.forEach((p, i) => (i ? cg.lineTo(p[0], p[1]) : cg.moveTo(p[0], p[1])));
      cg.strokeStyle = `rgba(${o.lickRGB ?? "128,128,124"},${s.lickA ?? 0.4})`; cg.lineWidth = 1.2; cg.stroke();
    }
    // the nearer tongues (front: true) keep their own contour over the mass: the inner flame lines
    for (const s of shapes) if (s.front) {
      // only the upper part of the contour (a tongue's base is buried in the mass): clip to above its base
      const ys = s.pts.map((p) => p[1]), yb = Math.max(...ys), yt = Math.min(...ys);
      cg.save(); cg.beginPath(); cg.rect(-1e4, -1e4, 3e4, yb - (yb - yt) * 0.3 + 1e4); cg.clip();
      path(cg, s.pts); cg.strokeStyle = `rgba(${o.inkRGB ?? "118,118,114"},${(s.ink ?? 0.5) * 0.8})`; cg.lineWidth = s.lw ?? 1.2; cg.stroke();
      cg.restore();
    }
  }
  for (const s of (o.contour ? [] : shapes)) {
    path(mg, s.pts); mg.fillStyle = `rgba(255,255,255,${s.a ?? 1})`; mg.fill();
    path(cg, s.pts); cg.fillStyle = "rgb(250,250,247)"; cg.fill();
    if ((s.ink ?? 0.5) > 0) { cg.strokeStyle = `rgba(${o.inkRGB ?? "118,118,114"},${s.ink ?? 0.5})`; cg.lineWidth = s.lw ?? 1.3; cg.stroke(); }
    for (const l of s.licks || []) {
      cg.beginPath(); l.forEach((p, i) => (i ? cg.lineTo(p[0], p[1]) : cg.moveTo(p[0], p[1])));
      cg.strokeStyle = `rgba(${o.lickRGB ?? "128,128,124"},${s.lickA ?? 0.4})`; cg.lineWidth = 1.1; cg.stroke();
    }
  }
  const blurred = (px) => { const c = mk(), g = c.getContext("2d"); g.filter = `blur(${px}px)`; g.drawImage(msk, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const B = blurred(o.shade ?? 7), G = blurred(o.haloBlur ?? 16);
  const M = mg.getImageData(0, 0, W, H).data, cimg = cg.getImageData(0, 0, W, H), C = cimg.data;
  const grey = o.grey ?? 150, halo = o.halo ?? 0.3, A = o.alpha ?? 0.97, WH = o.white ?? 250;
  for (let i = 0; i < C.length; i += 4) {
    const m = M[i + 3] / 255, b = B[i + 3] / 255, gl = G[i + 3] / 255;
    // shade: grey at the mass's edge, white inside (smoothstep of the blurred mask)
    const u = Math.max(0, Math.min(1, (b - 0.22) / 0.62)), sh = u * u * (3 - 2 * u);
    const k = (grey + (WH - grey) * sh) / 250;
    const a = Math.max(m * A * (0.75 + 0.25 * sh), gl * halo * (1 - m));
    if (m > 0) { C[i] = C[i] * k; C[i + 1] = C[i + 1] * k; C[i + 2] = C[i + 2] * k; }
    else { C[i] = 236; C[i + 1] = 236; C[i + 2] = 232; }
    C[i + 3] = Math.round(255 * Math.min(1, a));
  }
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.putImageData(cimg, 0, 0);
  if (o.soft) { const c = mk(), g = c.getContext("2d"); g.filter = `blur(${o.soft}px)`; g.drawImage(col, 0, 0); return { c, x: X0, y: Y0 }; }
  return { c: col, x: X0, y: Y0 };
}

// ---------------------------------------------------------------- the aura
// top-row tongue tips (measured, see above); the base sits 110–170 px below, leaning in toward the owl (x 695)
export const AURA_TIPS = [[486, 452], [512, 440], [532, 384], [553, 398], [572, 390], [592, 352], [613, 362], [633, 355], [652, 338], [672, 352],
  [692, 302], [712, 314], [731, 302], [752, 334], [771, 358], [791, 328], [811, 394], [832, 408], [853, 393], [874, 400], [898, 434], [916, 462]];
function auraShapes(variant) {
  const R = rng(5200), rv = rng(5200 + variant * 131), j = (a) => (rv() - 0.5) * 2 * a, S = [];
  const lick = (tg, side, u0, u1) => { const out = []; for (let i = 0; i <= 12; i++) { const u = u0 + (u1 - u0) * i / 12, c = tg.C(u); out.push([c[0] + side * (4 + 3 * Math.sin(u * 7)), c[1]]); } return out; };
  // 1) back row: the tall top tongues (tips on the measured profile)
  AURA_TIPS.forEach(([tx, ty], i) => {
    const T = [tx + j(3), ty + j(3)], L = 140 + 45 * R(), lean = (695 - tx) * 0.3;
    const B = [tx + lean + j(2), ty + L];
    const tg = tongue(B, T, (tx < 565 || tx > 850 ? 28 : 38) + 10 * R(), (8 + 6 * R()) * (i % 2 ? 1 : -1), (tx < 695 ? -1 : 1) * (7 + 7 * R()) * (R() < 0.3 ? -1 : 1), R() * TAU + j(0.5));
    S.push({ pts: tg.pts, ink: 0.42, licks: R() < 0.6 ? [lick(tg, i % 2 ? 1 : -1, 0.15, 0.6 + 0.2 * R())] : [], lickA: 0.35 });
  });
  // 2) the flanks: tongues sweeping out and up from the sides of the mass
  for (let k = 0; k < 5; k++) {
    const y = 470 + k * 26 + 8 * R();
    for (const sd of [-1, 1]) {
      const tipX = sd < 0 ? 446 + 14 * R() + k * 4 : 928 - 14 * R() - k * 3, T = [tipX + j(3), y - 40 - 15 * R() + j(3)];
      const B = [695 + sd * (150 + 20 * R()), y + 30];
      const tg = tongue(B, T, 32 + 8 * R(), 7 * (k % 2 ? 1 : -1), sd * (6 + 5 * R()), R() * TAU + j(0.5));
      S.push({ pts: tg.pts, ink: 0.4, a: k > 2 ? 0.85 : 1 });
    }
  }
  // 3) the core: the bright mass behind the owl's head and body
  S.push({ ...blob(695, 497, 188, 70, 0.05, 1.3 + j(0.2)), ink: 0 });
  S.push({ ...blob(697, 438, 112, 68, 0.06, 2.1 + j(0.2)), ink: 0 });
  // 4) a middle row of shorter tongues in front of the core (their outlines read as the inner flame lines)
  for (let x = 530, i = 0; x <= 870; x += 42, i++) {
    const top = AURA_TIPS.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
    const T = [x + 10 * (R() - 0.5) + j(3), top + 55 + 35 * R() + j(3)], B = [x + (695 - x) * 0.2, T[1] + 95 + 30 * R()];
    const tg = tongue(B, T, 34 + 8 * R(), 7 * (i % 2 ? 1 : -1), (x < 695 ? -1 : 1) * (5 + 5 * R()), R() * TAU + j(0.5));
    S.push({ pts: tg.pts, ink: 0.3, lw: 1.1 });
  }
  // 5) the lower flames: licks over the speaker round its feet (tips ≈ 555–575) and, at the left, flames licking up
  // and out over the boxes (bases ≈ 640, translucent)
  for (const k of [0, 1, 5, 6]) {
    const x = 560 + k * 45 + 12 * (R() - 0.5), T = [x + j(3), 552 + 22 * R() + j(3)], B = [x + (695 - x) * 0.3, 612];
    const tg = tongue(B, T, 30 + 8 * R(), 5 * (k % 2 ? 1 : -1), (x < 695 ? -1 : 1) * 5, R() * TAU + j(0.5));
    S.push({ pts: tg.pts, ink: 0.35, a: 0.9 });
  }
  for (let k = 0; k < 5; k++) {
    const x = 470 + k * 28 + 10 * (R() - 0.5), T = [x - 20 - 10 * R() + j(3), 520 + 30 * R() + k * 6 + j(3)], B = [x + 30, 640 - 6 * k];
    const tg = tongue(B, T, 34 + 8 * R(), 6 * (k % 2 ? 1 : -1), -6 - 4 * R(), R() * TAU + j(0.5));
    S.push({ pts: tg.pts, ink: 0.38, a: 0.78 });
  }
  for (let k = 0; k < 3; k++) {
    const x = 860 + k * 22, T = [x + 22 + 8 * R() + j(3), 540 + 18 * R() + j(3)], B = [x - 20, 605];
    const tg = tongue(B, T, 30 + 6 * R(), 5 * (k % 2 ? 1 : -1), 6, R() * TAU + j(0.5));
    S.push({ pts: tg.pts, ink: 0.38, a: 0.8 });
  }
  return S;
}
// ---------------------------------------------------------------- fix pass 2: the aura rebuilt
// Review #2: the 1b aura read as a dense, even white starburst (every tongue a spike of the same length, a solid white
// skirt under the wings, no grey). Re-measured on 2327 / 2345 / 2360 / 2385 (one drawing through all three poses):
//  - the flame body is light grey, not white: graded 213–224 inside (p10 185–198), white only along the tongues' edges,
//    with darker grey S-lines where tongues overlap;
//  - rows (white fraction per 20 px cell): y 360 dense only x 600–780; y 380 x 580–800; y 400–440 x ≈ 550–860 with
//    sparse wisps out to 480 / 900; y 460–550 dense x 440–900; y 555–590 a DARK band across x 580–840 (the speaker's
//    top and the owl's legs show), flames only left of 580 and right of 840; y 590–612 licks again at x 700–880
//    (over the speaker's front); lower-left lobes to y ≈ 640 over x 480–600;
//  - the top: separate thin tongues (tips on the measured profile AURA_TIPS) with ≥ 40 % dark between them in the
//    upper-left / upper-right bands, fuller behind the head;
//  - the flanks bulge and their tongues curl outward (hooked tips) to x ≈ 470 / 930;
//  - grey smoke (graded ≈ 90–130) drifts over the boxes at the left, x 330–520, y 380–600.
export function coreTop(x) {
  // the top edge of the core masses (below it everything is flame body)
  let y = 1e9;
  const e = (cx, cy, rx, ry) => { const u = (x - cx) / rx; if (Math.abs(u) < 1) y = Math.min(y, cy - ry * Math.sqrt(1 - u * u)); };
  e(700, 402, 122, 70); e(697, 490, 178, 52); e(545, 510, 58, 70); e(858, 500, 50, 66);
  return y;
}
function auraShapes2(variant) {
  const R = rng(6300), rv = rng(6300 + variant * 97), j = (a) => (rv() - 0.5) * 2 * a, S = [];
  const lick = (tg, side, u0, u1, off = 5) => { const out = []; for (let i = 0; i <= 14; i++) { const u = u0 + (u1 - u0) * i / 14, c = tg.C(u); out.push([c[0] + side * (off + 3 * Math.sin(u * 7)), c[1] + 1.5 * Math.sin(u * 5)]); } return out; };
  // 0) the core masses (drawn first: the tongues' outlines read over them as inner flame lines): behind the head (up to
  // y ≈ 332), the body mass (bottom ≈ 542, the speaker's top shows under it), the two flank masses
  S.push({ ...blob(700, 402, 122, 70, 0.05, 1.1 + j(0.15)), ink: 0 });
  S.push({ ...blob(697, 490, 178, 52, 0.04, 2.3 + j(0.15)), ink: 0 });
  S.push({ ...blob(545, 510, 58, 70, 0.06, 0.4 + j(0.15)), ink: 0 });
  S.push({ ...blob(858, 500, 50, 66, 0.06, 2.9 + j(0.15)), ink: 0 });
  // 1) the top tongues: S-curved, hooked, of varied length; their bases are buried in the core below the tip, leaning
  // in toward the owl. In the upper-left (x < 560) and upper-right (x > 830) bands they are thin wisps standing apart
  // (the source is dark there: blurred 6–90 at y 360–430).
  AURA_TIPS.forEach(([tx, ty], i) => {
    const far = tx < 560 || tx > 830, side = far || tx < 600 || tx > 800;
    const T = [tx + j(2.5), ty + j(2.5)], bx = tx + (697 - tx) * (far ? 0.22 : side ? 0.16 : 0.08);
    const by = Math.max(ty + 80 + 60 * R(), coreTop(bx) + 16);
    const w = far ? 10 + 5 * R() : side ? 18 + 6 * R() : 30 + 10 * R();
    const tg = tongue([bx + j(1.5), by], T, w, (10 + 8 * R()) * (i % 2 ? 1 : -1), (tx < 697 ? -1 : 1) * (6 + 8 * R()) * (R() < 0.3 ? -1 : 1), R() * TAU + j(0.4), 34, far ? 0.9 : 0.65);
    S.push({ pts: tg.pts, ink: 0.42, lw: 1.2, a: far ? 0.8 : 1, front: !far && i % 3 === 1, licks: !far && R() < 0.55 ? [lick(tg, i % 2 ? 1 : -1, 0.25, 0.75 + 0.15 * R())] : [], lickA: 0.45 });
  });
  // extra tongues rising from behind the head (the source is bright, 190–225, over x 575–800 at y 360–420)
  for (const [x, ty] of [[610, 350], [645, 338], [680, 322], [720, 318], [755, 332], [790, 348]]) {
    const T = [x + j(3), ty + j(3)], B = [x + (700 - x) * 0.2, ty + 100];
    const tg = tongue(B, T, 38 + 8 * R(), 8 * (R() < 0.5 ? 1 : -1), (x < 700 ? -1 : 1) * (6 + 5 * R()), R() * TAU + j(0.4));
    S.push({ pts: tg.pts, ink: 0.36, lw: 1.1 });
  }
  // 2) the flanks: fat tongues curling outward and up; the edges measured at x ≈ 470 (left, y 450–570) and ≈ 905 (right)
  const FL = [[-1, 478, 452], [-1, 470, 490], [-1, 476, 528], [-1, 472, 566], [1, 884, 444], [1, 902, 480], [1, 908, 516], [1, 900, 552]];
  FL.forEach(([sd, tx, ty], k) => {
    const B = [sd < 0 ? 572 : 820, Math.min(ty + 34 + 10 * R(), sd < 0 ? 600 : 552)], T = [tx + j(2.5), ty + j(2.5)];
    const tg = tongue(B, T, 32 + 10 * R(), 8 * (k % 2 ? 1 : -1), sd * (9 + 6 * R()), R() * TAU + j(0.4), 30, 0.6);
    S.push({ pts: tg.pts, ink: 0.45, front: k % 2 === 0 });
  });
  // 3) inner tongues in front of the core (their outlines are the grey inner flame lines)
  for (const [x, top] of [[565, 470], [600, 440], [640, 420], [760, 418], [800, 436], [835, 462], [590, 500], [815, 500]]) {
    const T = [x + j(3), top + j(3)], B = [x + (697 - x) * 0.25, top + 85 + 15 * R()];
    const tg = tongue(B, T, 30 + 8 * R(), 7 * (R() < 0.5 ? 1 : -1), (x < 697 ? -1 : 1) * (5 + 5 * R()), R() * TAU + j(0.4));
    S.push({ pts: tg.pts, ink: 0.4, lw: 1.1, front: true });
  }
  // 4) the lower licks: separate tapered tongues with dark between them. Left: lobes and licks down over the boxes to
  // y ≈ 645 (x 480–580); right: licks over the speaker's front, x 815–895 to y ≈ 612; none over the speaker's top
  // between x 590 and 810 below y ≈ 548 (the owl's feet stand there)
  S.push({ ...blob(532, 588, 52, 40, 0.07, 0.9 + j(0.2)), ink: 0.3, a: 0.9 });
  const LO = [[496, 560, 482, 640], [522, 566, 508, 650], [550, 566, 540, 648], [572, 556, 574, 632],
    [856, 548, 862, 600], [880, 544, 890, 596], [902, 530, 914, 578]];
  LO.forEach(([bx, by, tx, ty], k) => {
    const tg = tongue([bx + (697 - bx) * 0.15, by - 40], [tx + (tx < 697 ? -10 : 10) + j(2), ty + j(2)], 20 + 5 * R(), 6 * (k % 2 ? 1 : -1), (tx < 697 ? 1 : -1) * 12, R() * TAU + j(0.4), 26, 0.8);
    S.push({ pts: tg.pts, ink: 0.5, a: 0.92 });
  });
  return S;
}
// grey smoke over the boxes at the left (a few soft translucent flame wisps, blurred)
function smoke(g, variant) {
  const r = rng(6400 + variant);
  g.save(); g.filter = "blur(5px)";
  for (const [x, y, h, w, a] of [[418, 470, 150, 34, 0.4], [452, 440, 150, 34, 0.42], [485, 420, 110, 28, 0.36], [372, 440, 100, 24, 0.26]]) {
    const tg = tongue([x + 20, y + h * 0.4], [x - 8 + (r() - 0.5) * 6, y - h * 0.6], w, 9, -8, r() * TAU, 24, 0.6);
    path(g, tg.pts); g.fillStyle = `rgba(150,150,146,${a})`; g.fill();
  }
  g.restore();
}
// fix pass 2 (b): the aura as a FIELD OF INKED TONGUES over a dark hatched core, not a white union. In the source every
// tongue is a separate light-grey flame (edge white, body ≈ 225) with a fine dark ink contour and a grey lick inside;
// where tongues part, a dark engraved shadow shows (inside the mass) or the room (at its edge). Tongues fan out from
// the owl in three rows: the outer row's tips are the measured silhouette (top profile AURA_TIPS, flank edges at
// x ≈ 470 / 905, the lower licks), the inner rows fill the body. No tongue points into the sector under the owl
// (x 590–810, y > 548), where the speaker's top shows.
const OC = [697, 492];
function outerTips() {
  const T = AURA_TIPS.map(([x, y]) => [x, y, 0]);
  // flanks (tips curl outward and up)
  for (const p of [[478, 452], [468, 488], [474, 524], [470, 562], [884, 444], [900, 480], [906, 516], [898, 552]]) T.push([p[0], p[1], 1]);
  // lower licks (left lobes down over the boxes, right over the speaker's front)
  for (const p of [[484, 606], [506, 632], [536, 642], [566, 622], [828, 604], [858, 610], [884, 596]]) T.push([p[0], p[1], 2]);
  return T;
}
function tongueField(variant) {
  const R = rng(7300), rv = rng(7300 + variant * 53), j = (a) => (rv() - 0.5) * 2 * a, out = [];
  const add = (tip, kind, row) => {
    const [tx, ty] = tip, vx = tx - OC[0], vy = ty - OC[1], L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L;
    // base: toward the owl; the tongue is L·(0.55..0.75) long; lower licks hang from the mass's bottom edge
    const len = kind === 2 ? 70 + 20 * R() : L * (0.5 + 0.18 * R()) * (row ? 1 : 1);
    const B = [tx - ux * len + j(1.5), ty - uy * len + (kind === 2 ? -10 : 0)];
    const side = tx < OC[0] ? -1 : 1;
    const far = kind === 0 && (tx < 560 || tx > 850);
    const w = kind === 2 ? 22 + 6 * R() : far ? 13 + 5 * R() : kind === 1 ? 34 + 8 * R() : row === 0 ? 26 + 10 * R() : 34 + 12 * R();
    const hook = (kind === 1 ? -side * (10 + 6 * R()) : side * (5 + 9 * R()) * (R() < 0.3 ? -1 : 1));
    const tg = tongue(B, [tx + j(2.5), ty + j(2.5)], w, (7 + 9 * R()) * (R() < 0.5 ? 1 : -1), hook, R() * TAU + j(0.4), 34, far ? 0.85 : 0.62);
    out.push({ tg, row, far, a: kind === 2 ? 0.92 : far ? 0.85 : 1 });
  };
  // inner rows first (behind), then the outer row in front? No: in the source the outer tongues are behind the inner
  // ones (the licks read as nearer flames over farther ones). Back to front: outer, middle, inner.
  const OT = outerTips();
  OT.forEach(([x, y, k]) => add([x, y], k, 0));
  // middle row: tips 0.7 of the way out, angles interleaved (between consecutive outer tips), none in the bottom sector
  for (let i = 0; i < OT.length - 1; i++) {
    const [x0, y0, k0] = OT[i], [x1, y1, k1] = OT[i + 1];
    if (k0 === 2 || k1 === 2) continue;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, f = 0.66 + 0.1 * R();
    add([OC[0] + (mx - OC[0]) * f, OC[1] + (my - OC[1]) * f], k0 === 1 && k1 === 1 ? 1 : 0, 1);
  }
  // inner row: short fat tongues round the owl's head and shoulders
  for (const [x, y] of [[600, 420], [640, 380], [680, 360], [720, 360], [760, 380], [800, 420], [580, 470], [820, 470], [560, 520], [840, 520]]) add([x + j(3), y + j(3)], 0, 2);
  return out;
}
// render: the dark hatched core under the tongues, the tongues (light fill, white rim, dark ink contour, grey lick),
// a soft halo round the whole
function renderField(box, variant) {
  const [X0, Y0, W, H] = box, mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const F = tongueField(variant), c = mk(), g = c.getContext("2d"), msk = mk(), mg = msk.getContext("2d");
  g.translate(-X0, -Y0); mg.translate(-X0, -Y0);
  // the dark core: engraved shadow between the tongues (graded ≈ 60–110 in the source's gaps inside the mass)
  const core = [blob(700, 404, 112, 66, 0.05, 1.1), blob(697, 490, 172, 50, 0.04, 2.3), blob(548, 512, 56, 66, 0.06, 0.4), blob(852, 500, 46, 60, 0.06, 2.9)];
  g.save(); g.beginPath(); for (const b of core) { const p = b.pts; g.moveTo(p[0][0], p[0][1]); for (const q of p) g.lineTo(q[0], q[1]); g.closePath(); }
  g.fillStyle = "rgb(96,96,93)"; g.fill(); g.clip();
  g.strokeStyle = "rgba(150,150,146,0.55)"; g.lineWidth = 1;
  for (let x = X0 - H; x < X0 + W; x += 4.5) { g.beginPath(); g.moveTo(x, Y0 + H); g.lineTo(x + H * 0.9, Y0); g.stroke(); }
  g.restore();
  g.lineJoin = "round"; g.lineCap = "round";
  for (const { tg, a, far } of F) {
    path(mg, tg.pts); mg.fillStyle = "#fff"; mg.fill();
    g.save(); g.globalAlpha = a;
    path(g, tg.pts); g.fillStyle = "rgb(228,228,224)"; g.fill();
    // a white rim just inside the contour (the tongue's lit edge)
    g.save(); path(g, tg.pts); g.clip(); g.strokeStyle = "rgba(252,252,249,0.9)"; g.lineWidth = far ? 3 : 5; path(g, tg.pts); g.stroke(); g.restore();
    g.strokeStyle = "rgba(70,70,68,0.8)"; g.lineWidth = 1.25; path(g, tg.pts); g.stroke();
    // one grey lick along the tongue's inside
    if (!far) { g.beginPath(); for (let i = 0; i <= 14; i++) { const u = 0.08 + 0.5 * i / 14, p = tg.C(u); i ? g.lineTo(p[0] + 4, p[1]) : g.moveTo(p[0] + 4, p[1]); } g.strokeStyle = "rgba(120,120,116,0.5)"; g.lineWidth = 1; g.stroke(); }
    g.restore();
  }
  // halo: the blurred union, faint, outside the flames only
  const hc = mk(), hg = hc.getContext("2d"); hg.filter = "blur(14px)"; hg.drawImage(msk, 0, 0);
  hg.filter = "none"; hg.globalCompositeOperation = "source-in"; hg.fillStyle = "rgba(236,236,232,0.2)"; hg.fillRect(0, 0, W, H);
  const out = mk(), og = out.getContext("2d"); og.drawImage(hc, 0, 0); og.drawImage(c, 0, 0);
  return { c: out, x: X0, y: Y0 };
}
const ACACHE = new Map();
export function auraCanvas(variant = 0) {
  if (!ACACHE.has(variant)) {
    // (the radial tongue field above, renderField, read as a sunburst: flames rise, they do not radiate; not used)
    const M = renderMass([380, 250, 640, 430], auraShapes2(variant), { contour: true, shade: 3, grey: 175, white: 228, halo: 0.2, haloBlur: 14, soft: 0, inkRGB: "66,66,64", lickRGB: "104,104,100" });
    const c = document.createElement("canvas"); c.width = 720; c.height = 430;
    const g = c.getContext("2d"); g.translate(-300, -250); smoke(g, variant); g.drawImage(M.c, M.x, M.y);
    ACACHE.set(variant, { c, x: 300, y: 250 });
  }
  return ACACHE.get(variant);
}
export function drawAura3(g, variant, alpha = 1) {
  const A = auraCanvas(variant % 6);
  g.save(); g.globalAlpha *= alpha; g.drawImage(A.c, A.x, A.y); g.restore();
}

// ---------------------------------------------------------------- the flare
// per stage: tips (measured), the mass's box (left, right, top of the body, bottom), rays [from, to, width]
const FLARE3 = {
  // re-measured on 2372 / 2375 / 2377 / 2378 (column tops every 12 px, white = grey > 205, chroma < 35; right of 850 the
  // banner's pale lettering hides the tips): the body is ~590 at its middle (the speaker shows under it), flames lick
  // down to ≈ 630 at the sides; the rays are straight (slope ≈ 1.07)
  // fix pass 2: re-measured again every 15 px (a run of ≥ 8 white rows): the 1b tongues were thin at their tips, so
  // their columns fell 60–170 px short of the tips on 2375 (the central flame x 670–730 read as a dark gap); they are
  // fuller now (wider, a blunter profile), and the dying flames' tips (2377–2378) sit 30–60 px higher on the left half
  a: { tips: [[470, 330], [505, 300], [540, 199], [570, 290], [598, 262], [624, 232], [652, 272], [684, 245], [712, 158], [732, 140], [768, 205], [800, 262], [840, 207], [872, 232], [900, 262], [922, 320]],
    body: [470, 945, 330, 600], wide: { 712: 64, 732: 56 }, rays: [[[585, 345], [300, 40], 12]] },
  b: { tips: [[470, 250], [532, 40], [575, 170], [600, 222], [625, 96], [652, 196], [684, 106], [712, 55], [740, 24], [766, 4], [792, 80], [818, 26], [850, 170], [880, 215], [912, 250], [935, 300]],
    body: [455, 948, 290, 600], wide: { 766: 92, 740: 70, 712: 64, 684: 70, 625: 60, 532: 60, 818: 60 }, rays: [[[580, 330], [395, 118], 10], [[790, 270], [1000, 44], 10]] },
  c: { tips: [[444, 470], [490, 414], [522, 396], [552, 362], [566, 343], [596, 314], [626, 320], [656, 270], [686, 284], [730, 236], [762, 290], [806, 300], [822, 284], [840, 337], [870, 330], [896, 380], [914, 430]],
    body: [470, 930, 400, 600], wide: { 730: 60, 656: 56 }, rays: [] },
  d: { tips: [[456, 475], [505, 436], [536, 388], [566, 362], [596, 340], [640, 312], [656, 288], [700, 249], [746, 234], [762, 300], [790, 320], [822, 295], [840, 353], [870, 350], [894, 392], [912, 436]],
    body: [475, 925, 420, 600], wide: { 746: 56, 700: 56 }, rays: [] },
};
export function flareShapes(stage) {
  const F = FLARE3[stage], R = rng(7700 + stage.charCodeAt(0)), S = [];
  const [xl, xr, yt, yb] = F.body, cx = (xl + xr) / 2;
  // tongues from the body up to the measured tips; they fan out from the owl (axes back toward ≈ (cx, 480)), fuller
  // near their tips than a candle flame (fix pass 2: profile 0.5, +10 px)
  F.tips.forEach(([tx, ty], i) => {
    const dx = cx - tx, dy = 480 - ty, dl = Math.hypot(dx, dy), L = Math.min(dl * 0.8, 150 + (480 - ty) * 0.35);
    const B = [tx + (dx / dl) * L, ty + (dy / dl) * L];
    const tg = tongue(B, [tx, ty], (F.wide?.[tx] ?? 44) + 10 + 12 * R(), (8 + 7 * R()) * (i % 2 ? 1 : -1), (tx < cx ? -1 : 1) * (7 + 7 * R()), R() * TAU, 30, 0.5);
    S.push({ pts: tg.pts, ink: 0.2 });
  });
  // the body: a bonfire mass widest a little below its middle, rounded at the bottom
  const pts = [], my = (yt + yb) / 2 + 20, rx = (xr - xl) / 2, ryT = my - yt, ryB = yb - my;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU, s = Math.sin(a), c = Math.cos(a), k = 1 + 0.035 * Math.sin(a * 7 + 1) + 0.025 * Math.sin(a * 13);
    const w = s < 0 ? 1 - 0.18 * s * s : 1 - 0.3 * s * s * s;
    pts.push([cx + c * rx * w * k, my + s * (s < 0 ? ryT : ryB) * k]);
  }
  S.push({ pts, ink: 0 });
  // rounded side tongues sweeping up and out off its widest part
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const y = my - 30 + i * 45, B = [cx + sd * rx * 0.6, y + 20], T = [cx + sd * (rx + 8 + 8 * R()), y - 60 - 20 * R()];
    S.push({ pts: tongue(B, T, 44, 8 * (i % 2 ? 1 : -1), sd * 12, R() * TAU, 30, 0.5).pts, ink: 0.15 });
  }
  // flames licking down over the boxes at the left and the desk at the right (to y ≈ 630)
  for (const [bx, tx, ty] of [[520, 488, 632], [560, 540, 636], [600, 590, 618], [800, 812, 616], [850, 868, 622], [890, 905, 612]]) S.push({ pts: tongue([bx + (cx - bx) * 0.3, 540], [tx, ty], 44, 6, bx < cx ? -6 : 6, R() * TAU).pts, ink: 0.12 });
  // thin straight rays
  for (const [a, b, w] of F.rays) S.push({ pts: tongue(a, b, w, 1.5, 0, 0.4).pts, ink: 0, a: 0.95 });
  return S;
}
const FCACHE = new Map();
export function flareCanvas(stage) {
  if (!FCACHE.has(stage)) FCACHE.set(stage, renderMass([200, -20, 1020, 720], flareShapes(stage), { shade: 10, grey: 195, halo: 0.45, haloBlur: 34, soft: 1.2, inkRGB: "96,96,92" }));
  return FCACHE.get(stage);
}
export function drawFlare3(g, stage) { const F = flareCanvas(stage); g.drawImage(F.c, F.x, F.y); }
export function releaseFlames() { ACACHE.clear(); FCACHE.clear(); }
