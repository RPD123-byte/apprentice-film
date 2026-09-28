<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=2206, height=946"><title>s02 fix lab</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>* { margin: 0; padding: 0; } html, body { width: 2206px; height: 946px; overflow: hidden; background: #000; } canvas { position: absolute; inset: 0; }</style></head>
<body><div data-hf-id="hf-fxlab" id="root" data-composition-id="main" data-start="0" data-duration="156" data-fps="25" data-width="2206" data-height="946"><canvas data-hf-id="hf-fxfilm" id="film" width="2206" height="946"></canvas></div>
<script type="module">
import { createPost } from "./src/lib/post.js";
import { SHOTS } from "./src/shots/index.js";
const F = [__FRAMES__];
const out = document.getElementById("film"), paint = document.createElement("canvas"); paint.width = 2206; paint.height = 946;
const ctx = paint.getContext("2d"), grade = createPost(out);
const layer = document.createElement("canvas"); layer.width = 2206; layer.height = 946; const lctx = layer.getContext("2d");
function shotAt(t) { for (const s of SHOTS) if (t >= s.start && t < s.end) return s; return SHOTS[SHOTS.length - 1]; }
function paintShot(g, s, t) { g.save(); g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation="source-over"; g.fillStyle="#000"; g.fillRect(0,0,2206,946);
  try { s.draw(g, t - s.start, t, s); } catch (err) { console.error(err); g.setTransform(1,0,0,1,0,0); g.fillStyle="#f00"; g.fillRect(0,0,2206,90); } g.restore(); }
let last = -1;
function render(v) { const k = Math.max(0, Math.min(F.length - 1, Math.floor(v))); if (k === last) return; last = k; const t = F[k] / 25;
  const s = shotAt(t), i = SHOTS.indexOf(s), local = t - s.start;
  if (s.xfade && local < s.xfade && i > 0) { paintShot(ctx, SHOTS[i-1], t); paintShot(lctx, s, t); const u = local / s.xfade; ctx.globalAlpha = u*u*(3-2*u); ctx.drawImage(layer,0,0); ctx.globalAlpha=1; }
  else paintShot(ctx, s, t);
  grade(paint, t, { fade: 1, ...(s.grade ? s.grade(local, t) : {}) }); }
const clock = { _t: 0, get t() { return this._t; }, set t(v) { this._t = v; render(v); } };
const tl = gsap.timeline({ paused: true }); tl.fromTo(clock, { t: 0 }, { t: 156, duration: 156, ease: "none" }, 0);
window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl;
window.addEventListener("hf-seek", (e) => render(e.detail.time));
</script></body></html>