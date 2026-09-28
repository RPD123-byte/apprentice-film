# Trace several seeded regions of one source frame; write JSON {name: polygon} and an overlay image.
import sys,json,cv2,numpy as np
sys.path.insert(0,'snapshots/s28t-tools/t')
from trace import region,poly
from grade import grab
t=float(sys.argv[1]); spec=json.loads(open(sys.argv[2]).read()); out=sys.argv[3]
f=grab(t); o=f.copy(); res={}
cols=[(0,0,255),(0,255,0),(255,0,0),(0,255,255),(255,0,255),(255,255,0),(0,128,255),(128,0,255),(255,128,0),(0,255,128)]
for i,(name,s) in enumerate(spec.items()):
    x,y=s['seed']; tol=s.get('tol',16); eps=s.get('eps',2.0); cl=s.get('close',3); bl=s.get('blur',2)
    m,_=region(t,x,y,tol,cl,bl,frame=f)
    if 'open' in s: m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*s['open']+1,)*2))
    p=poly(m,eps); res[name]=p.tolist()
    c=cols[i%len(cols)]
    cv2.polylines(o,[p.reshape(-1,1,2)],True,c,2); cv2.circle(o,(x,y),6,c,-1)
    cv2.putText(o,name,(x+8,y),0,0.6,c,2)
    print(name,len(p),'area',int(m.sum()/255),file=sys.stderr)
json.dump(res,open(out+'.json','w'))
cv2.imwrite(out+'.jpg',o)
