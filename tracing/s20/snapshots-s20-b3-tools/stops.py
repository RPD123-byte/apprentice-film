#!/usr/bin/env python3
# stops.py axis x0 y0 x1 y1 n [exclude x0,y0,x1,y1;...] : plate-value gradient stops across a box, averaging along
# the other axis (median, robust to lines), from the owl-free source composite, inverse-graded
import cv2, numpy as np, sys
s=cv2.cvtColor(cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s20-b3-study/cleanA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
H,W=s.shape
yy,xx=np.mgrid[0:H,0:W]; qx=(xx/W-0.5)*2; qy=(yy/H-0.5)*2; vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
lut=np.linspace(0,1,2001); out=lut*0.65+0.35*lut*lut*(3-2*lut)
V=np.minimum(1,np.interp(np.clip(s/vig,0,1),out,lut)/0.943)
ax=sys.argv[1]; x0,y0,x1,y1,n=[int(v) for v in sys.argv[2:7]]
m=np.ones_like(V,bool)
if len(sys.argv)>7:
    for tok in sys.argv[7].split(';'):
        a,b,c,d=[int(v) for v in tok.split(',')]; m[b:d,a:c]=False
res=[]
for k in range(n):
    if ax=='x':
        xa=x0+(x1-x0)*k//n; xb=x0+(x1-x0)*(k+1)//n; blk=V[y0:y1,xa:xb]; mm=m[y0:y1,xa:xb]
    else:
        ya=y0+(y1-y0)*k//n; yb=y0+(y1-y0)*(k+1)//n; blk=V[ya:yb,x0:x1]; mm=m[ya:yb,x0:x1]
    v=blk[mm]; res.append((round((k+0.5)/n,3), round(float(v.mean()),2) if v.size else None))
print(res)
