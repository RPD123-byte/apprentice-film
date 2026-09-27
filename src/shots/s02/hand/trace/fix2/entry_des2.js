import { DES_TONE, SOFT_TONE } from "./src/shots/s02/hand/tonedata.js";
import { BEANIE, FACE_OVAL } from "./src/shots/s02/hand/designer.js";
window.__TD = { DES_TONE, SOFT_TONE }; window.__POLY = { BEANIE, FACE_OVAL };
window.__setTone = (o) => { globalThis.__S02TONE = o; };
import "./entry_des.js";
