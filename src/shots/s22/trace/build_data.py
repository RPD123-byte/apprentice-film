import json, os, sys
import os; S=os.environ.get('S22_WORK','/tmp/s22-work')
out=sys.argv[1]
names=[('edge','edge_trace2.json'),('brand','tr_brand.json'),('walk','tr_walk.json')]
for t in ['79.80','79.84','79.88','79.92','79.96','80.00','80.04','80.56','80.60','80.64','80.68','80.72','80.76','80.80','80.88','80.96','81.04','81.12','81.20','81.28','81.44','81.52','81.60','83.96']:
    names.append(('f'+t.replace('.',''),'tr_f%s.json'%t))
# rings: delta-encoded integers (0.1 px) in a compact string: each value -> base-36 signed, comma separated
def enc(r):
    q=[(round(x*10),round(y*10)) for x,y in r]
    vals=[q[0][0],q[0][1]]
    for (a,b),(c,d) in zip(q,q[1:]): vals+=[c-a,d-b]
    return ','.join(('-' if v<0 else '')+__import__('numpy').base_repr(abs(v),36).lower() for v in vals)
parts=[]
for name,f in names:
    T=json.load(open(os.path.join(S,f)))
    s='  %s: { w: %d, h: %d, o: [%g, %g], base: [%s],\n'%(name,T['w'],T['h'],T['origin'][0],T['origin'][1],','.join('%g'%c for c in T['base']))
    s+='    sil: ['+','.join('"%s"'%enc(r) for r in T['sil'])+'],\n'
    s+='    lv: [\n'+',\n'.join('      [%g, %s]'%(L['v'],','.join('"%s"'%enc(r) for r in L['rings'])) for L in T['levels'])+'\n    ]'
    if 'meta' in T: s+=',\n    meta: '+json.dumps(T['meta'],separators=(',',':'))
    s+=' }'
    parts.append(s)
hdr="""// Traced owl drawings for s22 — control points MEASURED on the source; no pixels are stored. Each drawing is:
//   sil  the owl's silhouette (even-odd rings),
//   base a quadratic base-value field for the plumage (pre-grade grey, x and y normalised by w and h),
//   lv   tone regions [value, ...rings] (even-odd, drawn in order, one pre-grade grey each),
// all in drawing px (pixel-index coordinates); o = drawing (0,0) relative to its anchor. Rings are delta-encoded
// 0.1 px integers in base 36 ("x0,y0,dx1,dy1,..."). Measured on grain-free, grade-inverted source frames (medians of
// aligned frames for the held drawings); the tracer (silhouette against a clean plate + the owl's own halo, nested
// tone contours) is described in fidelity/s22.md. Redrawn by s22/traced.js.
export const TRACED = {
"""
open(out,'w').write(hdr+',\n'.join(parts)+'\n};\n')
print(out, os.path.getsize(out),'bytes', len(names),'drawings')
