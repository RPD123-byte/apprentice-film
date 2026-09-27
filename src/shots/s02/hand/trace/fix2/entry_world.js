import { worldCanvas, WORLD } from "./src/shots/s02/hand/room.js";
window.LAB = { world() { const W = worldCanvas(WORLD, 0.5); return W.c.toDataURL("image/png"); } };
window.LABready = true;
