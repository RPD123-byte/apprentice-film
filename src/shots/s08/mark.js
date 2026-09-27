// The top-left logo slot of the s08 close-up: an ORIGINAL two-line mark ("Wonder" / "Camp"), not the source's
// third-party wordmark. Only its treatment is matched to the source: a monoline, rounded, connected script with an
// ~11 px stroke (half-level width measured on the first frame), a dark keyline that is heavier below and right, filling
// the measured box (F0 x ~170-437, y 11-157; line 1's tops are cut by the black strip above y ~10).
// Letterforms are designed here as centre lines (upright F0 px, one entry per pen stroke), then slanted about each
// line's baseline and drawn as smoothed round-capped strokes. dx, dy: fix-pass placement of each line (F0 px).
export const MARK = {
  slant: 0.22,
  w: 10.0,
  lines: [
    // "Wonder": baseline 51, x-height top ~8 (under the strip)
    { base: 51, dx: -10, dy: 0, strokes: [
      // W
      [166, -6, 174, 22, 184, 44, 192, 51, 199, 42, 205, 24, 209, 14, 214, 30, 221, 46, 229, 51, 237, 40, 242, 22, 246, 6, 251, 0],
      // o (+ its exit swing into the n)
      [276, 10, 262, 12, 254, 28, 256, 44, 266, 51, 278, 46, 284, 30, 281, 14, 272, 9, 280, 16, 292, 17, 302, 12],
      // n
      [304, 10, 303, 30, 302, 51],
      [303, 34, 309, 16, 318, 9, 327, 14, 330, 30, 331, 46, 337, 51, 346, 47],
      // d
      [366, 16, 354, 11, 344, 22, 342, 40, 350, 51, 361, 46, 368, 32],
      [378, -34, 373, 6, 369, 34, 370, 47, 377, 51, 386, 46],
      // e
      [386, 46, 398, 38, 404, 26, 399, 15, 389, 16, 383, 30, 385, 45, 395, 51, 407, 47, 414, 38],
      // r
      [414, 38, 419, 20, 423, 10, 430, 14, 434, 12, 436, 22, 432, 38, 434, 49, 440, 47],
    ] },
    // "Camp": baseline 130, x-height top ~88, the p's tall stem from ~66 and its descender to ~154
    { base: 130, dx: -5, dy: -4, strokes: [
      // C
      [271, 73, 266, 61, 252, 55, 232, 58, 210, 71, 194, 93, 188, 116, 195, 134, 213, 142, 236, 138, 252, 128, 262, 116],
      // a
      [262, 116, 274, 101, 288, 90],
      [290, 94, 280, 88, 268, 94, 262, 110, 265, 126, 275, 131, 286, 124, 292, 108],
      [294, 90, 291, 112, 293, 127, 300, 131, 307, 122, 312, 92],
      // m: three downstrokes
      [312, 92, 311, 112, 310, 131],
      [311, 108, 318, 93, 326, 88, 333, 95, 334, 112, 334, 131],
      [335, 108, 342, 93, 350, 88, 357, 95, 358, 112, 359, 126, 366, 131, 374, 125],
      // p
      [374, 125, 378, 104, 384, 80, 388, 68],
      [386, 72, 382, 96, 378, 124, 374, 154],
      [381, 104, 389, 91, 401, 88, 409, 97, 408, 114, 398, 128, 385, 131, 378, 124],
    ] },
  ],
  dot: [426, 112, 4.2],
};
