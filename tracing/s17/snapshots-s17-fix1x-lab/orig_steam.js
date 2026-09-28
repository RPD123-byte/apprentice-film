// s17 coffee steam: two thin strands curl and drift up over the mug, redrawn with every drawing of the
// illustration (on twos to 52.44 with the source's holds, on ones after). Each drawing is the source's own strand
// centre lines, traced by trace/steam_trace.py (x, y, width, pre-grade value per point) — see steam_data.js.
// Drawn in page coordinates under the shot's camera; the page under the steam is black (s17/page.js).
import { STEAM } from "./steam_data.js";
import { blurCanvas } from "../../lib/sokoIll.js";

const KEYS = Object.keys(STEAM).map(Number).sort((a, b) => a - b);
function strandsAt(tick) {
  let k = KEYS[0];
  for (const x of KEYS) if (x <= tick + 1e-6) k = x;
  return STEAM[k.toFixed(2)] || [];
}
const grey = (v) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };

// tick: the drawing time (s17/owl.js drawTick). The strands are drawn crisp into a small scratch canvas at the
// context's device scale, softened there once (exact gaussian, 0.45 page px) and composited (a canvas filter per
// stroke costs a full-canvas layer each, ~1 s per frame on the 2x pull-back composite).
const BOX = [795, 325, 905, 470];
let SCR = null;
export function drawSteam(ctx, tick) {
  const S = strandsAt(tick);
  const m = ctx.getTransform(), k = Math.hypot(m.a, m.b);
  const pad = 3, [bx0, by0, bx1, by1] = BOX;
  const dx = Math.floor(m.a * (bx0 - pad) + m.e), dy = Math.floor(m.d * (by0 - pad) + m.f);
  const w = Math.ceil((bx1 - bx0 + 2 * pad) * k) + 2, h = Math.ceil((by1 - by0 + 2 * pad) * k) + 2;
  if (!SCR) SCR = document.createElement("canvas");
  if (SCR.width !== w || SCR.height !== h) { SCR.width = w; SCR.height = h; }
  const g = SCR.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
  g.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
  g.lineCap = "round"; g.lineJoin = "round";
  for (const st of S) {
    const n = st.length / 4;
    for (let i = 0; i + 1 < n; i++) {
      const a = i * 4, b = a + 4;
      const lw = 0.5 * (st[a + 2] + st[b + 2]), v = 0.5 * (st[a + 3] + st[b + 3]);
      if (v < 0.04) continue;
      g.strokeStyle = grey(v); g.lineWidth = Math.max(0.6, lw * 0.85);
      g.beginPath(); g.moveTo(st[a], st[a + 1]); g.lineTo(st[b], st[b + 1]); g.stroke();
    }
  }
  blurCanvas(SCR, 0.45 * k);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(SCR, dx, dy);
  ctx.restore();
}
