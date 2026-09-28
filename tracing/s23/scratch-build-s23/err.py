# err.py DIR : mean |blurred luminance| error render vs source per frame (σ8), whole frame and top/owl regions
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(np.float32)
    A=cv2.GaussianBlur(a,(0,0),8); B=cv2.GaussianBlur(b,(0,0),8)
    e=np.abs(A-B).mean(); et=np.abs(A-B)[:380].mean(); em=np.abs(A-B)[380:].mean()
    tot.append(e); print(f"{t:>6} all {e:5.1f}  top(y<380) {et:5.1f}  bottom {em:5.1f}")
print("mean",np.mean(tot))
