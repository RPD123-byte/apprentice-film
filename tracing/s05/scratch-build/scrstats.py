import cv2, numpy as np, sys, glob, math
sys.path.insert(0,'.')
from src_frames import get
d=sys.argv[1]
q=np.array([[330,262],[820,190],[880,505],[420,630]])  # inset screen quad
m=np.zeros((946,2206),np.uint8); cv2.fillPoly(m,[q],1); m=m.astype(bool)
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p: float(p.split('-at-')[1][:-5])):
    P=float(f.split('-at-')[1][:-5]); k=math.ceil(math.floor(P*30+1e-6)/30*25-1e-6)
    if P<23.1 or P>26.7: continue
    a=cv2.imread(f).astype(np.float32); b=get(k).astype(np.float32)
    A=a[m]; Bv=b[m]
    la=A.mean(1); lb=Bv.mean(1)
    pa=np.percentile(la,[5,50,95]); pb=np.percentile(lb,[5,50,95])
    print(f'P {P:.2f} k {k}: mean BGR r {A.mean(0).round(1)} s {Bv.mean(0).round(1)} | L p5/50/95 r {pa.round(0)} s {pb.round(0)} | sat r {(A.max(1)-A.min(1)).mean():.1f} s {(Bv.max(1)-Bv.min(1)).mean():.1f}')
