// s05 room layer (boxes, speakers, shelving). The drawing is the measured ink layer "room" (./layers.js); this module
// keeps the painter interface s04's tail builds s05's layers with (src/shots/s04/s05tail.js).
import { paintInto } from "./layers.js";
export function paintRoom(P) { paintInto(P, "room"); }
