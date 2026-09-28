// dump a key's sil / ink / regions as JSON for python rasterizing. Usage: node keyras.mjs name out.json
import fs from "fs";
const [name, out] = process.argv.slice(2);
const m = await import(`/Users/computer/rootline/apprentice-film/src/shots/s28/keys/${name}.js`);
fs.writeFileSync(out, JSON.stringify(m.default));
