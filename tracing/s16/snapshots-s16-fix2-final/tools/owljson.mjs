import { OWL } from "../../../src/shots/s16/data/owl.js";
import fs from "fs";
const ids = process.argv.slice(3).map(Number);
const o = {}; for (const id of ids) o[id] = OWL[id];
fs.writeFileSync(process.argv[2], JSON.stringify(o));
