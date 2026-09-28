# metrics.py RENDER_DIR [frames a:b] -> per-frame owl IoU, owl MAE, halo bias, margin biases (render - source)
import cv2, numpy as np, sys, os, glob
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
R=sys.argv[1]
fa,fb=(1736,1862)
if len(sys.argv)>2: fa,fb=map(int,sys.argv[2].split(':'))
def g(p): return cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
MED=SRC+'/median.npy'
if not os.path.exists(MED):
    st=np.stack([g(f'{SRC}/f{f:04d}.png') for f in range(1736,1863)]); np.save(MED,np.median(st,0).astype(np.float32)); del st
ms=np.load(MED)
rmed=R+'/median.npy'
if not os.path.exists(rmed):
    fs=[f for f in range(1736,1863) if os.path.exists(f'{R}/r-{f/25:.2f}.png')]
    st=np.stack([g(f'{R}/r-{f/25:.2f}.png') for f in fs]); np.save(rmed,np.median(st,0).astype(np.float32)); del st
mr=np.load(rmed)
B=lambda a,s: cv2.GaussianBlur(a,(0,0),s)
msb=B(ms,1.5); mrb=B(mr,1.5)
boxes={'top':(0,0,2206,115),'left':(0,130,130,946),'right':(2040,130,2206,946),'tl':(0,0,150,120)}
rows=[]
print('frame   t     IoU   MAE  halo  top  left right  tl   full')
for f in range(fa,fb+1):
    t=f/25; p=f'{R}/r-{t:.2f}.png'
    if not os.path.exists(p): continue
    r=g(p); s=g(f'{SRC}/f{f:04d}.png')
    rb=B(r,1.5); sb=B(s,1.5)
    mS=(np.abs(sb-msb)>22).astype(np.uint8); mR=(np.abs(rb-mrb)>22).astype(np.uint8)
    k=np.ones((3,3),np.uint8); mS=cv2.morphologyEx(mS,cv2.MORPH_OPEN,k); mR=cv2.morphologyEx(mR,cv2.MORPH_OPEN,k)
    U=(mS|mR)>0; I=(mS&mR)>0
    iou=I.sum()/max(1,U.sum())
    mae=np.abs(rb-sb)[U].mean() if U.any() else 0
    dil=cv2.dilate(U.astype(np.uint8),np.ones((61,61),np.uint8))>0
    ring=dil&~U
    halo=(B(r,4)-B(s,4))[ring].mean() if ring.any() else 0
    bb={k:(B(r,4)[y0:y1,x0:x1]-B(s,4)[y0:y1,x0:x1]).mean() for k,(x0,y0,x1,y1) in boxes.items()}
    full=np.abs(B(r,3)-B(s,3)).mean()
    print(f'{f} {t:6.2f} {iou:5.2f} {mae:5.1f} {halo:5.1f} {bb["top"]:5.1f} {bb["left"]:5.1f} {bb["right"]:5.1f} {bb["tl"]:5.1f} {full:5.1f}')
    rows.append((iou,mae,halo,full))
a=np.array(rows); print('MEAN', ' '.join(f'{v:.3f}' for v in a.mean(0)))
