# sil.py F rootx rooty s [renderpng]: owl silhouette rows in owl units (source vs render)
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-p4/tools')
from common import frame, owl
f=int(sys.argv[1]); rx,ry,s=map(float,sys.argv[2:5])
def comp(g,th,cx,cy):
    m=(g>th).astype(np.uint8); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
    best=max(range(1,n),key=lambda i: st[i,4] if abs(cen[i][0]-cx)<250 and abs(cen[i][1]-cy)<250 else 0)
    return lab==best
o=owl(f); cx,cy=o[1],o[2]
g=cv2.GaussianBlur(cv2.cvtColor(frame(f),cv2.COLOR_BGR2GRAY),(0,0),1.5)
ms=comp(g,175,cx,cy)
mr=None
if len(sys.argv)>5:
    r=cv2.cvtColor(cv2.imread(sys.argv[5]),cv2.COLOR_BGR2GRAY); mr=comp(r,120,cx,cy)
def u(x,y): return ((x-rx)/s,(y-ry)/s)
for name,m in (('S',ms),('R',mr)):
    if m is None: continue
    ys,xs=np.nonzero(m)
    print(name,'bbox units x %.0f..%.0f y %.0f..%.0f'%(u(xs.min(),0)[0],u(xs.max(),0)[0],u(0,ys.min())[1],u(0,ys.max())[1]))
for yu in range(-320,260,20):
    y=int(round(ry+yu*s))
    if y<0 or y>=946: continue
    row=[]
    for m in (ms,mr):
        if m is None: continue
        xs=np.nonzero(m[y])[0]
        row.append('%5.0f..%5.0f'%(u(xs.min(),0)[0],u(xs.max(),0)[0]) if len(xs) else '     -     ')
    print('%4d'%yu,'  '.join(row))
