// Shot 2 (6.04–19.12): one continuous camera, drawn by hand in code (src/shots/s02/hand/). Beats, measured on the source:
//   6.04–10.52  the stare: a front close-up of the designer lit from below by the laptop (knit beanie, black hair, huge
//               eyes in dark rings, sweat beads, a pencil in his teeth, stubble, pale hoodie; the lid a black bar). Irises
//               still to 7.00, then scan in four flicks (7.04–8.68, template track per frame), snap right 8.72–8.84 (219 an
//               in-between), the look from 8.80 and held. Sweat beads slide 0–28 px (measured).
//   10.52–14.44 the pan: the camera swings up-right off his face (he slides out bottom-left) through the dark shelves,
//               accelerating (on twos at first), and stops dead at 14.44 on the carton stack (travel -2203, +1893 px).
//   14.44–16.00 locked on the cartons: the owl (headphones, plaster) sits on the top box; blink 15.20–15.68; it crouches
//               15.88–16.12 and opens its wings.
//   16.00–19.12 take-off (feet leave the lid at 16.20), the owl rises, drops toward us and flies right while the camera
//               pans back down-left with it; his face slides in again from the left, still looking right. Cut at 19.12.
// Camera: per-frame translation (hand/tracks.js; re-checked with chained phase correlation and ORB registration this
// pass). Motion blur per layer from the measured smear/sigma tracks. The owl is the B&W kit (src/lib/owlInk.js):
// `perch` sitting, `flyFront` in flight with the wing tips set per frame from measured silhouette extremes.
// Everything is drawn in code (pen strokes, hatching, scratched room); the source is used only for measurements (control
// points, tracks, fitted value corrections; the one traced element is the outer outline of his two dark hair masses) —
// see src/shots/s02/hand/README.md and fidelity/s02.md. The older traced
// modules in src/shots/s02/*.js are not loaded.
export { shot } from "./s02/hand/shot.js";
