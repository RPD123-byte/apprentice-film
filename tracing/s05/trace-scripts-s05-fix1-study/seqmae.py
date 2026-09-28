import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1); r=f.replace('frame-','ref-')
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float); b=cv2.cvtColor(cv2.imread(r),cv2.COLOR_BGR2GRAY).astype(float)
    k=lambda x: cv2.GaussianBlur(x,(0,0),4)
    print(f'{t:>6s} blurMAE {np.abs(k(a)-k(b)).mean():5.1f}  mean {a.mean():5.1f}/{b.mean():5.1f}')
