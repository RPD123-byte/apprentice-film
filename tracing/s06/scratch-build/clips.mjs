const names = ["room","body","face","nape","hair","beanie","hand","pencil","laptop","owl"];
const out = {};
for (const n of names) { const { L } = await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/r3_${n}.js`); out[n] = { clip: L.clip, rings: L.clipRings }; }
(await import("fs")).writeFileSync(process.argv[2], JSON.stringify(out));
