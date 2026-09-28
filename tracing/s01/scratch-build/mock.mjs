const handler = { get: (t, k) => (k in t ? t[k] : (() => grad)) , set: (t,k,v)=>{t[k]=v;return true;} };
const grad = { addColorStop() {} };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, handler) }) };
const M = await import('/Users/computer/rootline/apprentice-film/src/shots/s20/owlposes.js');
const O = await import('/Users/computer/rootline/apprentice-film/src/shots/s20/owl2.js');
const name = process.argv[2];
const t = Date.now();
O.owl2Layer(M.POSE[name](), { x: 1000, y: 600, s: 1 });
console.log(name, 'ok', Date.now() - t, 'ms');
