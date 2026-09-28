// s18 (53.24–57.32) — close on the synth. Two locked-off camera set-ups, cut at 55.28 (source frame 1382):
//   A 53.24–55.24  (frames 1331–1381) the synth corner of the illustration: the owl flies in over the speaker, lands
//                  on the keys and scurries left and back, wings beating on a 4-frame cycle (level, up, level, down)
//   B 55.28–57.28  (frames 1382–1432) extreme close-up of the keys: the owl's belly and talons stepping along the
//                  keys, keys going down under its feet, the near wing sweeping down on some frames; at 56.72 it
//                  springs up past the camera and the whole synth tips away (measured rotation, up to -36°) while
//                  the slatted panel behind stays put; a wing flaps at the left edge until 57.20.
// The source animates on its own 24-fps drawings (one repeated frame every 25), so everything is looked up by source
// frame number. Every plate and every owl drawing is an INK DRAWING redrawn with Canvas2D (s18/inkdraw.js): lit faces
// (one threshold, outline + holes, smooth measured value fields), dark and bright stroke centre-lines with widths,
// and a few specks — the s12 method, measured by s18/trace2/*.py. No per-frame whole-frame traces, no stacked
// level sets, no pixels. (The level-set traced version of fix pass 2 is kept, unused, in s18/traced_v2/.)
import { drawA, releaseA } from "./s18/shotA.js";
import { drawB, releaseB } from "./s18/shotB.js";

const CUT_B = 1382;   // first frame of the close-up

export const shot = {
  draw(ctx, local, t) {
    const f = Math.floor(t * 25 + 1e-4);   // source frame shown at time t (frame n covers [n/25, (n+1)/25))
    if (f < CUT_B) drawA(ctx, f);
    else drawB(ctx, f);
  },
  release() { releaseA(); releaseB(); },
};
