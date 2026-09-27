// The note card's small parts, redrawn by s08 over drawNoteCard (notecard.js is shared, so s08 paints its own
// measured versions on top). Measured on the source close-up, averaged over frames 764-771 and 800-814 warped back
// into first-frame (F0) coordinates with the s08 camera track, and compared with the render measured the same way.
//
// Card units (465 x 648, the card's own layout) unless marked F0 (first-frame pixels, 0.9957 per card unit).

// ---------------------------------------------------------------- trash icon (card units)
// Source: two slats (not three), the can ~1.5 units narrower each side, the handle taller, the lid a touch higher,
// a lighter line (half-level widths ~3.5 F0 px), centred at u 293.7.
export const TRASH2 = {
  cover: [272, 56, 44, 44],                 // x, y, w, h painted with the paper first
  lw: 3.45,
  lid: [277.95, 310.15, 67.7],             // x0, x1, y
  handle: [290.05, 298.05, 61.2],          // left x, right x, top y
  can: { top: 70.9, tl: 283.0, tr: 305.15, bot: 95.7, bl: 284.65, br: 303.45, r: 3.2 },
  slats: [290.6, 297.6], slatY: [76.2, 87.2],
};
export function drawTrash2(g, ink) {
  const T = TRASH2, c = T.can;
  g.save();
  g.strokeStyle = ink; g.lineWidth = T.lw; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(T.lid[0], T.lid[2]); g.lineTo(T.lid[1], T.lid[2]); g.stroke();
  g.beginPath(); g.moveTo(T.handle[0], T.lid[2]); g.lineTo(T.handle[0], T.handle[2]); g.lineTo(T.handle[1], T.handle[2]); g.lineTo(T.handle[1], T.lid[2]); g.stroke();
  // walls slant in toward the bottom; rounded bottom corners
  const yb = c.bot - c.r, fl = (c.bl - c.tl) / (c.bot - c.top), fr = (c.br - c.tr) / (c.bot - c.top);
  g.beginPath();
  g.moveTo(c.tl, c.top); g.lineTo(c.tl + fl * (yb - c.top), yb);
  g.quadraticCurveTo(c.bl, c.bot, c.bl + c.r, c.bot); g.lineTo(c.br - c.r, c.bot);
  g.quadraticCurveTo(c.br, c.bot, c.tr + fr * (yb - c.top), yb); g.lineTo(c.tr, c.top);
  g.stroke();
  for (const x of T.slats) { g.beginPath(); g.moveTo(x, T.slatY[0]); g.lineTo(x, T.slatY[1]); g.stroke(); }
  g.restore();
}

// ---------------------------------------------------------------- smiley (F0 px)
// Source: the disc is a flat lime-yellow ellipse (39.0 x 38.0: its bottom sits ~3 px higher than the layout's circle),
// ringed by a dim tan-orange halo that never gets redder than the paper (R stays at or below the paper; G and B dip),
// the face drawn with thinner (~2 px), darker olive strokes: eyes wider apart (+-15.3), radius ~7.9, mouth radius 29.
export const SMILEY2 = {
  cover: [196, 80, 58.5],                  // card units: the old smiley + halo, painted with the paper
  cx: 1645.1, cy: 261.75, rx: 39.0, ry: 38.0,
  disc: [[0, "rgb(194,179,82)"], [0.8, "rgb(196,180,84)"], [1, "rgb(200,181,88)"]],
  // halo, elliptical radius (F0 px along x): opaque tan next to the disc, then a salmon fading out
  halo: [[37.5, 192, 141, 92, 1], [39.5, 190, 137, 90, 1], [40.5, 186, 132, 90, 1], [41.5, 188, 133, 100, 1], [42.5, 193, 139, 114, 1],
    [43, 199, 118, 92, 0.72], [44, 199, 118, 92, 0.64], [45, 199, 118, 92, 0.56], [46, 199, 118, 92, 0.47], [47, 199, 118, 92, 0.4],
    [48, 199, 118, 92, 0.32], [49, 199, 118, 92, 0.25], [50, 199, 118, 92, 0.19], [51, 199, 118, 92, 0.15], [52, 199, 118, 92, 0.12],
    [53, 199, 118, 92, 0.09], [55, 199, 118, 92, 0.055], [57.5, 199, 118, 92, 0.02], [59, 199, 118, 92, 0]],
  face: "rgb(46,34,0)", lw: 2.0,
  eyes: [[1630.45, 257.4], [1661.0, 257.2]], eyeR: 7.85, eyeA: [Math.PI * 1.02, Math.PI * 1.98],
  mouth: [1645.1, 252.45, 29.0, 0.655],    // centre, radius, angle from horizontal to each end (rad)
};
export function drawSmiley2(g) {
  const S = SMILEY2, sy = S.ry / S.rx;
  g.save();
  // halo and disc in the ellipse's frame (x px, y squashed)
  g.setTransform(1, 0, 0, sy, 0, S.cy * (1 - sy));
  const r1 = S.halo[S.halo.length - 1][0], r0 = S.halo[0][0];
  const hg = g.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, r1);
  hg.addColorStop(0, `rgba(${S.halo[0][1]},${S.halo[0][2]},${S.halo[0][3]},1)`);
  for (const [r, R, G, B, a] of S.halo) hg.addColorStop(r / r1, `rgba(${R},${G},${B},${a})`);
  g.fillStyle = hg; g.beginPath(); g.arc(S.cx, S.cy, r1, 0, Math.PI * 2); g.fill();
  const dg = g.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, S.rx);
  for (const [t, c] of S.disc) dg.addColorStop(t, c);
  g.fillStyle = dg; g.beginPath(); g.arc(S.cx, S.cy, S.rx, 0, Math.PI * 2); g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = S.face; g.lineWidth = S.lw; g.lineCap = "round";
  for (const [ex, ey] of S.eyes) { g.beginPath(); g.arc(ex, ey, S.eyeR, S.eyeA[0], S.eyeA[1]); g.stroke(); }
  const [mx, my, mr, ma] = S.mouth;
  g.beginPath(); g.arc(mx, my, mr, ma, Math.PI - ma); g.stroke();
  g.restore();
  void r0;
}

// ---------------------------------------------------------------- nub (card units)
// The speech-bubble nub, retraced: the layout's outline moved by the measured difference between the source's and the
// render's paper edges along each normal (source ~1.3 units higher overall, the head ~0.9 larger up-left, its bottom
// flattened ~3-4 units where it meets the purple ribbon). Its dark rim: round the head a circle (-27.8, 325.1, r 20.5)
// cut off below ~140 deg (the source's rim tapers out on the lower left), along the neck top the old offset copy.
export const NUB2 = [4.0,297.5,2.7,298.1,1.5,298.8,0.2,299.3,-1.1,299.8,-2.5,300.2,-3.8,300.6,-5.0,301.2,-6.3,301.7,-7.6,302.3,-8.7,303.0,-9.9,303.7,-11.1,304.5,-12.2,305.3,-13.3,306.1,-14.2,307.1,-15.2,308.1,-16.0,309.2,-16.9,310.4,-18.4,311.0,-19.9,310.5,-21.1,310.0,-22.4,309.7,-23.7,309.5,-25.1,309.3,-26.4,309.4,-27.8,309.5,-29.1,309.7,-30.4,310.0,-31.8,310.3,-33.1,310.7,-34.3,311.2,-35.5,311.9,-36.6,312.6,-37.7,313.5,-38.7,314.4,-39.6,315.4,-40.5,316.5,-41.3,317.6,-42.1,318.7,-42.8,319.9,-43.3,321.2,-43.7,322.5,-44.1,323.8,-44.5,325.2,-44.7,326.6,-44.7,328.0,-44.6,329.4,-44.5,330.8,-44.1,332.1,-43.7,333.5,-43.2,334.8,-42.6,336.1,-41.8,337.3,-41.0,338.4,-40.0,339.5,-39.0,340.4,-37.8,341.2,-36.5,341.8,-35.2,342.1,-33.8,342.4,-32.4,342.7,-31.0,342.9,-29.6,342.8,-28.2,342.7,-26.8,342.2,-25.5,341.7,-24.2,341.7,-22.8,341.7,-21.5,342.1,-20.5,342.8,-19.5,343.7,-18.4,344.7,-17.1,345.3,-16.0,346.1,-15.1,347.1,-14.1,348.1,-12.9,349.0,-11.7,349.7,-10.4,350.2,-9.1,350.7,-7.8,351.2,-6.5,351.7,-5.3,352.5,-4.2,353.3,-3.2,354.3,-2.0,355.0,-0.7,355.6,0.5,356.3,1.8,356.8,3.2,357.2,4.0,357.5];
// the source's thin light fringe just outside the rim on the upper left (a capture ring: ~2 px, pinkish white)
export const NUB2_FRINGE = { r: 22.7, a0: 190, a1: 250, lw: 1.8, rgb: "250,222,206", a: 0.7 };
export const NUB2_RIM = { head: [-27.7, 326.0, 20.45], hc: [-26.3, 327.3], a0: 140, a1: 300, neck: [-2.8, -3.8, 3], neckU: -19, color: "rgba(10,11,8,0.8)" };
function nubPath(g, dx = 0, dy = 0) {
  g.beginPath(); g.moveTo(NUB2[0] + dx, NUB2[1] + dy);
  for (let i = 2; i < NUB2.length; i += 2) g.lineTo(NUB2[i] + dx, NUB2[i + 1] + dy);
  g.closePath();
}
// bodyX0: the card body's left edge (card units); the rim is kept outside it (the body is already painted)
export function drawNub2(g, paper, bodyX0) {
  const R = NUB2_RIM;
  g.save();
  g.beginPath(); g.rect(-80, 250, 80 + bodyX0, 150); g.clip();
  g.fillStyle = R.color; g.strokeStyle = R.color; g.lineJoin = "round";
  // neck top: the old offset copy, only right of the head
  g.save();
  g.beginPath(); g.rect(R.neckU, 250, 100, 70); g.clip();
  nubPath(g, R.neck[0], R.neck[1]); g.lineWidth = R.neck[2]; g.fill(); g.stroke();
  g.restore();
  // head: the rim circle inside a wedge from the head centre (a0 .. a1 degrees, through the left and the top)
  g.save();
  const [hx, hy] = R.hc, d2r = Math.PI / 180;
  g.beginPath(); g.moveTo(hx, hy);
  for (let a = R.a0; a <= R.a1 + 0.1; a += 20) g.lineTo(hx + 60 * Math.cos(a * d2r), hy + 60 * Math.sin(a * d2r));
  g.closePath(); g.clip();
  g.beginPath(); g.arc(R.head[0], R.head[1], R.head[2], 0, Math.PI * 2); g.fill();
  g.restore();
  // the light fringe, tapered at both ends
  const F = NUB2_FRINGE; g.lineWidth = F.lw; g.lineCap = "butt";
  for (let a = F.a0; a < F.a1; a += 2) {
    const k = Math.sin((Math.PI * (a + 1 - F.a0)) / (F.a1 - F.a0));
    g.strokeStyle = `rgba(${F.rgb},${(F.a * k).toFixed(3)})`;
    g.beginPath(); g.arc(R.head[0], R.head[1], F.r, a * d2r, (a + 2.2) * d2r); g.stroke();
  }
  g.restore();
  g.fillStyle = paper; nubPath(g); g.fill();
}

// ---------------------------------------------------------------- the card itself (card units)
// A copy of notecard.js's drawNoteCard, reduced to what s08 uses (screen widget, no notch, no typed text), with the
// close-up's measured geometry: per-corner body radii, the text box's corner radius, and the button labels' placement.
// Fix pass 2, measured on the source's frames 764-767 and 808-814 warped into F0 (paper edge at level 150, circle fits
// tangent to the straight edges): the top-left corner is rounder than the layout's 45 (source 49.4 F0 px at level 150
// against the render's 44.3 for a 45-unit path) and the bottom-left tighter (~42); the top-right and bottom-right
// match the layout's 45.
const CARD_W = 465, CARD_H = 648;
const AREA0 = { x0: 51, y0: 160, x1: 423, y1: 600.5, r: 15, lw: 3.5, btnY: 532.5, divX: 237 };
const CANCEL0 = [142.5, 566], SAVE0 = [328, 566];
// radii: [top-left, top-right, bottom-right, bottom-left]; labels: [[dx, dy] CANCEL, [dx, dy] SAVE] added to the
// labels' layout positions; saveW: SAVE's font weight (Geist Mono is variable)
export function drawCardBody(ctx, o) {
  const { x, y, w, theme: th, radii = [45, 45, 45, 45], labels = [[0, 0], [0, 0]], saveW = 700 } = o;
  const s = w / CARD_W;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  const [bx0, by0, bx1, by1] = th.body || [0, 0, CARD_W, CARD_H];
  const bodyPath = (dx = 0, dy = 0) => { ctx.beginPath(); ctx.roundRect(bx0 + dx, by0 + dy, bx1 - bx0, by1 - by0, radii); };
  ctx.save();
  if (th.rim) {
    const { dx, dy, color } = th.rim;
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = "round";
    bodyPath(dx, dy); ctx.fill(); ctx.stroke();
  }
  bodyPath(); ctx.lineWidth = 3; ctx.strokeStyle = th.outline; ctx.stroke();
  const body = ctx.createLinearGradient(0, 0, 0, CARD_H);
  body.addColorStop(0, th.paperTop); body.addColorStop(0.3, th.paper); body.addColorStop(0.62, th.paper); body.addColorStop(1, th.paperBot || th.paper);
  ctx.fillStyle = body;
  bodyPath(); ctx.fill();
  ctx.restore();
  // text box + button row
  const AR = th.area ? { ...AREA0, ...th.area } : AREA0;
  ctx.lineWidth = AR.lw; ctx.strokeStyle = th.ink; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.roundRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0, AR.r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(AR.x0, AR.btnY); ctx.lineTo(AR.x1, AR.btnY); ctx.moveTo(AR.divX, AR.btnY); ctx.lineTo(AR.divX, AR.y1); ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "1.6px";
  const [[cx, cy], [sx, sy]] = labels;
  ctx.font = "400 24px 'Geist Mono'"; ctx.fillStyle = th.muted; ctx.fillText("CANCEL", CANCEL0[0] + cx, CANCEL0[1] + 8.5 + cy);
  ctx.font = `${saveW} 24px 'Geist Mono'`; ctx.fillStyle = th.ink; ctx.fillText("SAVE", SAVE0[0] + sx, SAVE0[1] + 8.5 + sy);
  ctx.letterSpacing = "0px"; ctx.textAlign = "left";
  ctx.restore();
}
