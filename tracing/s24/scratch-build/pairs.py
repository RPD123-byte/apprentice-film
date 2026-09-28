# usage: pairs.py dir out.jpg [x0 y0 x1 y1] [--w W]  -> for each frame-*.png/ref-*.png pair: crop, stack render above source
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; out=sys.argv[2]; a=sys.argv[3:]
w=int(a[a.index('--w')+1]) if '--w' in a else 1000
if '--w' in a: i=a.index('--w'); a=a[:i]+a[i+2:]
roi=[int(v) for v in a[:4]] if len(a)>=4 else None
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1); r=f.replace('frame-','ref-')
    A=cv2.imread(f); B=cv2.imread(r)
    if roi: A=A[roi[1]:roi[3],roi[0]:roi[2]]; B=B[roi[1]:roi[3],roi[0]:roi[2]]
    s=w/A.shape[1]; A=cv2.resize(A,None,fx=s,fy=s,interpolation=cv2.INTER_AREA); B=cv2.resize(B,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
    cv2.putText(A,'R '+t,(4,16),0,0.5,(0,255,255),1); cv2.putText(B,'S '+t,(4,16),0,0.5,(0,255,255),1)
    rows.append(np.vstack([A,B,np.full((4,A.shape[1],3),80,np.uint8)]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out)
