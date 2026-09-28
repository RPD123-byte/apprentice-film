# hf_tojs.py in.json out.js NAME : pack the hatch fields as 1-char-per-cell strings (91 levels) for s04/penhatch.js
import json, sys, numpy as np
d=json.load(open(sys.argv[1])); out=sys.argv[2]; name=sys.argv[3]
A=[chr(c) for c in range(35,127) if c!=92]
def pack(a,lo,hi):
    a=np.clip((np.array(a,np.float32)-lo)/(hi-lo),0,1)*90
    return ''.join(A[int(round(v))] for v in a.ravel())
res=dict(t=d['t'],S=d['S'],nx=d['nx'],ny=d['ny'],S2=d['S2'],mx=d['mx'],my=d['my'],
  th1=pack(d['th1'],0,np.pi),th2=pack(d['th2'],0,np.pi),w2=pack(d['w2'],0,1),mask=pack(d['mask'],0,1),C=pack(d['C'],0,1),ink=d['ink'],G=pack(d['G'],0,255),per=pack(d['per'],4,13))
hdr=f"// s04 hatch fields at {d['t']:.2f} s (snapshots/s04-b1/tr/hatch_fields.py): coarse grids (12 px; spacing 24 px) of where the\n// figure is pen-hatched, the stroke directions, cross-hatch strength, spacing and the paper ground. No pixels.\n"
open(out,'w').write(hdr+f"export const {name} = "+json.dumps(res,separators=(',',':'))+";\n")
print(out, sum(len(v) for v in res.values() if isinstance(v,str)),'chars')
