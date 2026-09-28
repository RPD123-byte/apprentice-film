// shot-only scratch driver for s05: scratch time P -> source frame k = 578 + round(P*30) (graded) for P < 10,
// k = 578 + round((P-10)*30) ungraded for P >= 10. Film time t = k/25.
import { createPost } from "./src/lib/post.js";
import { shot } from "./src/shots/s05.js";
import { W, H } from "./src/config.js";
const out = document.getElementById("film");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
const oc = out.getContext ? null : null;
function renderAt(time) {
  const P = time;
  const k = 578 + Math.round(P * 30), t = k / 25;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.save(); shot.draw(ctx, t - 23.12, t); ctx.restore();
  grade(paint, t, { fade: 1, ...(shot.grade ? shot.grade(t - 23.12, t) : {}) });
}
const clock = { _t: 0, get t() { return this._t; }, set t(v) { this._t = v; renderAt(v); } };
export const tl = gsap.timeline({ paused: true });
tl.fromTo(clock, { t: 0 }, { t: 20, duration: 20, ease: "none" }, 0);
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__film = { renderAt, W, H, FPS: 25, DUR: 20 };
await Promise.all(["900 100px Archivo", "400 20px Geist", "600 20px Geist", "500 20px 'Geist Mono'", "400 20px Fraunces", "700 20px Fraunces", "900 100px 'Fraunces Soft'", "800 40px Satoshi", "400 40px Shrikhand", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
await document.fonts.ready;
renderAt(0);
