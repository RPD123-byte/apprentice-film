# metric.py dir -> per frame: mean |ΔE| (CIE76 on σ8-blurred Lab) render vs source
import cv2, numpy as np, glob, sys, re
d=sys.argv[1]
for fr in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    b=cv2.imread(fr.replace('frame-','ref-'))
    if b is None: continue
    a=cv2.imread(fr)
    A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
    B=cv2.cvtColor(cv2.GaussianBlur(b,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
    e=np.sqrt(((A-B)**2).sum(2))
    tt=re.search(r'at-([\d.]+)s',fr).group(1)
    print(f"{tt:>8}  dE(s8)={e.mean():5.1f}")
