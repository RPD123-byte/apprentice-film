#!/usr/bin/env node
// Which repository files does the render actually load? Opens the film, renders every frame from T0 to T1
// (shots import their modules lazily, so a full pass is needed to see them all) and writes the sorted list of
// requested files. With T0=0 T1=140.76 this lists everything the video needs (index.html, src/, assets/fonts/, audio/).
//
//   node tools/harness/deps.mjs T0 T1 [out.txt]      (default out: stdout)
import fs from "node:fs";
import { openFilm, FPS } from "./film.mjs";

const [T0s, T1s, out] = process.argv.slice(2);
if (T0s === undefined || T1s === undefined) {
  console.error("usage: node tools/harness/deps.mjs T0 T1 [out.txt]");
  process.exit(2);
}
const files = new Set(), missing = new Set();
const { browser, page } = await openFilm({ onFile: (f) => files.add(f), onMissing: (f) => missing.add(f) });
try {
  for (let f = Math.round(+T0s * FPS); f <= Math.round(+T1s * FPS); f++) {
    await page.evaluate((t) => window.__film.renderAt(t), f / FPS);
    if (f % 250 === 0) console.error(`t=${(f / FPS).toFixed(2)} files=${files.size}`);
  }
} finally {
  await browser.close();
}
for (const m of [...missing].sort()) if (m !== "favicon.ico") console.error(`missing (404): ${m}`);
const list = [...files].sort().join("\n") + "\n";
if (out) { fs.writeFileSync(out, list); console.error(`wrote ${out} (${files.size} files)`); } else process.stdout.write(list);
