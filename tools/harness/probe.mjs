#!/usr/bin/env node
// WebGL context probe: renders every frame from T0 to T1 in one page and reports each WebGL context the shots create
// (with the source line that made it) and the first frame where the final grade's context is lost.
// This is how the black frames of multi-worker renders were traced to lost WebGL contexts (hence `--workers 1`).
//
//   node tools/harness/probe.mjs T0 T1        e.g. node tools/harness/probe.mjs 0 140.76
import { openFilm, FPS } from "./film.mjs";

const [T0s, T1s] = process.argv.slice(2);
if (T0s === undefined || T1s === undefined) {
  console.error("usage: node tools/harness/probe.mjs T0 T1");
  process.exit(2);
}
const T0 = +T0s, T1 = +T1s;
const hook = (page) => page.evaluateOnNewDocument(() => {
  const G = (window.__glp = { made: [], lost: [] });
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = orig.call(this, type, attrs);
    if (/webgl/.test(type) && ctx && !this.__glp) {
      const where = (new Error().stack.split("\n").find((l) => /src\//.test(l)) || "?").replace(/^.*?src\//, "src/").replace(/\)$/, "");
      const rec = { id: G.made.length, type, where, t: window.__glp_t ?? null, w: this.width, h: this.height };
      this.__glp = rec; G.made.push(rec);
      this.addEventListener("webglcontextlost", () => { rec.lostAt = window.__glp_t ?? null; G.lost.push(rec.id); });
    }
    return ctx;
  };
});
const { browser, page, loadSeconds } = await openFilm({ beforeLoad: hook });
console.log("loaded in", loadSeconds.toFixed(1), "s; contexts at load:", await page.evaluate(() => JSON.stringify(window.__glp.made)));
let seen = 0, first = null;
try {
  for (let f = Math.round(T0 * FPS); f <= Math.round(T1 * FPS); f++) {
    const t = f / FPS;
    const r = await page.evaluate((t) => {
      window.__glp_t = t; window.__film.renderAt(t);
      const out = document.getElementById("film"); const g = out.getContext("webgl") || out.getContext("webgl2");
      const G = window.__glp; const live = G.made.filter((m) => m.lostAt == null).length;
      return { gradeLost: !g || g.isContextLost(), made: G.made.length, live, lost: G.lost.length };
    }, t);
    if (r.made !== seen || r.gradeLost) {
      const recs = await page.evaluate((a) => window.__glp.made.slice(a), seen);
      for (const m of recs) console.log(`t=${t.toFixed(2)} NEW ctx#${m.id} ${m.type} ${m.w}x${m.h} @ ${m.where}`);
      seen = r.made;
    }
    if (f % 125 === 0) console.log(`t=${t.toFixed(2)} made=${r.made} live=${r.live} lost=${r.lost} gradeLost=${r.gradeLost}`);
    if (r.gradeLost) {
      first = t;
      const L = await page.evaluate(() => window.__glp.made.filter((m) => m.lostAt != null));
      console.log(`*** GRADE CONTEXT LOST at t=${t.toFixed(2)}; lost contexts:`, JSON.stringify(L));
      break;
    }
  }
} finally {
  await browser.close();
}
console.log(first !== null ? "RESULT: lost at " + first : "RESULT: no loss through " + T1);
process.exit(first !== null ? 1 : 0);
