// colour of the source's grade (G-(R+B)/2 and R-B measured per frame): a faint green lift in everything but pure black,
// rising through the pan and on the cartons, cut at 15.88 to a slight warm (red in the mids). [t, green add, red add]
// in 1/255 before the global grade
{{TINT}}

// ---------- the eyes (measured iris offsets during the scan, then the look) ----------
{{SCAN}}
function tab(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
}
function tab2(T, t, k) {
  if (t <= T[0][0]) return T[0][k];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[k] + (b[k] - a[k]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][k];
}
// the snap, read frame by frame: 218 still the stare; 219 an in-between (the stare's iris swung ~20 px right, dark and
// smeared); 220 the look with its irises still 4 px short of their rest; the look from 221
function eyeState(f, t) {
  if (f <= 218) return { dx: tab(SCAN, t), dy: 0, look: 0 };
  if (f === 219) return { dx: 20, dy: 3, look: 0, smear: true };
  if (f === 220) return { dx: 0, dy: 0, look: 1, irisLag: -4 };
  return { dx: 0, dy: 0, look: 1 };
}
// sweat beads: measured slide (px below the rest position at 6.04)
{{SLIDE}}
// a bead: the source draws a bold hook (J), thin at the top, the round bottom 3.5–4 px of dark ink (graded minimum
// 0.35–0.43 on the stare frames; the measured extents match designer.js's DROPS within 1 px)
function bead(g, top, bot, s = 1) {
  const h = bot[1] - top[1], w = Math.max(5, h * 0.3) * s;
  const pts = [top, [top[0] + (bot[0] - top[0]) * 0.3 - 1, top[1] + h * 0.45], [bot[0] - w * 0.45, bot[1] - w * 0.55], [bot[0], bot[1]], [bot[0] + w * 0.45, bot[1] - w * 0.5], [bot[0] + w * 0.55, bot[1] - w * 1.25]];
  const q = sampleCurve(pts, 5);
  taper(g, q, (u) => (u < 0.62 ? 0.5 + 3.4 * Math.pow(u / 0.62, 1.4) : 3.9 - 2.4 * (u - 0.62) / 0.38) * Math.max(0.6, s), gv(0.04, 0.93));
}

// ---------- the owl in flight: [t, root x, root y, px per owl unit, bank rad], one row per frame 16.00–19.12.
// Measured by template-matching the head (pass 1), then refit per frame (trace/fit_root.py, PART=head): each frame warped
// into the owl's frame, the similarity (shift, scale ±25%, bank −0.33…+0.15) aligning its head, cups and band edges with
// the median of the level-flight frames 17.84–19.12 (scores 0.67–0.93); smoothed 1-2-1.
{{ROOT}}
const WROOT = (t, k) => spline(ROOT, t, k);
function spline(T, t, k) {
  // Catmull-Rom through table rows [t, v1, v2...], column k
  if (t <= T[0][0]) return T[0][k];
  const n = T.length;
  if (t >= T[n - 1][0]) return T[n - 1][k];
  let i = 1; while (T[i][0] < t) i++;
  const p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
}
// the sitting owl's eyes, read frame by frame: open to 15.16, heavy lids 15.20, shut 15.24–15.56, heavy lids
// 15.60–15.68 (15.68 = the half-open in-between), open 15.72–15.96 (the wings start to lift at 15.88); 16.00 heavy lids
// again as it rises, shut from 16.04
const sitEyes = (f) => (f === 380 || f === 390 || f === 391 || f === 392 || f === 400 ? "half" : (f >= 381 && f <= 389) || f > 400 ? "shut" : "open");
// the owl leaves the lid at 16.20 (frame 405): until then its talons grip the box and its body is the sitting drawing
// (lifted with the root track, eyes shut); from 405 the flying drawing
const FLY_F0 = 405;
// ---------- layers ----------
let L = null;
function layers() {
  if (L) return L;
  // the two sharp views of the room, measured (roomInk.js): over the mosaic, feathered on the edges the pans reveal
  const traced = [roomTrace(STARE, STARE_PAPER, 0, 0, ["r", "t"]), roomTrace(BOXES, BOXES_PAPER, BOX_WX, BOX_WY, ["l", "b"], 30, BOX_CLEAR)];
  // the pans' world mosaic (panInk.js, half resolution; the same shapes in two sets of values: as the outbound pan shows
  // the room, and as the return does); its dark paper fills the whole canvas. The level edges are softened once
  // (sigma 1.5 world px): the source shows the pans' room as smooth tone, not as bands
  const mk = (set) => {
    const c = document.createElement("canvas"); c.width = PAN_W; c.height = PAN_H; const g = c.getContext("2d");
    g.fillStyle = gv(PAN_PAPER); g.fillRect(0, 0, PAN_W, PAN_H); for (const lev of set) shapeSet(g, lev, { div: 1000 });
    const c2 = document.createElement("canvas"); c2.width = PAN_W; c2.height = PAN_H; const g2 = c2.getContext("2d");
    g2.fillStyle = gv(PAN_PAPER); g2.fillRect(0, 0, PAN_W, PAN_H); g2.filter = "blur(0.75px)"; g2.drawImage(c, 0, 0);
    return c2;
  };
  const pan = { out: mk(PAN_OUT), back: mk(PAN_BACK), x0: PAN_X0, y0: PAN_Y0, x1: PAN_X0 + PAN_W * 2, y1: PAN_Y0 + PAN_H * 2 };
  L = { pan, traced, designer: null, S: null, S2: null, owl: new Map() };
  return L;
}
// the carton view's world origin = minus the camera offset at the hold (cam.js)
const BOX_WX = 2203.3, BOX_WY = -1893.4;
// above the top carton's lid, behind where the owl sits, the source is pure black once the owl has flown (16.68–17.2):
// the old inpaint left a grey cone there. Hold-frame polygon above the lid's front edge (953,355)–(1160,322) and the
// right face's top edge (1160,322)–(1280,387), 2 px inside, feathered 3 px
const BOX_CLEAR = [[992, 347], [1160, 319], [1230, 356], [1232, 30], [994, 30]];
function roomTrace(levels, paper, x0, y0, feather, fw = 30, clear = null) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = gv(paper); g.fillRect(0, 0, W, H);
  for (const lev of levels) shapeSet(g, lev, { div: 1000 });
  if (clear) {
    g.save(); g.filter = "blur(1.5px)"; g.fillStyle = gv(paper); g.beginPath(); g.moveTo(clear[0][0], clear[0][1]);
    for (const p of clear) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); g.restore();
  }
  g.globalCompositeOperation = "destination-out";
  for (const side of feather) {
    const [ax, ay, bx, by, rx, ry, rw, rh] = side === "r" ? [W, 0, W - fw, 0, W - fw, 0, fw, H] : side === "l" ? [0, 0, fw, 0, 0, 0, fw, H] : side === "t" ? [0, 0, 0, fw, 0, 0, W, fw] : [0, H, 0, H - fw, 0, H - fw, W, fw];
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.globalCompositeOperation = "source-over";
  return { c, x0, y0, x1: x0 + W, y1: y0 + H };
}
// the designer, drawn once per phase (world rect x 0..W, y -400..H): the stare and the look
function designer() {
  if (L.designer) return L.designer;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H + 400; const g = c.getContext("2d"); g.translate(0, 400); return [c, g]; };
  const [base, bg] = mk(); paintBase(bg);
  const [stare, sg] = mk(); sg.drawImage(base, 0, -400); paintEyes(sg, 0);
  const [look, lg] = mk(); lg.drawImage(base, 0, -400); paintEyes(lg, 1);
  return (L.designer = { stare, look, x0: 0, y0: -400, x1: W, y1: H });
}
// scratch-lab hook (snapshots/s02-lab only; the film never calls it): change the options (DOPTS) and rebuild the designer
export const __lab = { designer(opts) { Object.assign(DOPTS, opts); if (L) L.designer = null; } };
const visible = (r, ox, oy, m) => r.x1 + ox > -m && r.x0 + ox < W + m && r.y1 + oy > -m && r.y0 + oy < H + m;

// ---- the room: the pan mosaic (part = "mos") or the two sharp views (part = "views"), camera offset (ox, oy)
function paintRoom(g, t, ox, oy, m, part) {
  if (part !== "views") { const p = L.pan; g.drawImage(t < 15.5 ? p.out : p.back, p.x0 + ox, p.y0 + oy, p.x1 - p.x0, p.y1 - p.y0); }
  if (part !== "mos") for (const p of L.traced) if (visible(p, ox, oy, m)) g.drawImage(p.c, p.x0 + ox, p.y0 + oy);
}
// ---- the designer (the stare or the look; irises per frame; sweat beads)
const EYE_OPEN1 = EYES.map((E) => {
  const up = sampleCurve(E.up1.map(([x, y]) => [x, y - 3]), 8), lo = sampleCurve(E.lo1.map(([x, y]) => [x, y + 3]), 8).reverse();
  return up.concat(lo);
});
function paintDesigner(g, f, t, ox, oy, m) {
  const D = designer();
  if (!visible(D, ox, oy, m)) return;
  const st = eyeState(f, t);
  if (st.look < 1) {
    g.drawImage(D.stare, D.x0 + ox, D.y0 + oy);
    g.save(); g.translate(ox, oy); g.lineCap = "round"; g.lineJoin = "round";
    if (st.smear) {
      // 219: the iris mid-swing, smeared (three passes along x, the last on top)
      for (const [dd, a] of [[-2, 0.45], [2, 0.45], [0, 0.6]]) { g.globalAlpha = a; paintIris(g, st.dx + dd, st.dy); }
      g.globalAlpha = 1;
    } else paintIris(g, st.dx, st.dy);
    g.restore();
  }
  if (st.look > 0) {
    g.drawImage(D.look, D.x0 + ox, D.y0 + oy);
    if (st.irisLag) {
      // 220: inside the lowered lids, the look's eyes 4 px short of their rest
      g.save(); g.beginPath();
      for (const q of EYE_OPEN1) { g.moveTo(q[0][0] + ox, q[0][1] + oy); for (const p of q) g.lineTo(p[0] + ox, p[1] + oy); g.closePath(); }
      g.clip(); g.drawImage(D.look, D.x0 + ox + st.irisLag, D.y0 + oy); g.restore();
    }
  }
  g.save(); g.translate(ox, oy);
  g.lineCap = "round"; g.lineJoin = "round";
  const sa = tab(SLIDE_A, t) / 28, sb = smooth(clamp((t - 6.04) / (7.25 - 6.04)));
  for (const d of DROPS) {
    const u = d.slide === "a" ? sa : d.slide === "b" ? sb : 0;
    const dx = (d.dx || 0) * u, dy = (d.dy || 0) * u, gy = (d.grow || 0) * u;
    bead(g, [d.top[0] + dx, d.top[1] + dy - gy], [d.bot[0] + dx, d.bot[1] + dy], d.small ? 0.5 : 1);
  }
  g.restore();
}

// the sitting owl: measured drawings (owlInk.js) in hold-frame coords, world-locked beside the carton view
const SIT_BOX = [930, 36, 1250, 372];
function sitCanvas(eyes) {
  const k = "sit-" + eyes;
  if (L.owl.has(k)) return L.owl.get(k);
  const [x0, y0, x1, y1] = SIT_BOX, c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
  const g = c.getContext("2d");
  for (const lev of SIT) shapeSet(g, lev, { div: 1000, dx: -x0, dy: -y0 });
  if (eyes !== "open") for (const lev of eyes === "half" ? SIT_HALF : SIT_SHUT) shapeSet(g, lev, { div: 1000, dx: -x0, dy: -y0 });
  L.owl.set(k, c);
  return c;
}
// ---- the sitting owl and (from 15.88) its wings; 16.00–16.16 the body rises with the root track while the talons stay
// on the lid (hold-frame y > TALON_Y is the feet)
const TALON_Y = 322;
function paintSitOwl(g, f, t, ox, oy) {
  if (f >= FLY_F0 || t < 13.6) return;
  const X = BOX_WX + SIT_BOX[0] + ox, Y = BOX_WY + SIT_BOX[1] + oy, C = sitCanvas(sitEyes(f));
  if (f >= WING_F0) drawOwlWings(g, f, t, ox + 2203.3 - BOX_WX, oy - 1893.4 - BOX_WY);
  if (f < 400) { g.drawImage(C, X, Y); return; }
  const dx = WROOT(t, 1) - WROOT(16, 1), dy = WROOT(t, 2) - WROOT(16, 2), cut = TALON_Y - SIT_BOX[1];
  g.drawImage(C, 0, cut, C.width, C.height - cut, X, Y + cut, C.width, C.height - cut);
  g.drawImage(C, 0, 0, C.width, cut + 6, X + dx, Y + dy, C.width, cut + 6);
}
// the flying owl: this frame's measured wings, then the measured body, placed by the root track (x, y, scale, bank)
// (frame coords; (ox, oy) = where the hold frame's origin is now, zero while the camera is still)
function drawOwlWings(ctx, f, tq, ox = 0, oy = 0) {
  const x = WROOT(tq, 1) + ox, y = WROOT(tq, 2) + oy, s = WROOT(tq, 3), rot = WROOT(tq, 4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  drawWingInk(ctx, f, 0); drawWingInk(ctx, f, 1);
  ctx.restore();
}
// the source's owl is a little soft in flight (edge blur measured along the wing outlines, frames 397..478, minus the
// sharpest frames' 1.0 px): sigma px. Fix pass 1: the body and head stay crisp in the source (its outline, band and
// claws read sharp at 18.8), so this is capped at 0.5 px
{{OWLSOFT}}
function drawFlyingOwl(ctx, f, tq) {
  const x = WROOT(tq, 1), y = WROOT(tq, 2), s = WROOT(tq, 3);
  // drawn offscreen round the root, then laid in with the measured softness
  const bw = Math.ceil(1100 * s), bh = Math.ceil(900 * s), bx = Math.floor(x - bw / 2), by = Math.floor(y - bh * 0.55);
  if (!L.owlBuf) L.owlBuf = document.createElement("canvas");
  const B = L.owlBuf; if (B.width !== bw || B.height !== bh) { B.width = bw; B.height = bh; }
  const g = B.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh); g.translate(-bx, -by);
  drawOwlWings(g, f, tq);
  const rot = WROOT(tq, 4);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const lev of FLY) shapeSet(g, lev, { div: 1000 });
  g.restore();
  const sg = Math.min(0.5, OWL_SOFT[Math.max(0, Math.min(OWL_SOFT.length - 1, f - WING_F0))]);
  ctx.save(); if (sg > 0.25) ctx.filter = `blur(${sg.toFixed(2)}px)`; ctx.drawImage(B, bx, by); ctx.restore();
}

// the colour lift: masks from the frame itself at half resolution (any non-black pixel for green; the mids and up for
// red), added with "lighter"
function tint(ctx, t) {
  const gA = tab2(TINT, t, 1), rA = tab2(TINT, t, 2);
  if (gA < 0.2 && rA < 0.2) return;
  if (!L.tint) { L.tint = document.createElement("canvas"); L.tint.width = W >> 1; L.tint.height = H >> 1; }
  const T = L.tint, tg = T.getContext("2d");
  for (const [amt, k, col] of [[gA, 32, "#00ff00"], [rA, 3, "#ff0000"]]) {
    if (amt < 0.2) continue;
    tg.globalCompositeOperation = "source-over"; tg.filter = `grayscale(1) brightness(${k})`;
    tg.drawImage(ctx.canvas, 0, 0, T.width, T.height);
    tg.filter = "none"; tg.globalCompositeOperation = "multiply"; tg.fillStyle = col; tg.fillRect(0, 0, T.width, T.height);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = amt / 255;
    ctx.drawImage(T, 0, 0, W, H);
    ctx.restore();
  }
}

// one layer, painted into a scratch buffer with a margin, smeared along the pan (N copies, premultiplied "lighter" sum)
// and laid into the frame through one gaussian; drawn straight in when there is no blur
function layer(ctx, Lb, sg, dir, paint) {
  if (Lb < 1 && sg < 0.3) { paint(ctx, 0, 0, 0); return; }
  const m = Math.ceil(Lb / 2 + 3 * sg) + 4;
  if (!L.S) { L.S = document.createElement("canvas"); L.S2 = document.createElement("canvas"); }
  const S = L.S, S2 = L.S2;
  for (const c of [S, S2]) if (c.width !== W + 2 * m || c.height !== H + 2 * m) { c.width = W + 2 * m; c.height = H + 2 * m; }
  const g = S.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
  g.clearRect(0, 0, S.width, S.height);
  paint(g, m, m, m);
  let src = S;
  if (Lb >= 1) {
    const N = Math.min(11, 2 + Math.round(Lb / 2.5));
    const g2 = S2.getContext("2d");
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.filter = "none"; g2.globalAlpha = 1; g2.globalCompositeOperation = "source-over";
    g2.clearRect(0, 0, S2.width, S2.height);
    g2.globalCompositeOperation = "lighter"; g2.globalAlpha = 1 / N;
    for (let k = 0; k < N; k++) { const u = (k / (N - 1) - 0.5) * Lb; g2.drawImage(S, dir[0] * u, dir[1] * u); }
    g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1;
    src = S2;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (sg >= 0.3) ctx.filter = `blur(${sg.toFixed(2)}px)`;
  ctx.drawImage(src, -m, -m);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    let f = frameOf(t);
    if (REPEAT.has(f)) f -= 1;
    const tq = f / 25;
    layers();
    const [ox, oy] = camAt(f), dir = panDir(f);
    const rb = rowAt(ROOMB, ROOMB0, f, 2) || [0, 0];
    // the room: the mosaic gets what the room needs beyond its own blur, the sharp views the full measured blur
    const mb = [Math.sqrt(Math.max(0, rb[0] * rb[0] - MOSB[0] * MOSB[0])), Math.sqrt(Math.max(0, rb[1] * rb[1] - MOSB[1] * MOSB[1]))];
    layer(ctx, mb[0], mb[1], dir, (g, a, b, m) => paintRoom(g, tq, ox + a, oy + b, m, "mos"));
    layer(ctx, rb[0], rb[1], dir, (g, a, b, m) => paintRoom(g, tq, ox + a, oy + b, m, "views"));
    // the sitting owl (its own measured blur on the arrival)
    if (tq >= 13.6 && f < FLY_F0) {
      const obr = rowAt(OWLB, OWLB0, f, 2) || [0, 0];
      layer(ctx, obr[0], obr[1], dir, (g, a, b) => paintSitOwl(g, f, tq, ox + a, oy + b));
    }
    // the designer (his own measured blur)
    if (tq < 13.8 || tq > 17.6) {
      const db = rowAt(DESB, DESB0, f, 2) || [0, 0];
      layer(ctx, db[0], db[1], dir, (g, a, b, m) => paintDesigner(g, f, tq, ox + a, oy + b, m));
    }
    // the owl in flight
    if (f >= FLY_F0) drawFlyingOwl(ctx, f, tq);
    tint(ctx, tq);
  },
  release() { L = null; },
};
