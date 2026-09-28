const [T,f]=process.argv.slice(2);
const D=(await import(`../../src/shots/s15/roto${T}.js`))[`ROTO_${T}`];
for (const r of D.frames[f]) console.log(r[0]+' '+r.slice(1,9).join(' ')+'  #'+(D.faces[r[0]]?.tex||'')+' v='+r.slice(9).join(','));
