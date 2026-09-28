#!/usr/bin/env node
// Frame-exact stills of the real composition: calls window.__film.renderAt(t) and saves the graded canvas.
// Unlike `hyperframes snapshot` (tools/compare.sh) there is no per-seek protocol timeout, so it works under load.
//
//   node tools/harness/shoot.mjs OUTDIR TIMES [entry.html]
//     TIMES = "12.5,13,14.25" (seconds) or "T0:T1" (every frame from T0 to T1 at 25 fps)
//     -> OUTDIR/<frame>.png, frame = round(t * 25)
// S28_DBG='{"...":...}' sets window.__s28dbg before rendering (s28's debug overlay).
import fs from "node:fs";
import path from "node:path";
import { openFilm, parseTimes, FPS } from "./film.mjs";

const [outDir, timesArg, entry = "index.html"] = process.argv.slice(2);
if (!outDir || !timesArg) {
  console.error("usage: node tools/harness/shoot.mjs OUTDIR t1,t2,...|T0:T1 [entry.html]");
  process.exit(2);
}
const times = parseTimes(timesArg);
fs.mkdirSync(outDir, { recursive: true });
const { browser, page, loadSeconds } = await openFilm({ page: entry });
if (process.env.S28_DBG) await page.evaluate((d) => { window.__s28dbg = JSON.parse(d); }, process.env.S28_DBG);
console.log("loaded in", loadSeconds.toFixed(1), "s");
try {
  for (const t of times) {
    const s = Date.now();
    const url = await page.evaluate((t) => {
      window.__film.renderAt(t);
      return document.getElementById("film").toDataURL("image/png");
    }, t);
    const name = path.join(outDir, `${Math.round(t * FPS)}.png`);
    fs.writeFileSync(name, Buffer.from(url.split(",")[1], "base64"));
    console.log(t.toFixed(4), ((Date.now() - s) / 1000).toFixed(1), "s", name);
  }
} finally {
  await browser.close();
}
