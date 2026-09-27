// s05 (23.12–26.72): over his shoulder. He types with the pencil between his teeth, the owl (in headphones, a plaster
// on the back of its head) on his right shoulder; speakers, cartons and cables round the desk. The laptop goes from his
// own site (sōko) to a file window (23.72) and on to Pure Imagination (24.16); the red selection and the note card pop
// up on the page (25.16, 25.44).
//
// Fix pass 1d: the shot is drawn in code (src/shots/s05/drawn/): authored drawing from measured geometry and fitted
// low-frequency light, with the previous passes' measured motion (camera settle grids, hand tracks, the owl's head dip,
// the pencil track, room light and ink tint). The earlier traced drawing (value-level outlines and auto-traced strokes
// of the source frames, src/shots/s05/data/ + layers.js / ink.js) is no longer loaded: it amounted to a vector copy of
// the source frames, against the brief's "never load or embed any frame/crop/pixel of the source". The pre-pass
// s05.js is kept byte-for-byte in snapshots/s05-fix1d-prev/.
export { shot } from "./s05/drawn/shot.js";
