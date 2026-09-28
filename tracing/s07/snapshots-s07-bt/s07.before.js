// s07 (29.04–30.56): over the shoulder again. The laptop shows the Pure Imagination page with the selection and
// the note card; text is typed into the ticket button while his hands type; the owl sits on his right shoulder
// wearing the headphones, seen from behind. The camera is locked off (camtrack 29.04–30.52: s = 1.0000, 0.0 px) and
// nothing but the fingers and the ticket text moves.
//
// Layers: the static plate (room, desk, laptop, the designer, the owl) redrawn from measured value zones and ink
// strokes (s07/tracekit.js + s07/data/plate.js), with the key caps redrawn crisp (s07/keys.js) and the slab-like
// surfaces re-rendered as line and grain (s07/faces.js, s07/hatch.js); the colour screen - s07's re-measured copy of
// the Pure Imagination page (s07/page.js) - warped onto the measured screen quad with the glass rim (s07/screen.js);
// then the hands: a traced frame, its skin hatched and the plate's keys showing between the fingers, warped per source
// frame by the measured flow (s07/handswarp.js). The source's own exposure breathes by ±3 % over the shot; the
// measured per-frame gain is matched (data/gains.js). See fidelity/s07.md (including the open rule question).
import { W, H } from "../config.js";
import { paintTraced, canvas } from "./s07/tracekit.js";
import * as PLATE from "./s07/data/plate.js";
import { GAINS } from "./s07/data/gains.js";
import { screenAt, releaseScreen } from "./s07/screen.js";
import { handsAt, releaseHands } from "./s07/handswarp.js";
import { crispKeys } from "./s07/keys.js";
import { lineFaces, plateBeforeFine, plateKeep } from "./s07/faces.js";

// the owl's traced feather contours are re-joined across gaps < 6 px (they were broken and doubled), fix pass 3
const PLATE_BRIDGE = { gap: 6, vmax: 0.5, cos: 0.8, region: (x, y) => x > 1420 && x < 1800 && y > 180 && y < 700 };
let plate = null, comp = null;
function staticPlate() {
  if (!plate) plate = lineFaces(crispKeys(paintTraced(PLATE, W, H, { beforeFine: plateBeforeFine, fineKeep: plateKeep, bridge: PLATE_BRIDGE }), PLATE.SHAPES));
  return plate;
}
// the grade's own flicker (src/lib/post.js), divided out so the frame lands on the source's measured exposure
const flick = (t) => 1 + 0.018 * Math.sin(t * 2 * Math.PI * 0.9) + 0.012 * Math.sin(t * 2 * Math.PI * 2.3 + 1);
function exposure(f, t) {
  const k = (GAINS[Math.max(0, Math.min(GAINS.length - 1, f))] * flick(29.6)) / flick(t);
  return 1 + (k - 1) / 1.15;   // pre-grade scale: the grade's S-curve steepens small changes by ~1.15 in the mid-tones
}

export const shot = {
  draw(ctx, local, t) {
    const f = Math.floor(local * 25 + 1e-6);
    if (!comp) comp = canvas(W, H);
    const g = comp.getContext("2d");
    g.drawImage(staticPlate(), 0, 0);
    const sc = screenAt(t);
    g.drawImage(sc.canvas, sc.x, sc.y);
    const hd = handsAt(f, staticPlate());
    g.drawImage(hd.canvas, hd.x, hd.y);
    ctx.save();
    ctx.filter = `brightness(${exposure(f, t).toFixed(4)})`;
    ctx.drawImage(comp, 0, 0);
    ctx.restore();
  },
  release() { plate = null; comp = null; releaseScreen(); releaseHands(); },
};
