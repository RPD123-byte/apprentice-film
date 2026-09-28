# python zoom.py rdir n0,n1 x0 y0 x1 y1 scale out.jpg   (mean of frames n0..n1 step 1; render | source; grid every 10px)
import cv2, numpy as np, sys, os
rdir=sys.argv[1]; n0,n1=[int(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; sc=int(sys.argv[7]); out=sys.argv[8]
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'{rdir}/r-{n/25:.3f}.png').astype(np.float32)
ns=[n for n in range(n0,n1+1) if os.path.exists(f'{rdir}/r-{n/25:.3f}.png')]
r=np.mean([R(n)[y0:y1,x0:x1] for n in ns],0); s=np.mean([S(n)[y0:y1,x0:x1] for n in ns],0)
def up(a):
    a=cv2.resize(a.clip(0,255).astype(np.uint8),None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
    for x in range(x0,x1):
        if x%10==0: a[:,(x-x0)*sc]=(0,255,0) if x%50 else (255,255,0)
    for y in range(y0,y1):
        if y%10==0: a[(y-y0)*sc,:]=(0,255,0) if y%50 else (255,255,0)
    return a
im=np.hstack([up(r),np.zeros((up(r).shape[0],6,3),np.uint8),up(s)])
cv2.putText(im,f'x{x0}-{x1} y{y0}-{y1} frames {ns[0]}-{ns[-1]} ({len(ns)})',(4,14),cv2.FONT_HERSHEY_SIMPLEX,0.45,(255,255,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92]); print(out,len(ns))
