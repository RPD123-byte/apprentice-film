# runs along rows/cols in PRE-GRADE space with a ribbon palette. usage: runs2.py img row|col a0 a1 step b0 b1 [minrun]
import cv2, numpy as np, sys
img=cv2.imread(sys.argv[1]).astype(np.float32)/255.0; H,W=img.shape[:2]
yy,xx=np.mgrid[0:H,0:W]; qx=(xx/W-0.5)*2; qy=(yy/H-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1); v=1-0.38*r**1.15
lx=np.linspace(0,1,4096); ly=lx*0.65+0.35*(lx*lx*(3-2*lx))
pre=np.interp(np.clip(img/v[...,None],0,1),ly,lx)[...,::-1]*255
pre=cv2.GaussianBlur(pre.astype(np.float32),(0,0),1.3)
pal={'.':'25252f','C':'f6dcc0','G':'f2b866','O':'ec6358','M':'d8288f','P':'6a3c92','K':'e476b9','g':'8ea544','k':'1e1519'}
names=list(pal); P=np.array([[int(pal[n][i:i+2],16) for i in (0,2,4)] for n in names],np.float32)
mode=sys.argv[2]; a0,a1,st,b0,b1=[int(t) for t in sys.argv[3:8]]; mr=int(sys.argv[8]) if len(sys.argv)>8 else 3
for a in range(a0,a1+1,st):
    line=pre[a,b0:b1] if mode=='row' else pre[b0:b1,a]
    idx=((line[:,None,:]-P[None])**2).sum(-1).argmin(-1)
    runs=[];s=0
    for i in range(1,len(idx)+1):
        if i==len(idx) or idx[i]!=idx[s]:
            if i-s>=mr and names[idx[s]] not in '.k': runs.append(f"{names[idx[s]]}{b0+s}-{b0+i-1}")
            s=i
    print(f"{mode}{a}: "+' '.join(runs))
