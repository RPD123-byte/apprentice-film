// s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.
// Everything is drawn in code (src/shots/s28/drawn/): no frame, crop or pixel of the source is used. The source was
// measured for positions, outlines, colours, the camera and the timing (see fidelity/s28.md).
//
// Beats (measured on the source):
//   129.30–131.36  the camera orbits ~42° round the sleeping designer and eases out (measured per frame); the lid of the
//                  laptop sweeps from the right of his face to the left; the owl peeks out beside the lid at the start.
//   131.36–136.00  locked. He breathes (head rises ~2 px, settles ~5 px, rises back); his half-open contented eyes close
//                  over 133.04–133.40 and reopen over 134.96–135.16.
//   135.72–136.00  the end card starts dissolving in over this shot (s40's measured curve, drawn here via overlayEndCard);
//                  s40 keeps drawing this shot underneath until 136.96.
//
// (The previous build of this shot, which re-projected vector traces of source frames, is preserved unchanged in
// snapshots/s28-prev/ and is no longer used.)
export { shot } from "./s28/drawn/shot.js";
