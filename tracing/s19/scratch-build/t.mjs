globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
const o = await import('/Users/computer/rootline/apprentice-film/src/shots/s19/owl.js');
const k = await import('/Users/computer/rootline/apprentice-film/src/lib/owlInk.js');
const b = k.bodyOutline(o.SPREAD.body);
const xs = b.map(p => p[0]), ys = b.map(p => p[1]);
console.log(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
