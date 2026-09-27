# per-frame check of the flying owl: IoU of render silhouette vs source silhouette, best shift (+-24 px) and scale
import sys, os, json, cv2, numpy as np
os.environ['ENTRY']='entry_owlonly.js'; frames=[int(v) for v in sys.argv[1].split(',')]; sys.argv=[sys.argv[0]]
from run import Lab
sys.path.insert(0,'../s02-r3-meas'); from common import ungrade, src
L=Lab()
for f in frames:
    img,_=L.frame(f,False)
    g=cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    R=(g>150).astype(np.uint8)
    ys,xs=np.nonzero(R); bx0,by0,bx1,by1=xs.min()-40,ys.min()-40,xs.max()+40,ys.max()+40
    S0=cv2.GaussianBlur(ungrade(src(f).astype(np.float32),f/25),(0,0),1.5)
    S=(S0>150).astype(np.uint8)
    # restrict to the render's bbox region
    Z=np.zeros_like(S); Z[max(0,by0):by1,max(0,bx0):bx1]=1; S=S*Z
    n,lab,st,cen=cv2.connectedComponentsWithStats(S,8)
    if n<2: print(f,'no src'); continue
    # keep components overlapping the render
    keep=np.zeros_like(S)
    for i in range(1,n):
        if st[i,4]>200 and (R[lab==i]).mean()>0.2: keep[lab==i]=1
    S=keep
    best=None
    for dx in range(-24,25,3):
        for dy in range(-24,25,3):
            M=np.roll(np.roll(R,dy,0),dx,1)
            iou=(M&S).sum()/max(1,(M|S).sum())
            if best is None or iou>best[0]: best=(round(float(iou),3),dx,dy)
    iou0=(R&S).sum()/max(1,(R|S).sum())
    # body column: +-160 px around the render's centroid x
    cx=int(xs.mean()); C=np.zeros_like(R); C[:,cx-150:cx+150]=1
    bb=None
    for dx in range(-24,25,3):
        for dy in range(-30,31,3):
            M=np.roll(np.roll(R,dy,0),dx,1)*C; SS=S*C
            iou=(M&SS).sum()/max(1,(M|SS).sum())
            if bb is None or iou>bb[0]: bb=(round(float(iou),3),dx,dy)
    print('   body', bb)
    print(f,'iou0 %.3f'%iou0,'best',best,'area render/src %.2f'%(R.sum()/max(1,S.sum())))
L.close()
