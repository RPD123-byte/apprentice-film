// s22 fix pass 2: residual fine lines of the late drawings, anchor-local px, per point [u, v, width, multiply]; drawn
// by s22/traced.js as a second multiplied layer after the drawing's softening. Measured on top of s22/lines.js with the
// film's own renderer (trace/write_lines2.py): the walk's face-disc contour, chin mark and wing edge (56 single
// frames) and the brandish's blade edge lines (its four still frames).
// Control points only; no pixels.
export const LINES2 = {
  walk: [[99.2,28.0,1.0,0.93,99.9,31.0,1.2,0.9,99.4,33.5,1.2,0.88,98.3,35.5,1.2,0.86,97.5,37.0,1.2,0.86,97.3,39.0,1.0,0.92],[97.2,46.8,1.0,0.94,96.2,48.6,1.1,0.92,94.8,50.6,1.0,0.94],[91.0,64.2,1.0,0.95,96.0,64.1,1.2,0.93,101.0,63.9,1.2,0.93,106.0,63.9,1.2,0.94,111.0,63.9,1.1,0.94,114.0,63.8,1.0,0.96]],
  brand: [[306,89.1,1.0,0.95,312,91.2,1.1,0.9,318,94.5,1.1,0.9,324,97.2,1.1,0.9,330,99.8,1.1,0.9,334,101.4,1.0,0.95],[337,103.6,1.0,0.97,342,106.6,1.1,0.93,346,107.4,1.1,0.88,351,107.9,1.0,0.92],[348,98.8,1.0,0.92,354,99.0,1.1,0.88,357,99.5,1.1,0.88,360,101.0,1.1,0.88,366,102.2,1.1,0.9,369,102.1,1.0,0.94],[334,87.8,1.0,0.92,338,89.3,1.0,0.92,342,91.0,1.1,0.9,346,91.9,1.1,0.9,350,92.0,1.0,0.93]]
};
