// shot-only scratch driver for s05 (fix1d): scratch time P -> source frame k = 578 + round(P*30), graded, for P < 10;
// P >= 10: the same frame (P-10) drawn UNGRADED (the shot's pre-grade canvas shown on a 2D overlay canvas).
import { createPost } from "./src/lib/post.js";
import { shot } from "./sel.js";
import { W, H } from "./src/config.js";
const out = document.getElementById("film");
const raw = document.createElement("canvas"); raw.width = W; raw.height = H;
raw.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:none"; document.getElementById("root").appendChild(raw);
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
const VARS = [{}, { nosokofx: true }, {}, { nosokofx: true }];
function renderAt(time) {
  if (time >= 5 && time < 9) { const v = Math.floor((time - 5) * 2 + 1e-6); globalThis.__S05X = VARS[v]; if (shot.release) shot.release(); const t = (v < 2 ? 590 : 584) / 25; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore(); raw.style.display = "none"; grade(paint, t, { fade: 1 }); globalThis.__S05X = {}; return; }
  if (time >= 20) return timing(time - 20);
  const ungraded = time >= 10;
  const P = ungraded ? time - 10 : time;
  const k = 578 + Math.round(P * 30), t = k / 25;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const t0 = performance.now();
  ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore();
  window.__drawMs = performance.now() - t0;
  if (ungraded) { raw.style.display = "block"; const r = raw.getContext("2d"); r.clearRect(0, 0, W, H); r.drawImage(paint, 0, 0); }
  else { raw.style.display = "none"; grade(paint, t, { fade: 1, ...(shot.grade ? shot.grade(t - 23.12, t) : {}) }); }
  console.log(`[s05draw] k${k} ${window.__drawMs.toFixed(1)}ms`);
}
// P >= 20: time a run of frames (k0 = 578 + round((P-20)*30), then every frame to 667, each drawn once in order, like a
// render worker walking forward), write the per-frame draw times onto the raw canvas as text
function timing(P) {
  const k0 = 578 + Math.round(P * 30), res = [];
  if (shot.release) shot.release();
  { const t = 625 / 25, t0 = performance.now(); ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore(); res.push([-1, performance.now() - t0]); }
  for (let k = k0; k <= 667; k += 3) {
    const t = k / 25;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const t0 = performance.now(); ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore(); res.push([k, performance.now() - t0]);
  }
  raw.style.display = "block"; const r = raw.getContext("2d"); r.fillStyle = "#000"; r.fillRect(0, 0, W, H);
  r.fillStyle = "#fff"; r.font = "20px monospace";
  res.forEach(([k, ms], i) => r.fillText(`k${k} ${ms.toFixed(0)}ms`, 20 + Math.floor(i / 40) * 300, 30 + (i % 40) * 22));
}
const clock = { _t: 0, get t() { return this._t; }, set t(v) { this._t = v; renderAt(v); } };
export const tl = gsap.timeline({ paused: true });
tl.fromTo(clock, { t: 0 }, { t: 20, duration: 20, ease: "none" }, 0);
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__film = { renderAt, W, H, FPS: 25, DUR: 20 };
await Promise.all(["900 100px Archivo", "400 20px Geist", "600 20px Geist", "500 20px 'Geist Mono'", "400 20px Fraunces", "700 20px Fraunces", "900 100px 'Fraunces Soft'", "800 40px Satoshi", "400 40px Shrikhand", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
await document.fonts.ready;
renderAt(0);
