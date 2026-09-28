// s23 (84.04–97.08): the page framed on the lit screen. The owl carries the old B&W header strip off the top right
// (84.04–86.0); the header slot stays empty (86.0–86.5); it carries the colour banner in from the top right, walking
// left along the lip of the hole with the banner on its head and raised wings (86.5–88.3), slaps it into the slot
// (88.36) and presses it flat (88.4–89.6), hops off (89.6–90.3) onto the speaker left of the desk, wipes its brow
// (90.4–91.8), crouches (91.9–92.6), powers up in a white flame aura with shockwave rings and flying paper (92.64–95.56,
// two camera shakes), the scissors fly back to it (93.84–94.84), a flare (94.88–95.12), then it zips round the page
// with the scissors, leaving shard cut lines (95.96–97.08).
//
// What is drawn how:
//  - the page (F1 sokoPageCanvas, hole or banner), the carried strip (F1's header, ORB-tracked similarity per source
//    frame) and the carried banner (F2's hippieBannerCanvas, ORB-tracked) are drawn by code from the foundations;
//  - everything else — the owl, the flame aura and flare, rings, paper scraps, flying scissors, impact ticks, motion
//    streaks, confetti — is one traced "cel" per source frame (s23/cels.js, drawn by s23/celdraw.js): the source frame's
//    foreground (what differs from the clean page with the tracked strip/banner) measured as nested level outlines with
//    flat colours, on the camera-unshaken frame;
//    the shard cut lines at the end are in the cels too, as stroked centre lines (white top-hat, skeleton, widths).
// Positions and camera are measured on the source; see fidelity/s23.md.
import { drawFramedPage, addScreenGlow, sokoPageCanvas, sokoHeaderCanvas, headerTornPath, HEADER, HEADER_FRAMED, FRAMED, SOKO_BG, releaseSoko, PAGE_W, PAGE_H } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { STRIP_TRK, STRIP_DISS, BAN_TRK, SHAKE } from "./s23/data.js";
import { drawCel, releaseCels } from "./s23/celdraw.js";

// ---------------------------------------------------------------- time helpers
const FR = 25;
const fidx = (t) => Math.floor(t * FR + 1e-3);   // the source frame on screen (drawings are held per source frame)
// sample-and-hold on a table [[t, ...v], ...] sampled at source frames
function hold(tab, k) {
  let best = tab[0];
  for (const r of tab) { if (Math.round(r[0] * FR) <= k) best = r; else break; }
  return best.slice(1);
}
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
}
const simT = ([s, rd, tx, ty]) => { const r = (rd * Math.PI) / 180; return [s * Math.cos(r), s * Math.sin(r), -s * Math.sin(r), s * Math.cos(r), tx, ty]; };

// ---------------------------------------------------------------- pages
let bannerPage = null;
function holePage() { return sokoPageCanvas({ header: false, gaze: "down" }); }
function bannerEdge(g) { g.strokeStyle = "rgba(236,234,228,0.95)"; g.lineWidth = 3.4; g.strokeRect(HEADER.x - 0.5, HEADER.y - 0.5, HEADER.w + 1, HEADER.h + 1); }
// the page once the colour banner is in: the hole covered by the banner at HEADER (its pale edge is drawn per frame:
// it fades out over 91.56–91.76, source frames 2289–2294, measured on the edge band)
function withBanner() {
  if (bannerPage) return bannerPage;
  const c = document.createElement("canvas"); c.width = PAGE_W; c.height = PAGE_H;
  const g = c.getContext("2d");
  g.drawImage(holePage(), 0, 0);
  // once the banner is in, the hole's torn white rim is gone from round it (source, 91.8–97 s): paint it out
  g.beginPath(); headerTornPath(g, { seed: 7 });
  g.fillStyle = SOKO_BG; g.fill(); g.strokeStyle = SOKO_BG; g.lineWidth = 9; g.lineJoin = "round"; g.stroke();
  g.imageSmoothingQuality = "high";
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  bannerPage = c;
  return c;
}
const edgeAlpha = (k) => (k <= 2288 ? 1 : k >= 2294 ? 0 : (2294 - k) / 6);
function drawBannerEdge(g, a) {
  g.save(); g.globalAlpha *= a;
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  bannerEdge(g);
  g.restore();
}

// ---------------------------------------------------------------- the old strip (frame px at 77.6 s = HEADER_FRAMED)
// The strip the owl carries is the left part of the header: frame x 193.8 … 1227.7 at 77.6 s, full height, with a
// ~5 px pale paper band outside it (profiles measured across all four edges at 84.24–85.44).
const SX0 = 193.8, SX1 = 1227.7, BAND = 5, PAD = 7;
let stripC = null;
function stripCanvas() {
  if (stripC) return stripC;
  const H0 = HEADER_FRAMED, x0 = SX0, y0 = H0.y, w = SX1 - SX0, h = H0.h;
  const cw = w + PAD * 2, ch = h + PAD * 2, S = 1.5;
  const c = document.createElement("canvas"); c.width = Math.round(cw * S); c.height = Math.round(ch * S);
  const g = c.getContext("2d");
  g.scale(S, S);
  g.translate(PAD - x0, PAD - y0);
  g.fillStyle = "rgb(236,236,232)";
  g.fillRect(x0 - BAND, y0 - BAND, w + BAND * 2, h + BAND * 2);
  g.save();
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.fillStyle = "#050505"; g.fillRect(x0, y0, w, h);
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high";
  g.drawImage(sokoHeaderCanvas({ gaze: "down" }), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  g.restore();
  stripC = { c, x: x0 - PAD, y: y0 - PAD, w: cw, h: ch };
  return stripC;
}
function drawStrip(g, m, alpha = 1) {
  const S = stripCanvas();
  g.save(); g.globalAlpha *= alpha; g.filter = "blur(1px)";
  g.transform(...m);
  g.imageSmoothingQuality = "high";
  g.drawImage(S.c, S.x, S.y, S.w, S.h);
  g.restore();
}

// ---------------------------------------------------------------- the colour banner (frame px at 90.0 s = HEADER_FRAMED)
// While they are carried the source's strip and banner are a touch softer than when they sit in the page (a 1 px
// gaussian brings the settled banner closest to the carried one: 87.04–88.12)
function drawBannerAt(g, m, soft = false) {
  g.save();
  if (soft) g.filter = "blur(1px)";
  g.transform(...m);
  g.transform(FRAMED.sx, 0, 0, FRAMED.sy, FRAMED.x, FRAMED.y);
  g.imageSmoothingQuality = "high";
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  bannerEdge(g);
  g.restore();
}

// ---------------------------------------------------------------- what is on the page in source frame k
// returns a painter (frame coords, unshaken) for everything over the page
function scene(k) {
  const t = k / FR;
  const layers = [];
  if (k >= 2218 && edgeAlpha(k) > 0) layers.push((g) => drawBannerEdge(g, edgeAlpha(k)));
  // the old strip, carried off (84.12–85.88); 85.60–85.76 dissolves between two copies of it
  if (k >= 2103 && k <= 2147) {
    if (STRIP_DISS[k]) {
      const cp = STRIP_DISS[k].map(([p, w]) => [simT(p), w]);
      layers.push((g) => { for (const [m, w] of cp) drawStrip(g, m, w); });
    } else {
      const m = simT(hold(STRIP_TRK, k));
      layers.push((g) => drawStrip(g, m));
    }
  }
  // the colour banner, carried in and slapped down (86.56–88.68, trembling after the slap)
  if (k >= 2164 && k <= 2217) {
    const m = simT(hold(BAN_TRK, k));
    layers.push((g) => drawBannerAt(g, m, k <= 2208));
  }
  layers.push((g) => drawCel(g, k));
  return (g) => { for (const L of layers) L(g); };
}

// ---------------------------------------------------------------- frame
let buf = null;
function glowGain(k) {
  if (k < 2164) return 1;
  if (k < 2210) return 1.1 + 0.2 * Math.min(1, Math.max(0, (k - 2186) / 10));
  return k < 2316 ? 1.22 : k < 2399 ? 1.15 : 1.1;
}
function shakeAt(k) { for (const [t0, dx, dy] of SHAKE) if (Math.round(t0 * FR) === k) return [dx, dy]; return [0, 0]; }
function render(g, k) {
  const page = k <= 2217 ? holePage() : withBanner();
  const paint = scene(k);
  drawFramedPage(g, page, { glow: 0, over: paint });
  // the parts outside the screen (strip, banner, owl, flames, papers) — drawn before the room light is added
  const S = FRAMED.screen;
  g.save();
  g.beginPath(); g.rect(0, 0, g.canvas.width, g.canvas.height); g.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); g.clip("evenodd");
  paint(g);
  g.restore();
  // with the colour banner in, the source's margin glow runs above F1's model (pre-grade room above and beside the
  // screen, source / ours): 1.1 rising to 1.3 as it is carried onto the screen, ~1.25 while it sits alone, ~1.15 in the
  // power-up, ~1.1 at the end
  addScreenGlow(g, glowGain(k));
}
export const shot = {
  draw(ctx, local, t) {
    const k = fidx(t);
    const [dx, dy] = shakeAt(k);
    if (!dx && !dy) return render(ctx, k);
    if (!buf) { buf = document.createElement("canvas"); buf.width = ctx.canvas.width; buf.height = ctx.canvas.height; }
    const b = buf.getContext("2d");
    b.setTransform(1, 0, 0, 1, 0, 0);
    render(b, k);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(buf, dx, dy);
    ctx.restore();
  },
  release() { stripC = null; bannerPage = null; buf = null; releaseCels(); releaseSoko(); releaseHippie(); },
};
