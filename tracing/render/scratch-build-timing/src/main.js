// The Apprentice, drawn in code. One pure function of time paints each frame onto a 2D canvas;
// the WebGL grade finishes it. The GSAP timeline only drives a clock so HyperFrames can seek.
import { createPost } from "./lib/post.js";
import { SHOTS } from "./shots/index.js";

import { W, H, FPS, DUR } from "./config.js";
export { W, H, FPS, DUR };

const out = document.getElementById("film");
const paint = document.createElement("canvas");
paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);

function shotAt(t) {
  for (const s of SHOTS) if (t >= s.start && t < s.end) return s;
  return SHOTS[SHOTS.length - 1];
}
const layer = document.createElement("canvas");
layer.width = W; layer.height = H;
const lctx = layer.getContext("2d");

// Paint one shot at time t into a context (black first).
function paintShot(g, s, t) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  try {
    s.draw(g, t - s.start, t, s);
  } catch (err) {
    // a broken shot shows itself instead of taking the whole film down
    console.error(`[${s.id}] draw failed at t=${t.toFixed(2)}:`, err);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#300"; g.fillRect(0, 0, W, 90);
    g.fillStyle = "#f66"; g.font = "400 22px 'Geist Mono'";
    g.fillText(`[${s.id}] ${String(err && err.message || err).slice(0, 140)}`, 30, 56);
  }
  g.restore();
}
let lastShot = null;

// The source opens at full exposure and fades linearly to black over its last 0.57 s (measured).
function fadeAt(t) {
  return Math.min(1, Math.max(0, (140.77 - t) / 0.57));
}

export function renderAt(time) {
  time = Math.round(time * 25 + 0.2) / 25;  // SCRATCH: snap to the 25 fps grid (nearest frame at or after)
  const t = Math.min(Math.max(time, 0), DUR - 1e-4);
  const s = shotAt(t);
  const i = SHOTS.indexOf(s);
  // free caches of shots the timeline has left (renders walk forward; keep the previous one for dissolves)
  if (lastShot && lastShot !== s && lastShot !== SHOTS[i - 1] && lastShot.release) { try { lastShot.release(); } catch (e) {} }
  lastShot = s;
  const local = t - s.start;
  if (s.xfade && local < s.xfade && i > 0) {
    // dissolve: the previous shot keeps running underneath while this one fades up
    const prev = SHOTS[i - 1];
    paintShot(ctx, prev, t);
    paintShot(lctx, s, t);
    const u = local / s.xfade;
    ctx.globalAlpha = u * u * (3 - 2 * u);
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
  } else {
    paintShot(ctx, s, t);
    const REP = 0;
    for (let k = 0; k < REP; k++) { const tt = s.start + ((k * 0.04 + 0.001) % (s.end - s.start)); s.draw(ctx, tt - s.start, tt, s); }
    paintShot(ctx, s, t);
    const q = 0;
  }
  grade(paint, t, { fade: fadeAt(t), ...(s.grade ? s.grade(t - s.start, t) : {}) });
}

const clock = {
  _t: 0,
  get t() { return this._t; },
  set t(v) { this._t = v; renderAt(v); },
};

export const tl = gsap.timeline({ paused: true });
tl.fromTo(clock, { t: 0 }, { t: DUR, duration: DUR, ease: "none" }, 0);

window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
// Dev hook for the compare tool: window.__film.renderAt(t) paints a frame on demand.
window.__film = { renderAt, W, H, FPS, DUR };

// Canvas text never triggers @font-face loading, so every face is loaded explicitly before the first frame.
await Promise.all([
  "900 100px Archivo", "400 20px Geist", "600 20px Geist", "500 20px 'Geist Mono'", "400 20px Fraunces", "700 20px Fraunces",
  "900 100px 'Fraunces Soft'", "800 40px Satoshi", "400 40px Shrikhand", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins",
].map((f) => document.fonts.load(f)));
await document.fonts.ready;
renderAt(0);
