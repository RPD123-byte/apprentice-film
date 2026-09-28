// The websites that appear on screens in the film, drawn with canvas text and shapes.
// Each page draws into (ctx, w, h). Pages are cached as canvases by the caller when static.
//
// sōko ("MIXING DOWN, LATE AT NIGHT.") — owned by F1, documented in docs/soko.md.
// Page coordinates are the full-frame page at 48.8–53.2 s: 2206 x 946, measured on the source.
import { cached } from "./paths.js";
import { rng } from "./rng.js";
import { sokoIllCanvas, releaseSokoIll, sokoIllSmall, blurCanvas } from "./sokoIll.js";

const font = (ctx, spec, stretch = "normal") => { ctx.font = spec; ctx.fontStretch = stretch; };

// ======================================================================================
// sōko: geometry (all measured on the source film)
// ======================================================================================
export const PAGE_W = 2206, PAGE_H = 946;
export const SOKO_BG = "#030303";

// The framed-screen presentation (69.44–~112 s): the page shrunk onto a lit screen in a dark room.
// Page -> frame: fx = x + sx * px, fy = y + sy * py. Re-fitted (F1 pass 2) by phase correlation of 246 patches of the
// source's own full-frame page (median of 48.8–53.2 s) against the framed frames at 71 and 76 s, UI and
// illustration together: residual median 0.84 px, max 1.95 px in x; median 0.19 px, max 0.68 px in y. The source's
// framed page is slightly barrel-shaped horizontally (the centre sits ~1.4 px right of the linear fit, the edges
// ~1 px left); `quad` is that exact x mapping (fx = a + b·px + c·px², median error 0.39 px, max 1.2 px), used by
// drawFramedPage({ exact: true }) and toFramedExact(). Everything else (framedTransform, toFramed, HEADER_FRAMED,
// the default drawFramedPage) uses the linear mapping so that all layers drawn by shots stay registered.
// `screen` is the lit screen's thin border line (it runs off the bottom of the frame); `glowRect` is the area
// the source's finish pass treated as the page when it spilled the light into the margins.
export const FRAMED = {
  x: 162.36, y: 132.85, sx: 0.842616, sy: 0.847317,
  w: PAGE_W * 0.842616, h: PAGE_H * 0.847317,
  quad: { a: 160.083837, b: 0.8487982, c: -2.9e-6 },
  screen: { x0: 144, y0: 128.5, x1: 2023, y1: 946 },
  glowRect: { x0: 137, y0: 121.5, x1: 2030, y1: 946 },
};
export const toFramed = (px, py) => [FRAMED.x + FRAMED.sx * px, FRAMED.y + FRAMED.sy * py];
export const fromFramed = (fx, fy) => [(fx - FRAMED.x) / FRAMED.sx, (fy - FRAMED.y) / FRAMED.sy];
export const toFramedExact = (px, py) => { const { a, b, c } = FRAMED.quad; return [a + b * px + c * px * px, FRAMED.y + FRAMED.sy * py]; };

// The header strip the owl cuts out (74.5–84 s) and the colour banner later fills (~88 s), in page coordinates.
// Measured in frame coordinates on the cut hole at 86.4 s (white torn rim peaks: x 193.5 / 1975, y 185.5 / 361,
// jitter ±1.5 px) and on the pasted banner's border at 90 s (x ~192 / 1975, y ~184 / 362); re-checked on the
// owl's outline at 81 s (x ~193 / 1980, y ~185 / 367: it runs a few px outside and wobbles). Mapped back through
// the linear FRAMED, so toFramed(HEADER) lands on the measured frame rectangle.
export const HEADER = { x: 36.96, y: 62.14, w: 2114.23, h: 207.12 };
// HEADER in frame coordinates (for shots working in frame space during 69.44–110.5): x 193.5, y 185.5, w 1781.5, h 175.5.
export const HEADER_FRAMED = (() => { const [x0, y0] = toFramed(HEADER.x, HEADER.y), [x1, y1] = toFramed(HEADER.x + HEADER.w, HEADER.y + HEADER.h); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; })();
// Apply the page->frame mapping to a context: afterwards draw in page coordinates.
export function framedTransform(ctx) { ctx.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y); }

// The torn edge of the cut-out (page coordinates): a jagged closed polyline round HEADER, segments ~20–28 px,
// ±3.5 px jitter (as the hole at 86.4 s). `inset` grows (+) or shrinks (−) it. Deterministic per seed.
export function headerTornPoints({ seed = 7, amp = 3.5, inset = 0 } = {}) {
  const r = rng(seed), pts = [];
  const x0 = HEADER.x - inset, y0 = HEADER.y - inset, x1 = HEADER.x + HEADER.w + inset, y1 = HEADER.y + HEADER.h + inset;
  const edge = (ax, ay, bx, by) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / 24)), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let i = 0; i < n; i++) { const t = (i + (i ? (r() - 0.5) * 0.5 : 0)) / n, j = i ? (r() - 0.5) * 2 * amp : 0; pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]); }
  };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  return pts;
}
export function headerTornPath(ctx, opts) { const p = headerTornPoints(opts); ctx.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); }
// The hole left in the page once the strip is gone (86 s): near-black inside, a white torn rim ~4.5 px wide.
export function drawHeaderHole(ctx, { seed = 7, rim = true, fill = "#070807" } = {}) {
  ctx.save();
  ctx.beginPath(); headerTornPath(ctx, { seed }); ctx.fillStyle = fill; ctx.fill();
  if (rim) { ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(236,236,230,0.93)"; ctx.lineWidth = 4.5; ctx.stroke(); }
  ctx.restore();
}

// ======================================================================================
// sōko: UI layers (page coordinates)
// ======================================================================================
const NAV = [
  // icon x, label x, label, sub-label
  [1275, 1302, "objects", "IN 1 · instruments / tools / spares"],
  [1550, 1577, "radio", "IN 2 · live / archive / zine"],
  [1785, 1812, "store", "IN 3 · cart / offers / gift"],
  [2013, 2041, "index", "IN 4 · manuals / support"],
];

// Top rail: brand mark + "sōko / objects" + the four nav items (y 0–50).
export function drawSokoRail(ctx) {
  ctx.save();
  // brand mark: a disc and a rounded bar, with a small yellow tick
  ctx.fillStyle = "#e4e4e1";
  ctx.beginPath(); ctx.arc(31, 26, 17, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, 46, 7.5, 18.5, 37.5, 2.2); ctx.fill();
  ctx.fillStyle = "#d8cf2a"; ctx.fillRect(30.6, 13.5, 2.4, 8.5);
  font(ctx, "300 17.75px Geist"); ctx.letterSpacing = "0.5px"; ctx.fillStyle = "rgba(226,226,223,0.86)";
  ctx.fillText("sōko", 77, 23); ctx.fillText("objects", 77, 41.5);
  for (const [ix, lx, label, sub] of NAV) {
    // knob: a dark disc with a lit rim at the bottom and a glowing white centre
    const g = ctx.createRadialGradient(ix, 25.5, 4, ix, 25.5, 16);
    g.addColorStop(0, "rgba(90,92,92,0.9)"); g.addColorStop(0.55, "rgba(34,36,36,0.95)"); g.addColorStop(1, "rgba(10,10,10,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, 25.5, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(120,122,122,0.55)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(ix, 26, 12.5, 0.35, Math.PI - 0.35); ctx.stroke();
    ctx.fillStyle = "rgba(225,228,228,0.35)"; ctx.beginPath(); ctx.arc(ix, 25.5, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e2e5e6"; ctx.beginPath(); ctx.arc(ix, 25.5, 6.4, 0, Math.PI * 2); ctx.fill();
    font(ctx, "400 16.5px Geist"); ctx.letterSpacing = "0.5px"; ctx.fillStyle = "rgba(228,228,225,0.82)";
    ctx.fillText(label, lx, 24.5);
    font(ctx, "400 9.3px 'Geist Mono'"); ctx.letterSpacing = "0px"; ctx.fillStyle = "rgba(160,162,160,0.62)";
    ctx.fillText(sub, lx + 1, 39.5);
  }
  // the rivet at the right edge of the page (its twin sits just left of the page, see drawFramedPage)
  ctx.fillStyle = "rgba(200,202,200,0.8)"; ctx.beginPath(); ctx.arc(2203, 26, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.letterSpacing = "0px";
  ctx.restore();
}

// Headline: Archivo 900 at 125% width. Fitted to the source glyph edges (mean error < 1 px):
// 79 px, letter-spacing -1.75 px, x 64, baselines 148 / 222.
export function drawSokoHeadline(ctx, { color = "#f1f0ec" } = {}) {
  ctx.save();
  font(ctx, "900 79px Archivo", "expanded");
  ctx.letterSpacing = "-1.75px";
  ctx.fillStyle = color;
  ctx.fillText("MIXING DOWN,", 64, 148);
  ctx.fillText("LATE AT NIGHT.", 64, 222);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

// Counter LCD (000.0) and the yellow play key, top right.
export function drawSokoCounter(ctx, { counter = "000.0" } = {}) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(1900, 158, 190, 8);           // the panel's shadow
  ctx.fillStyle = "#1b1c14"; ctx.fillRect(1900, 90, 190, 72);
  ctx.strokeStyle = "rgba(60,62,50,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(1900.5, 90.5, 189, 71);
  font(ctx, "400 49.25px 'Geist Mono'"); ctx.letterSpacing = "1.75px";
  ctx.fillStyle = "#efebd6"; ctx.shadowColor = "rgba(240,236,214,0.35)"; ctx.shadowBlur = 6;
  // the source's digits are ~5% shorter than Geist Mono's at this width (glyph rows 110-145, measured): squash
  // vertically about the digits' top edge
  ctx.save(); ctx.translate(0, 110); ctx.scale(1, 0.95); ctx.translate(0, -110);
  ctx.fillText(counter, 1919, 147);
  ctx.restore();
  ctx.shadowBlur = 0; ctx.letterSpacing = "0px";
  // yellow key
  ctx.fillStyle = "#f5da0c"; roundRect(ctx, 1904, 174.5, 47, 45, 5.5); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)"; roundRect(ctx, 1906, 176, 43, 8, 4); ctx.fill();
  ctx.fillStyle = "rgba(255,252,230,0.85)"; ctx.beginPath(); ctx.moveTo(1921.5, 191); ctx.lineTo(1930, 196.5); ctx.lineTo(1921.5, 202); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Everything inside the HEADER strip, in page coordinates, clipped to the strip: the illustration behind it,
// the headline, the top of the DO NOT KNOCK plate, the counter and the key. (What the owl lifts away.)
export function drawSokoHeader(ctx, { gaze = "owl", counter = "000.0", ill = true, scale = 1 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(HEADER.x, HEADER.y, HEADER.w, HEADER.h); ctx.clip();
  ctx.fillStyle = SOKO_BG; ctx.fillRect(HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  if (ill) ctx.drawImage(sokoIllCanvas({ gaze, scale }), 0, 0, PAGE_W, PAGE_H);
  drawSokoHeadline(ctx);
  drawSokoCounter(ctx, { counter });
  ctx.restore();
}

// The whole page into a context (page coordinates; ctx may be pre-scaled by the caller).
//   header: false leaves the HEADER strip as a black hole (after the owl has cut it out)
//   rail / ui / ill: switch the top rail, the headline+counter, the illustration
export function drawSokoPage(ctx, { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1 } = {}) {
  ctx.save();
  ctx.fillStyle = SOKO_BG; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  if (ill) ctx.drawImage(sokoIllCanvas({ gaze, scale }), 0, 0, PAGE_W, PAGE_H);
  if (ui) { drawSokoHeadline(ctx); drawSokoCounter(ctx, { counter }); }
  if (rail) drawSokoRail(ctx);
  if (!header) drawHeaderHole(ctx, { rim: hole === "torn" });
  ctx.restore();
}

// sōko canvases are cached here (not in paths.js) so releaseSoko() can free them.
// The source page is softer than a crisp canvas render at every scale (band-pass energy of the headline, the counter
// and the illustration regions, measured against the owl-free median of 48.8-53.2 s): a gaussian of SOKO_SOFT page
// px on the finished page matches it (fine/mid-band energy ratio 0.94-1.0). Applied once to cached pages and strips.
export const SOKO_SOFT = 0.65;
const SOKO_CACHE = new Map();
function sokoCached(key, w, h, scale, draw, soft = 0) {
  let c = SOKO_CACHE.get(key);
  if (!c) {
    // CPU-backed canvases: the blur (and the many small draws) run far faster in software than through an
    // emulated GPU, and the result is uploaded once per use
    c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext("2d", { willReadFrequently: true }); g.scale(scale, scale); draw(g);
    if (soft > 0) blurCanvas(c, soft * scale);
    c.__scale = scale; SOKO_CACHE.set(key, c);
  }
  return c;
}
// Free every cached sōko canvas (pages, header strips, illustrations). Call from a shot's release().
export function releaseSoko() { SOKO_CACHE.clear(); releaseSokoIll(); }

// Cached page canvas (PAGE_W*scale x PAGE_H*scale). Same options as drawSokoPage.
export function sokoPageCanvas(opts = {}) {
  const { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1, soft = SOKO_SOFT } = opts;
  const key = `page:${header}:${hole}:${rail}:${ui}:${ill}:${gaze}:${counter}:${scale}:${soft}`;
  return sokoCached(key, PAGE_W, PAGE_H, scale, (g) => drawSokoPage(g, { header, hole, rail, ui, ill, gaze, counter, scale }), soft);
}

// Cached canvas of just the HEADER strip (HEADER.w*scale x HEADER.h*scale); draw it at HEADER.x/HEADER.y
// (page) or HEADER_FRAMED (frame) to put it back, or anywhere to carry it off.
export function sokoHeaderCanvas({ gaze = "owl", counter = "000.0", scale = 1, soft = SOKO_SOFT } = {}) {
  return sokoCached(`header:${gaze}:${counter}:${scale}:${soft}`, HEADER.w, HEADER.h, scale, (g) => {
    g.translate(-HEADER.x, -HEADER.y);
    drawSokoHeader(g, { gaze, counter, scale });
  }, soft);
}

// ---------- the page on a lit screen in a dark room (69.44–~112 s) ----------
// Reproduces the source's finish pass (finish2.py): the page sits at FRAMED; the room around it is black, and
// the page's own light spills into the margins: the content inside the screen is shrunk 8x, blurred
// (0.6·σ7 + 0.4·σ26 at 1/8 scale), gained 4.5x, capped at 120/255 and added outside the screen through a
// soft (σ10) mask. The glow follows whatever is on the page, so pass the page canvas as it is at that frame
// (with the owl/banner drawn into it if they should light the room).
//   src: canvas in page coordinates (any resolution; it is drawn to PAGE_W x PAGE_H)
//   opts.glow   gain multiplier (1 = the source); 0 disables
//   opts.border draw the screen's thin border line and the left rivet (default true)
//   opts.over   optional (ctx) => {} drawn in frame coordinates, clipped to the screen, before the glow is taken
let glowSmall = null, glowFull = null, glowMask = null, glowTmp = null, glowHalf = null;
export function drawFramedPage(ctx, src, { glow = 1, border = true, over = null, exact = false } = {}) {
  const S = FRAMED.screen, W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the dark room
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  // the screen: page background, then the page through its affine
  ctx.save();
  ctx.beginPath(); ctx.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); ctx.clip();
  ctx.fillStyle = SOKO_BG; ctx.fillRect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0);
  ctx.imageSmoothingQuality = "medium";
  if (exact) drawPageFramedExact(ctx, src);
  else ctx.drawImage(src, FRAMED.x, FRAMED.y, FRAMED.w, FRAMED.h);
  if (border) {
    ctx.fillStyle = "rgba(200,202,200,0.8)"; ctx.beginPath(); ctx.arc(147.5, 154.5, 3.3, 0, Math.PI * 2); ctx.fill();
  }
  if (over) over(ctx);
  ctx.restore();
  if (border) {
    ctx.strokeStyle = "rgba(62,64,62,0.62)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(S.x0, S.y1 + 2); ctx.lineTo(S.x0, S.y0); ctx.lineTo(S.x1, S.y0); ctx.lineTo(S.x1, S.y1 + 2); ctx.stroke();
  }
  if (glow > 0) addScreenGlow(ctx, glow);
  ctx.restore();
}

// Draw a page-coordinate canvas (PAGE_W x PAGE_H at any resolution) onto the frame with the exact (slightly
// barrel-shaped) x mapping FRAMED.quad, as 1-D strips of 8 page px (the mapping is linear to 0.01 px over a strip).
export function drawPageFramedExact(ctx, src, [px0, py0, px1, py1] = [0, 0, PAGE_W, PAGE_H]) {
  const k = src.width / PAGE_W, ky = src.height / PAGE_H, STEP = 8;
  const fy0 = FRAMED.y + FRAMED.sy * py0, fh = FRAMED.sy * (py1 - py0);
  for (let x = px0; x < px1; x += STEP) {
    const xe = Math.min(px1, x + STEP), [fa] = toFramedExact(x, 0), [fb] = toFramedExact(xe, 0);
    // overlap each strip by a hair so no seams show
    ctx.drawImage(src, x * k, py0 * ky, (xe - x) * k, (py1 - py0) * ky, fa, fy0, fb - fa + 0.35, fh);
  }
}

// The glow pass on its own (frame coordinates): reads the screen area of ctx and adds its light outside it.
export function addScreenGlow(ctx, gain = 1) {
  const S = FRAMED.glowRect, W = ctx.canvas.width, H = ctx.canvas.height;
  const sw = Math.round(W / 8), sh = Math.round(H / 8);
  if (!glowSmall) {
    glowSmall = document.createElement("canvas"); glowSmall.width = sw; glowSmall.height = sh;          // GPU: downsample
    glowTmp = document.createElement("canvas"); glowTmp.width = sw; glowTmp.height = sh;              // CPU: read/write
    glowFull = document.createElement("canvas"); glowFull.width = W; glowFull.height = H;
    // outside = 1 - GaussianBlur(inside, sigma 10), built analytically (the blur of a rectangle is separable), at
    // quarter resolution (it is smooth) and scaled up when used
    const MW = Math.ceil(W / 4), MH = Math.ceil(H / 4);
    glowMask = document.createElement("canvas"); glowMask.width = MW; glowMask.height = MH;
    const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const sig = 10, fx = new Float32Array(MW), fy = new Float32Array(MH);
    for (let x = 0; x < MW; x++) fx[x] = Phi((x * 4 + 2 - S.x0) / sig) - Phi((x * 4 + 2 - S.x1) / sig);
    for (let y = 0; y < MH; y++) fy[y] = Phi((y * 4 + 2 - S.y0) / sig) - Phi((y * 4 + 2 - (S.y1 + 60)) / sig);
    const m = glowMask.getContext("2d"), id = m.createImageData(MW, MH), d = id.data;
    for (let y = 0, i = 3; y < MH; y++) for (let x = 0; x < MW; x++, i += 4) d[i] = Math.round(255 * (1 - fx[x] * fy[y]));
    m.putImageData(id, 0, 0);
  }
  // 1) inside-only content, shrunk 8x by three bilinear halvings (cheap on any GPU, close to an area average)
  if (!glowHalf) { glowHalf = [2, 4].map((k) => { const c = document.createElement("canvas"); c.width = Math.round(W / k); c.height = Math.round(H / k); return c; }); }
  const [h2, h4] = glowHalf, y1 = Math.min(H, S.y1);
  const g2 = h2.getContext("2d"); g2.setTransform(1, 0, 0, 1, 0, 0); g2.fillStyle = "#000"; g2.fillRect(0, 0, h2.width, h2.height);
  g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = "low";
  g2.drawImage(ctx.canvas, S.x0, S.y0, S.x1 - S.x0, y1 - S.y0, S.x0 / 2, S.y0 / 2, (S.x1 - S.x0) / 2, (y1 - S.y0) / 2);
  const g4 = h4.getContext("2d"); g4.imageSmoothingEnabled = true; g4.imageSmoothingQuality = "low"; g4.drawImage(h2, 0, 0, h4.width, h4.height);
  const sg = glowSmall.getContext("2d"); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "low"; sg.drawImage(h4, 0, 0, sw, sh);
  const tg = glowTmp.getContext("2d", { willReadFrequently: true });
  tg.clearRect(0, 0, sw, sh); tg.drawImage(glowSmall, 0, 0);
  const src = tg.getImageData(0, 0, sw, sh);
  // 2) 0.6·blur(7) + 0.4·blur(26), x4.5, capped at 120 (gaussians approximated by three box passes)
  const a = gaussRGB(src.data, sw, sh, 7), b = gaussRGB(src.data, sw, sh, 26);
  const o = src.data;
  for (let i = 0; i < o.length; i += 4) {
    for (let k = 0; k < 3; k++) o[i + k] = Math.min(120, (0.6 * a[i + k] + 0.4 * b[i + k]) * 4.5 * gain);
    o[i + 3] = 255;
  }
  tg.putImageData(src, 0, 0);
  // 3) upsample, multiply by the outside mask, add
  const fg = glowFull.getContext("2d");
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "copy"; fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = "low";
  fg.drawImage(glowTmp, 0, 0, W, H);
  fg.globalCompositeOperation = "destination-in"; fg.imageSmoothingQuality = "medium"; fg.drawImage(glowMask, 0, 0, W, H);
  fg.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glowFull, 0, 0); ctx.restore();
}

// Gaussian blur of RGBA8 data -> Float32Array (alpha ignored), replicated edges, as three box passes per axis.
function gaussRGB(d, w, h, sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4), m = Math.round(mIdeal);
  const sizes = []; for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
  let cur = new Float32Array(w * h * 4); for (let i = 0; i < cur.length; i++) cur[i] = d[i];
  let tmp = new Float32Array(w * h * 4);
  const box = (inp, out, r, horiz) => {
    const len = horiz ? w : h, lines = horiz ? h : w, stride = horiz ? 4 : w * 4, k = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * w * 4 : l * 4;
      for (let c = 0; c < 3; c++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += inp[base + Math.min(len - 1, Math.max(0, i)) * stride + c];
        for (let i = 0; i < len; i++) {
          out[base + i * stride + c] = acc * k;
          acc += inp[base + Math.min(len - 1, i + r + 1) * stride + c] - inp[base + Math.max(0, i - r) * stride + c];
        }
      }
    }
  };
  for (const sz of sizes) { const r = (sz - 1) / 2; box(cur, tmp, r, true); box(tmp, cur, r, false); }
  return cur;
}

// ---------- drawSoko: the page at any size (laptop screens in s01/s05/s07, or full-frame) ----------
// ill(ctx, w, h) paints the hero illustration; omitted -> the real illustration (sokoIllSmall), null -> none.
// The UI is laid out in page coordinates and stretched to (w, h) like the source's laptop screens.
export function drawSoko(ctx, w, h, { ill = sokoIllSmall, counter = "000.0", owlInPage = null, header = true } = {}) {
  const k = w / PAGE_W, ky = h / PAGE_H;
  ctx.save();
  ctx.fillStyle = SOKO_BG;
  ctx.fillRect(0, 0, w, h);
  if (ill) { ctx.save(); ill(ctx, w, h); ctx.restore(); }
  ctx.scale(k, ky);
  drawSokoHeadline(ctx);
  drawSokoCounter(ctx, { counter });
  drawSokoRail(ctx);
  if (!header) drawHeaderHole(ctx);
  if (owlInPage) owlInPage(ctx);
  ctx.restore();
}

// ---------- Letters, cut by hand (a light type-foundry page) ----------
export function drawLetters(ctx, w, h, { specimen = true } = {}) {
  const s = w / 1600;
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = "#ecebe6"; ctx.fillRect(0, 0, 1600, h / s);
  ctx.fillStyle = "#151515"; roundRect(ctx, 40, 26, 58, 34, 4); ctx.fill();
  font(ctx, "700 22px Fraunces"); ctx.fillStyle = "#ecebe6"; ctx.fillText("O&I", 46, 51);
  font(ctx, "500 15px Geist"); ctx.fillStyle = "#444"; ctx.fillText("Type Foundry", 112, 49);
  ctx.fillStyle = "#9a9a96"; for (let i = 0; i < 4; i++) ctx.fillRect(300 + i * 110, 42, 70, 8);
  font(ctx, "400 150px Fraunces"); ctx.fillStyle = "#1a1a1a"; ctx.letterSpacing = "-3px";
  ctx.fillText("Letters,", 60, 270); ctx.fillText("cut by hand.", 60, 410); ctx.letterSpacing = "0px";
  ctx.fillStyle = "#a7a6a1"; for (let i = 0; i < 3; i++) ctx.fillRect(64, 470 + i * 26, 560 - i * 90, 11);
  ctx.fillStyle = "#151515"; roundRect(ctx, 64, 590, 150, 44, 22); ctx.fill();
  ctx.fillStyle = "#ecebe6"; ctx.fillRect(96, 608, 86, 8);
  if (specimen) {
    ctx.strokeStyle = "#c9c8c3"; ctx.lineWidth = 2;
    const tiles = [[1110, 120, "a"], [1330, 120, "g"], [1330, 390, "R"]];
    for (const [x, y, g] of tiles) { ctx.strokeRect(x, y, 200, 250); font(ctx, "400 170px Fraunces"); ctx.fillStyle = "#1a1a1a"; ctx.fillText(g, x + 50, y + 185); }
  }
  ctx.restore();
}

// ---------- Machines for small hours. (a dark synth store page) ----------
export function drawMachines(ctx, w, h) {
  const s = w / 1600;
  ctx.save(); ctx.scale(s, s);
  const H = h / s;
  ctx.fillStyle = "#1b1c1e"; ctx.fillRect(0, 0, 1600, H);
  ctx.fillStyle = "#e8e8e6"; ctx.fillRect(40, 30, 26, 26);
  ctx.fillStyle = "#6a6b6e"; for (let i = 0; i < 4; i++) ctx.fillRect(1180 + i * 90, 38, 60, 8);
  font(ctx, "600 88px Geist"); ctx.fillStyle = "#f1f1ef"; ctx.textAlign = "center"; ctx.letterSpacing = "-1.5px";
  ctx.fillText("Machines for small hours.", 800, 190); ctx.letterSpacing = "0px";
  // the keyboard product shot
  ctx.save(); ctx.translate(800, 420);
  const g = ctx.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, "#d9d9d6"); g.addColorStop(1, "#8f908f");
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-470, 70, 940, 40);
  ctx.fillStyle = g; roundRect(ctx, -470, -110, 940, 190, 16); ctx.fill();
  ctx.fillStyle = "#2a2a2c"; ctx.fillRect(-430, -80, 860, 38);
  ctx.fillStyle = "#f6f6f4"; for (let i = 0; i < 36; i++) ctx.fillRect(-430 + i * 23.9, -30, 21.5, 96);
  ctx.fillStyle = "#1b1b1c"; for (let i = 0; i < 35; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) ctx.fillRect(-430 + i * 23.9 + 15, -30, 14, 56);
  ctx.restore();
  ctx.strokeStyle = "#dcdcda"; ctx.lineWidth = 3; roundRect(ctx, 670, 600, 260, 64, 32); ctx.stroke();
  font(ctx, "600 26px Geist"); ctx.fillStyle = "#e8e8e6"; ctx.fillText("See the machines", 800, 641);
  ctx.fillStyle = "#6a6b6e"; ctx.fillRect(740, 700, 120, 7);
  ctx.textAlign = "left";
  ctx.restore();
}

// ---------- ISSUE 14 · THE QUIET ISSUE (a light editorial page) ----------
export function drawIssue(ctx, w, h) {
  const s = w / 1600;
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = "#ebeae4"; ctx.fillRect(0, 0, 1600, h / s);
  ctx.fillStyle = "#151515"; roundRect(ctx, 40, 26, 58, 34, 4); ctx.fill();
  font(ctx, "700 22px Fraunces"); ctx.fillStyle = "#ebeae4"; ctx.fillText("O&I", 46, 51);
  ctx.fillStyle = "#9a9a96"; for (let i = 0; i < 5; i++) ctx.fillRect(120 + i * 100, 42, 64, 8);
  font(ctx, "800 196px Archivo", "ultra-condensed"); ctx.fillStyle = "#161616"; ctx.letterSpacing = "-2px";
  ctx.fillText("ISSUE 14", 60, 300); ctx.fillText("THE QUIET", 60, 480); ctx.fillText("ISSUE", 60, 660); ctx.letterSpacing = "0px";
  const r = rng(14);
  ctx.fillStyle = "#1c1c1c";
  font(ctx, "500 30px Fraunces"); ctx.fillText("Notes from the", 880, 140); ctx.fillText("small hours of", 880, 176);
  ctx.fillStyle = "#8d8c88";
  for (let c = 0; c < 2; c++) for (let i = 0; i < 20; i++) ctx.fillRect(880 + c * 340, 230 + i * 26, 250 + r() * 60, 9);
  ctx.fillStyle = "#161616"; ctx.fillRect(64, 700, 190, 12);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Cached page canvases for screen use.
export function pageCanvas(name, w, h, draw) {
  return cached(`page:${name}:${w}x${h}`, w, h, 1, (g) => draw(g, w, h));
}
