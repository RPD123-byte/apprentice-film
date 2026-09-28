globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
const head = await import("/Users/computer/rootline/apprentice-film/src/shots/s06/head.js");
const face = await import("/Users/computer/rootline/apprentice-film/src/shots/s06/face.js");
const body = await import("/Users/computer/rootline/apprentice-film/src/shots/s06/body.js");
const out = {};
for (const [k, v] of Object.entries({ ...head, ...face, ...body })) if (Array.isArray(v) && Array.isArray(v[0]) && typeof v[0][0] === "number") out[k] = v;
console.log(Object.keys(out).join(" "));
(await import("fs")).writeFileSync("/Users/computer/rootline/apprentice-film/snapshots/s06-r3-out/polys.json", JSON.stringify(out));
