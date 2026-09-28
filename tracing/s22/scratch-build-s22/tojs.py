# tojs.py out.js NAME=trace.json [NAME=trace.json ...]  -> ES module with compact traced drawings
import json, sys
out=sys.argv[1]; items=[a.split('=',1) for a in sys.argv[2:]]
def ring(r): return '['+','.join('%g'%round(c,1) for p in r for c in p)+']'
parts=[]
for name,path in items:
    T=json.load(open(path))
    s='  %s: { w: %d, h: %d, o: [%g, %g], base: [%s],\n'%(name,T['w'],T['h'],T['origin'][0],T['origin'][1],','.join('%g'%c for c in T['base']))
    s+='    sil: ['+','.join(ring(r) for r in T['sil'])+'],\n'
    s+='    lv: [\n'+',\n'.join('      { v: %g, r: [%s] }'%(L['v'],','.join(ring(r) for r in L['rings'])) for L in T['levels'])+'\n    ] }'
    for k in ('meta',):
        if k in T: s=s[:-2]+', meta: '+json.dumps(T[k])+' }'
    parts.append(s)
hdr="""// Traced owl drawings for s22: control points MEASURED on the source (no pixels stored). Each drawing is the owl's
// silhouette (even-odd rings), a quadratic base-value field (pre-grade grey, fitted to the plumage), and nested tone
// regions (even-odd rings, one pre-grade value each), all in drawing px; o = drawing (0,0) relative to its anchor.
// Measured on grain-free, grade-inverted medians of aligned source frames (tracer scripts: see fidelity/s22.md).
// Redrawn by s22/traced.js with the canvas fill engine + a soft premultiplied blur.
export const TRACED = {
"""
open(out,'w').write(hdr+',\n'.join(parts)+'\n};\n')
import os; print(out, os.path.getsize(out),'bytes')
