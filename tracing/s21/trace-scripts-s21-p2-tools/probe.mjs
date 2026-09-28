// node snapshots/s21-p2-tools/probe.mjs 70.44,71.2 : print s21's landmarks
const { probe } = await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
const f = (v) => Array.isArray(v) ? '(' + v.map((q) => Array.isArray(q) ? f(q) : q.toFixed(1)).join(',') + ')' : (typeof v === 'number' ? v.toFixed(2) : v);
for (const t of process.argv[2].split(',').map(Number)) {
  const p = probe(t);
  console.log(Object.entries(p).map(([k, v]) => `${k} ${f(v)}`).join('  '));
}
