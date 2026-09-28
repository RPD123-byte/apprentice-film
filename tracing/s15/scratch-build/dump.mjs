import { FACE3 } from "/Users/computer/rootline/apprentice-film/src/shots/s06/data/r3face.js";
import fs from "fs";
fs.writeFileSync(process.argv[2], JSON.stringify({ base: FACE3.base, ground: FACE3.ground }));
