# snap_rib.py RENDER.png [apply]  -- register the ribbon boundary lines (RIB_B) onto the source's first frame
import sys, re, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s08-f3-tools')
from snaplib import *
ORN='/Users/computer/rootline/apprentice-film/src/shots/s08/ornaments.js'
txt=open(ORN).read()
head,rest=txt.split('export const RIB_B = [\n',1); body,tail=rest.split('\n];',1)
lines=body.split('\n')
B=[np.array(list(map(float,re.findall(r'-?[\d.]+',l)))).reshape(-1,2) for l in lines]
R,_=luma(sys.argv[1]); S,Sim=luma(SRC)
red_mask=((Sim[...,2]>140)&(Sim[...,1]<90)&(Sim[...,0]<80)).astype(np.uint8)
red_mask=cv2.dilate(red_mask,np.ones((5,5),np.uint8))
def red(xs,ys):
    xi=np.clip(np.round(xs).astype(int),0,2205); yi=np.clip(np.round(ys).astype(int),0,945); return red_mask[yi,xi]>0
ZONE=[[760, 14], [2206, 14], [2206, 360], [1910, 360], [1910, 720], [1110, 720], [1110, 590], [800, 590], [800, 150], [760, 150]]
EDGES=[(ZONE[i],ZONE[(i+1)%len(ZONE)]) for i in range(len(ZONE))]
EDGES=[e for e in EDGES if not (e[0][1]==14 and e[1][1]==14) and not (e[0][0]==2206 and e[1][0]==2206)]
def segd(p,a,b):
    a=np.array(a,float); b=np.array(b,float); t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1); return np.hypot(*(p-(a+t*(b-a))))
def inzone(p):
    x,y=p; c=False; n=len(ZONE)
    for i in range(n):
        x1,y1=ZONE[i]; x2,y2=ZONE[(i+1)%n]
        if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1: c=not c
    return c
def occluded(p):
    x,y=p
    if 1440<x<1922 and 172<y<840: return True          # card
    if 1390<x<1460 and 470<y<550: return True          # nub
    if y<74 and (1255<x<1500 or 1535<x<1850): return True   # pills
    if y<20: return True
    if np.hypot(x-1006.7,y-64.7)<52: return True       # big star
    return False
apply='apply' in sys.argv
tot=[]
for bi,P in enumerate(B):
    N=normals(P,False)
    d,conf=measure(P,N,R,S,red=red)
    for i,p in enumerate(P):
        if not inzone(p) or occluded(p): d[i]=np.nan
    ds=smooth(d,False)
    w=np.array([min([1]+[np.clip((segd(p,a,b)-6)/15,0,1) for a,b in EDGES]) if inzone(p) else 0 for p in P])
    mv=np.nan_to_num(ds)*w
    valid=~np.isnan(d)
    tot+=list(np.abs(d[valid]))
    print(f'B[{bi}] n={len(P)} measured={valid.sum()} |d| mean={np.nanmean(np.abs(d)):.2f} max={np.nanmax(np.abs(d)):.2f}  applied mean {np.abs(mv).mean():.2f} max {np.abs(mv).max():.2f}')
    if apply: B[bi]=P+N*(0.85*mv)[:,None]
print('overall mean |d|',np.mean(tot))
if apply:
    out=[ '  ['+','.join(f'{v:.1f}' for v in P.ravel())+'],' for P in B]
    open(ORN,'w').write(head+'export const RIB_B = [\n'+'\n'.join(out)+'\n];'+tail)
    print('written')
