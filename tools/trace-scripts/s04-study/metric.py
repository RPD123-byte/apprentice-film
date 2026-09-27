# metric.py DIR [x0 y0 x1 y1] -> blurred MAE per pair (render vs source), overall
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; roi=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>=6 else None
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(np.float32)
    if roi: a=a[roi[1]:roi[3],roi[0]:roi[2]]; b=b[roi[1]:roi[3],roi[0]:roi[2]]
    ba=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    mae=np.abs(ba-bb).mean(); tot.append(mae)
    print(f"{t:>6}  blurMAE {mae:5.1f}  mean r/s {a.mean():5.1f}/{b.mean():5.1f}")
print('avg',round(float(np.mean(tot)),2))
