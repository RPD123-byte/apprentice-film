// lab: owl anchors per frame (the flight pose's beak / eyes / root in frame px)
import { owlAt } from "./src/shots/s02/hand/owl.js";
import { owlLayer } from "./src/lib/owlInk.js";
const c = document.createElement("canvas");
window.LAB = { anchors(f) { const { pose, place } = owlAt(f); const L = owlLayer({ ...pose, ...place, canvas: c, extra: null }); return { ...L.anchors, place }; }, frame() { return { url: "data:,", ms: 0 }; } };
window.LABready = true;
