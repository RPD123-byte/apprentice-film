globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
const m = await import('/Users/computer/rootline/apprentice-film/src/shots/s17/owl.js');
for (const t of [48.88,48.92,48.96,49.04,49.28,49.36,49.44,50.88,50.96,51.04,51.28,51.36,51.44,51.52,51.6,51.64]) {
  const p = m.owlFrame(t);
  console.log(t.toFixed(2), m.drawTick(t), m.drawingTime(t), p.head.y.toFixed(3), p.wings[0].lead[3].map(v=>v.toFixed(1)).join(','));
}
