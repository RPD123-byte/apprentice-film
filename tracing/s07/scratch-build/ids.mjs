import * as P from "/Users/computer/rootline/apprentice-film/src/shots/s07/data/plate.js";
import { decode, zoneIds } from "/Users/computer/rootline/apprentice-film/src/shots/s07/tracekit.js";
import fs from "fs";
const ids = zoneIds(2206, 946, decode(P.ZN), decode(P.ZP));
fs.writeFileSync("/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/ids.bin", Buffer.from(ids.buffer));
