// s18 (53.24–57.32) — close on the synth. Two locked-off camera set-ups, cut at 55.28 (source frame 1382):
//   A 53.24–55.24  (frames 1331–1381) the synth corner of the illustration: the owl flies in over the speaker, lands
//                  on the keys and scurries left and back, wings beating on a 4-frame cycle (level, up, level, down)
//   B 55.28–57.28  (frames 1382–1432) extreme close-up of the keys: the owl's belly and talons stepping along the
//                  keys, keys going down under its feet, the near wing sweeping down on some frames; at 56.72 it
//                  springs up past the camera and the whole synth tips away (measured rotation, up to -36°) while
//                  the slatted panel behind stays put; a wing flaps at the left edge until 57.20.
// The source animates on its own 24-fps drawings (one repeated frame every 25), so everything here is looked up by
// source frame number.
import { roomACanvas, releaseRoomA } from "./s18/roomA.js";
import { owlAState, owlALayer, owlAOffset, releaseOwlA } from "./s18/owlA.js";
import { keysBLayers, releaseKeysB, drawPressed } from "./s18/keysB.js";
import { drawOwlB, releaseOwlB, PRESSED_B } from "./s18/owlB.js";
import { drawTakeoff, releaseTakeoff } from "./s18/takeoff.js";

const CUT_B = 1382;   // first frame of the close-up

// Synth tipping away (ORB, chained frame to frame on the keyboard with the panel masked): [frame, s, rot°, tx, ty];
// frame = s·R(rot)·plate + t. Identity up to 1417.
const TIP = [
  [1417, 1, 0, 0, 0], [1418, 1.0047, -0.15, -11.6, 3.7], [1419, 1.0046, -1.88, -38.0, 62.1], [1420, 1.0072, -5.79, -94.0, 187.7],
  [1421, 1.0088, -10.37, -151.7, 345.1], [1422, 1.0102, -14.02, -195.6, 480.9], [1423, 1.0147, -17.33, -234.3, 612.6],
  [1424, 1.0142, -20.07, -256.4, 713.0], [1425, 1.0139, -21.65, -271.0, 769.5], [1426, 1.0139, -21.65, -271.0, 769.5],
  [1427, 1.0139, -22.41, -282.0, 798.9], [1428, 1.0156, -23.51, -299.5, 853.6], [1429, 1.018, -26.19, -321.2, 974.7],
  [1430, 1.0266, -29.41, -361.1, 1126.0], [1431, 1.0237, -32.72, -385.5, 1302.1], [1432, 1.0168, -36.11, -405.8, 1520.0],
];
function tipAt(f) {
  if (f <= TIP[0][0]) return null;
  const r = TIP[Math.min(TIP.length - 1, f - TIP[0][0])];
  return r;
}

function drawA(ctx, f) {
  ctx.drawImage(roomACanvas(), 0, 0);
  const st = owlAState(f), L = owlALayer(st), [dx, dy] = owlAOffset(f);
  ctx.drawImage(L.canvas, L.x + dx, L.y + dy, L.w, L.h);
}

function drawB(ctx, f) {
  const K = keysBLayers();
  ctx.drawImage(K.bg, 0, 0);
  // the synth (knobs, keys, front panel, cheek), with the pressed keys, under the tipping transform
  ctx.save();
  const tp = tipAt(f);
  if (tp) {
    const [, s, rd, tx, ty] = tp, a = (rd * Math.PI) / 180;
    ctx.setTransform(s * Math.cos(a), s * Math.sin(a), -s * Math.sin(a), s * Math.cos(a), tx, ty);
  }
  ctx.drawImage(K.kb, -K.M, 0);
  for (const i of PRESSED_B[f] || []) drawPressed(ctx, i);
  ctx.restore();
  if (f <= 1420) drawOwlB(ctx, f);
  drawTakeoff(ctx, f);
}

export const shot = {
  draw(ctx, local, t) {
    const f = Math.floor(t * 25 + 1e-4);   // source frame shown at time t (frame n covers [n/25, (n+1)/25))
    if (f < CUT_B) drawA(ctx, f);
    else drawB(ctx, f);
  },
  release() { releaseRoomA(); releaseOwlA(); releaseKeysB(); releaseOwlB(); releaseTakeoff(); },
};
