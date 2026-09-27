// s18 (53.24–57.32) — close on the synth. Two locked-off camera set-ups, cut at 55.28 (source frame 1382):
//   A 53.24–55.24  (frames 1331–1381) the synth corner of the illustration: the owl flies in over the speaker, lands
//                  on the keys and scurries left and back, wings beating on a 4-frame cycle (level, up, level, down)
//   B 55.28–57.28  (frames 1382–1432) extreme close-up of the keys: the owl's belly and talons stepping along the
//                  keys, keys going down under its feet, the near wing sweeping down on some frames; at 56.72 it
//                  springs up past the camera and the whole synth tips away (measured rotation, up to -36°) while
//                  the slatted panel behind stays put; a wing flaps at the left edge until 57.20.
// The source animates on its own 24-fps drawings (one repeated frame every 25), so everything here is looked up by
// source frame number. Plates and owls are outline traces of the source (vector shapes + measured greys, redrawn with
// Canvas2D; see s18/trace/README.md); the hand-built fix-pass-1 version is kept, unused, in s18/handbuilt/.
import { roomACanvas, releaseRoomA } from "./roomA.js";
import { keysBLayers, releaseKeysB } from "./keysB.js";
import { drawOwlBT, releaseOwlBT } from "./owlBT.js";
import { drawOwlAT, releaseOwlAT } from "./owlAT.js";

const CUT_B = 1382;   // first frame of the close-up

// Synth tipping away: plate -> frame affine per source frame [frame, a, b, c, d, e, f] (canvas setTransform order).
// Fitted by ECC of the traced keyboard plate against every source frame (owl masked), started from the earlier
// frame-to-frame ORB chain; 1432 keeps the ORB value (the refit measured worse there). Identity up to 1417. The
// source frames are sharp (no rotational blur).
const TIP = [
  [1418, 1.00071, -0.00518, 0.00335, 1.00092, -5.4, 10.5],
  [1419, 0.99930, -0.03374, 0.03348, 1.00222, -30.6, 64.3],
  [1420, 0.99300, -0.10380, 0.10069, 1.00538, -78.2, 188.7],
  [1421, 0.98333, -0.18421, 0.17839, 0.99500, -134.5, 348.1],
  [1422, 0.97014, -0.24795, 0.23905, 0.98771, -175.3, 482.4],
  [1423, 0.96141, -0.30091, 0.29193, 0.97217, -216.0, 608.5],
  [1424, 0.94779, -0.34926, 0.33579, 0.96504, -241.6, 708.5],
  [1425, 0.93840, -0.37413, 0.36123, 0.95829, -257.7, 760.5],
  [1426, 0.93835, -0.37412, 0.36120, 0.95825, -257.6, 760.5],
  [1427, 0.93362, -0.38641, 0.37317, 0.95308, -268.9, 789.7],
  [1428, 0.92772, -0.40537, 0.39161, 0.94400, -286.0, 846.9],
  [1429, 0.91266, -0.44801, 0.43164, 0.93181, -310.1, 961.5],
  [1430, 0.88795, -0.50050, 0.48626, 0.90568, -338.0, 1112.5],
  [1431, 0.86042, -0.55878, 0.54459, 0.87701, -378.7, 1303.4],
  [1432, 0.82146, -0.59924, 0.59924, 0.82146, -405.8, 1520.0],
];
const tipAt = (f) => (f < TIP[0][0] ? null : TIP[Math.min(TIP.length - 1, f - TIP[0][0])]);

function drawA(ctx, f) {
  ctx.drawImage(roomACanvas(), 0, 0);
  drawOwlAT(ctx, f);
}

function drawB(ctx, f) {
  const K = keysBLayers();
  ctx.drawImage(K.bg, 0, 0);
  // the synth (knobs, keys, front panel, cheek) under the tipping transform
  const tp = tipAt(f);
  ctx.save();
  if (tp) ctx.transform(tp[1], tp[2], tp[3], tp[4], tp[5], tp[6]);
  ctx.drawImage(K.kb, -K.M, 0);
  ctx.restore();
  // the owl (and, through the per-frame traces, the keys it presses down)
  drawOwlBT(ctx, f);
}

export const shot = {
  draw(ctx, local, t) {
    const f = Math.floor(t * 25 + 1e-4);   // source frame shown at time t (frame n covers [n/25, (n+1)/25))
    if (f < CUT_B) drawA(ctx, f);
    else drawB(ctx, f);
  },
  release() { releaseOwlAT(); releaseRoomA(); releaseKeysB(); releaseOwlBT(); },
};
