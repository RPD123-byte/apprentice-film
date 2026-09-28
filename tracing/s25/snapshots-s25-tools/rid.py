# rid.py FRAME T x,y x,y ...  -> region id, area, bbox at each point (nearest non-ink within 8 px)
import sys,numpy as np
from regions import label
f,T=int(sys.argv[1]),int(sys.argv[2])
lab,st,cen,ink=label(f,T,(0,0,2206,946))
for a in sys.argv[3:]:
    x,y=[int(v) for v in a.split(',')]
    i=lab[y,x]
    if i==0:
        w=lab[y-8:y+9,x-8:x+9].reshape(-1); w=w[w>0]
        i=np.bincount(w).argmax() if len(w) else 0
    if i: X,Y,W,H,A=st[i]; print(a,'->',i,'area',A,'bbox',X,Y,X+W,Y+H)
    else: print(a,'-> ink')
