const takes = process.argv.slice(2);
for (const T of takes) {
  const m = await import(`../../src/shots/s15/roto${T}.js`);
  const D = m[`ROTO_${T}`];
  const fr = Object.keys(D.frames).map(Number).sort((a,b)=>a-b);
  console.log(`== ${T} frames ${fr[0]}..${fr[fr.length-1]} n=${fr.length}; floor: ${D.floor?Object.keys(D.floor).length:0}`);
  const tex = {};
  for (const [id, o] of Object.entries(D.faces)) { const k = (o.tex||'plain')+(o.style?'/s'+o.style:''); (tex[k] ||= []).push(id); }
  for (const [k, v] of Object.entries(tex)) console.log('  ', k, v.length, v.slice(0,40).join(' '));
  const cnt = fr.map(f => D.frames[f].length);
  console.log('   faces/frame', cnt.join(','));
}
