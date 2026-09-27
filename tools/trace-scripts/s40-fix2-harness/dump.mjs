import * as D from "../../src/shots/s40/data.js";
import fs from "fs";
fs.writeFileSync("data.json", JSON.stringify(D));
