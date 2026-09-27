// Dump the silhouettes of the s06 helper modules (head.js, face.js, body.js) as JSON (measurement helper only).
// usage: node polys.mjs OUT.json
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
const here = new URL(".", import.meta.url).pathname;
const out = {};
for (const m of ["../head.js", "../face.js", "../body.js"]) {
  const mod = await import(here + m);
  for (const [k, v] of Object.entries(mod)) if (Array.isArray(v) && Array.isArray(v[0]) && typeof v[0][0] === "number") out[k] = v;
}
(await import("fs")).writeFileSync(process.argv[2], JSON.stringify(out));
