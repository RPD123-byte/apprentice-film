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
// measured per-frame gain is matched (data/gains.js), and the cut frame's uneven exposure by a measured field.
// Build pass (this run): the page's fan, lower rainbow, right cloud, robot, "Imagination" (Fraunces soft outlines,
// s07/imagGlyphs.js), marquee, nav, smiley, daisy and logo (s08's original mark) re-measured; the screen softened to
// the source's fine-detail level; the glass rim on all four edges; an organic knit on the beanie cuff; legends on the
// key caps. Fix pass 1 (this run): the hinge band, the screen's bottom lip and the deck rim repainted clean
// (s07/deck.js); the hands get continuous outlines carried by the flow, finer skin hatching and the fingers' full
// travel (s07/handswarp.js); the cuff's knit follows the cuff; the owl's head and wing softened; the page's lower
// rainbow airbrushed at its left end, the plume figure and robot details redrawn, the ticket typing keyed to the
// source's keystroke frames; fainter key legends. See fidelity/s07.md (including the method caveat).
import { W, H } from "../config.js";
import { paintTraced, canvas, ctx2d } from "./s07/tracekit.js";
import * as PLATE from "./s07/data/plate.js";
import { GAINS } from "./s07/data/gains.js";
import { screenAt, releaseScreen } from "./s07/screen.js";
import { handsAt, releaseHands } from "./s07/handswarp.js";
import { crispKeys } from "./s07/keys.js";
import { lineFaces, plateBeforeFine, plateKeep } from "./s07/faces.js";
import { deckAt, releaseDeck } from "./s07/deck.js";

// the owl's traced feather contours are re-joined across gaps < 6 px (they were broken and doubled), fix pass 3
const PLATE_BRIDGE = { gap: 6, vmax: 0.5, cos: 0.8, region: (x, y) => x > 1420 && x < 1800 && y > 180 && y < 700 };
let plate = null, comp = null, comp0 = null;
function staticPlate() {
  if (!plate) plate = lineFaces(crispKeys(paintTraced(PLATE, W, H, { beforeFine: plateBeforeFine, fineKeep: plateKeep, bridge: PLATE_BRIDGE }), PLATE.SHAPES));
  return plate;
}
// The cut frame (29.04, f 0) is exposed unevenly in the source: against the shot's median its left and top read up to
// ~10 % darker and the middle ~5 % brighter than its mean gain (measured source-to-source: blurred ratio of frame 726
// to the median of 727-763, 45 px, hands excluded, sampled on a 12 x 6 grid; build pass, this run). Applied as a
// smooth gain field on top of that frame's uniform gain.
const FIELD0 = [[0.896, 0.91, 0.923, 0.952, 1.004, 0.977, 1.011, 1.014, 0.955, 0.962, 0.972, 1.014], [0.938, 0.947, 0.937, 0.964, 1.007, 1.023, 1.046, 0.993, 0.988, 0.938, 0.956, 1.014], [0.955, 0.933, 0.946, 1.003, 1.046, 1.061, 1.06, 1.01, 1.014, 1.027, 0.953, 0.938], [0.957, 0.931, 0.999, 1.023, 1.014, 1.014, 1.038, 1.002, 1.014, 1.008, 0.961, 0.919], [0.983, 1.027, 1.031, 1.014, 1.014, 1.014, 1.028, 1.017, 1.035, 1.038, 0.988, 0.939], [1.019, 1.012, 1.011, 1.006, 1.0, 1.007, 1.003, 1.002, 0.985, 0.985, 1.008, 0.938]];
let field0 = null;
function applyField0(g) {
  if (!field0) {
    const c = canvas(12, 6), cg = c.getContext("2d"), im = cg.createImageData(12, 6);
    for (let j = 0; j < 6; j++) for (let i = 0; i < 12; i++) { const k = 4 * (j * 12 + i), v = 1 + (FIELD0[j][i] - 1) / 1.15; im.data[k] = Math.round((v / 1.2) * 255); im.data[k + 3] = 255; }
    cg.putImageData(im, 0, 0);
    field0 = canvas(W, H); const fg = ctx2d(field0);
    fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = "high"; fg.filter = "blur(60px)"; fg.drawImage(c, -W / 24, -H / 12, W + W / 12, H + H / 6); fg.filter = "none";
    field0 = fg.getImageData(0, 0, W, H).data;
  }
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let q = 0; q < d.length; q += 4) { const k = (field0[q] / 255) * 1.2; d[q] = d[q] * k; d[q + 1] = d[q + 1] * k; d[q + 2] = d[q + 2] * k; }
  g.putImageData(im, 0, 0);
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
    // (the cut frame is composed on its own CPU canvas: it is read back for its exposure field, and a GPU canvas
    // reads back differently between browser sessions)
    let g;
    if (f === 0) { if (!comp0) comp0 = canvas(W, H); g = ctx2d(comp0); }
    else { if (!comp) comp = canvas(W, H); g = comp.getContext("2d"); }
    g.drawImage(staticPlate(), 0, 0);
    const sc = screenAt(t);
    g.drawImage(sc.canvas, sc.x, sc.y);
    const hd = handsAt(f, staticPlate());
    g.drawImage(hd.canvas, hd.x, hd.y);
    const dk = deckAt();   // the hinge band, the screen's bottom lip and the deck's rim, repainted clean (s07/deck.js)
    g.drawImage(dk.canvas, dk.x, dk.y);
    if (f === 0) applyField0(g);
    ctx.save();
    ctx.filter = `brightness(${exposure(f, t).toFixed(4)})`;
    ctx.drawImage(f === 0 ? comp0 : comp, 0, 0);
    ctx.restore();
  },
  release() { plate = null; comp = null; comp0 = null; field0 = null; releaseScreen(); releaseHands(); releaseDeck(); },
};
