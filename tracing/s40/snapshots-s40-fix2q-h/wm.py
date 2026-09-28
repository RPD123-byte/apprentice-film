import sys
from lib import *
d=sys.argv[1]
S=np.load('x/S9.npy'); R=mean_ren([137.6,138.0,138.4,138.8],d)
box=(480,280,1560,640)
for nm,I in [('S',S),('R',R)]:
    x0,y0,x1,y1=box; c=I[y0:y1,x0:x1].reshape(-1,3)
    V=c.max(1); order=np.argsort(V); k=int(len(V)*0.03)
    print(nm,'darkest3%',c[order[:k]].mean(0).round(1),'V p3',np.percentile(V,3).round(1),'V<100',(V<100).sum())
print('wm diff',bdiff(R,S,box))
