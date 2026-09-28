# Pair harness renders with source frames: blurred CIE76 dE (sigma 8 and 2), side-by-side jpgs, per-frame table.
# usage: pair.py outdir [--crop x0,y0,x1,y1] [--stack]
import cv2, glob, re, sys, os, numpy as np
from src import frame
out=sys.argv[1]; crop=None; stack='--stack' in sys.argv
for a in sys.argv[2:]:
    if a.startswith('--crop='): crop=[int(v) for v in a[7:].split(',')]
fs=sorted(glob.glob(out+'/*.png'))
def lab(im,s):
    f=cv2.GaussianBlur(im,(0,0),s) if s>0 else im
    return cv2.cvtColor(f.astype(np.float32)/255,cv2.COLOR_BGR2Lab)
rows=[]
for f in fs:
    m=re.search(r'([\d]+\.[\d]+)s?\.png$',os.path.basename(f)) or re.search(r'at-([\d.]+)',f)
    if not m: continue
    t=float(m.group(1).rstrip('.'))
    R=cv2.imread(f); S=frame(t)
    if R.shape!=S.shape: R=cv2.resize(R,(S.shape[1],S.shape[0]))
    d8=np.linalg.norm(lab(R,8)-lab(S,8),axis=2).mean(); d2=np.linalg.norm(lab(R,2)-lab(S,2),axis=2).mean()
    rows.append((t,d8,d2))
    a,b=(R,S) if not crop else (R[crop[1]:crop[3],crop[0]:crop[2]],S[crop[1]:crop[3],crop[0]:crop[2]])
    w=1100 if not crop else min(1100,(crop[2]-crop[0])*2)
    a=cv2.resize(a,(w,int(a.shape[0]*w/a.shape[1]))); b=cv2.resize(b,(w,int(b.shape[0]*w/b.shape[1])))
    cv2.putText(a,f"render {t:.2f} dE8 {d8:.1f}",(8,22),0,0.7,(0,255,255),2); cv2.putText(b,f"source {t:.2f}",(8,22),0,0.7,(0,255,255),2)
    im=np.vstack([a,b]) if stack or crop is None else np.hstack([a,b])
    cv2.imwrite(f"{out}/pair-{t:.2f}.jpg",im,[cv2.IMWRITE_JPEG_QUALITY,88])
for t,d8,d2 in rows: print(f"{t:.2f}  dE8 {d8:5.2f}  dE2 {d2:5.2f}")
if rows: print(f"mean dE8 {np.mean([r[1] for r in rows]):.2f}  dE2 {np.mean([r[2] for r in rows]):.2f}  n={len(rows)}")
