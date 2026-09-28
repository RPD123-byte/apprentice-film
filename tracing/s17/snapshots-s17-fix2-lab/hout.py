import sys,cv2,numpy as np,json
sys.path.insert(0,'.')
from lab import *
L=Lab()
TS=[52.68,52.72,52.76,52.80,52.84,52.88,52.92,52.96,53.00,53.08,53.12,53.16,53.20]
res=L.js('''(ts) => ts.map((t) => { const P = window.S17.OWL.owlFrame(t); const H = window.S17.headGeom(P.head);
  const f = (p) => [P.x + P.s * p[0], P.y + P.s * p[1]];
  return { out: H.out.map(f), c: f([H.x, H.y]), sil: (P.silTrace||[]).map((q) => q.map(f)) }; })''', TS)
json.dump(dict(zip([f'{t:.2f}' for t in TS],res)),open('hout.json','w'))
rows=[]
for t,r in zip(TS,res):
    s=src(t).copy()
    cx,cy=r['c']
    cv2.polylines(s,[np.array(r['out'],np.int32)],True,(0,0,255),1)
    for q in r['sil']: cv2.polylines(s,[np.array(q,np.int32)],True,(0,255,0),1)
    x0,y0=int(cx-75),int(cy-75); rows.append(s[y0:y0+130,x0:x0+150])
half=(len(rows)+1)//2
Lc=np.vstack(rows[:half]); R=np.vstack(rows[half:]+[np.zeros_like(rows[0])]*(half-len(rows[half:])))
cv2.imwrite('v_hout.jpg',cv2.resize(np.hstack([Lc,R]),None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC))
L.close()
