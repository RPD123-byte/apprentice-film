// timing driver (scratch only): P -> frame k = 578 + round(P*30); first build cost, then mean of 4 redraws, printed on the frame
import { shot } from "./src/shots/s05.js";
import { W, H } from "./src/config.js";
const out = document.getElementById("film");
const g2 = out.getContext("2d");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
let first = true;
function renderAt(time) {
  const k = 578 + Math.round(time * 30), t = k / 25;
  const draw = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore(); };
  const t0 = performance.now(); draw(); const t1 = performance.now();
  let s = 0; for (let i = 0; i < 4; i++) { const a = performance.now(); draw(); s += performance.now() - a; }
  g2.drawImage(paint, 0, 0); g2.fillStyle = "#f00"; g2.fillRect(0, 0, 900, 60); g2.fillStyle = "#fff"; g2.font = "40px sans-serif";
  g2.fillText(`k${k} ${first ? "FIRST " : ""}${(t1 - t0).toFixed(0)} ms, then ${(s / 4).toFixed(1)} ms`, 10, 45); first = false;
}
const clock = { _t: 0, get t() { return this._t; }, set t(v) { this._t = v; renderAt(v); } };
export const tl = gsap.timeline({ paused: true });
tl.fromTo(clock, { t: 0 }, { t: 20, duration: 20, ease: "none" }, 0);
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__film = { renderAt, W, H, FPS: 25, DUR: 20 };
await Promise.all(["900 100px Archivo", "600 20px Poppins", "500 20px Poppins", "700 20px Poppins", "400 40px Shrikhand"].map((f) => document.fonts.load(f)));
await document.fonts.ready;
