// lab: designer only, with the tone lists overridable before the first draw (window.__setTone(obj) then draw)
import { CROWN_TONE, DES_TONE, SOFT_TONE } from "./src/shots/s02/hand/tonedata.js";
window.__TD = { CROWN_TONE, DES_TONE, SOFT_TONE };
window.__setTone = (o) => { globalThis.__S02TONE = o; };
import "./entry_des.js";
