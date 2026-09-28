# f2f.py DIR -- per frame: blurred MAE vs source, and frame-to-frame change (render vs source), sigma 3
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
bl=lambda x:cv2.GaussianBlur(x,(0,0),3)
pa=pb=None; rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=bl(cv2.imread(f,0).astype(np.float32)); b=bl(cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32))
    mae=np.abs(cv2.GaussianBlur(a,(0,0),5)-cv2.GaussianBlur(b,(0,0),5)).mean()
    if pa is not None:
        ra=np.abs(a-pa).mean(); rb=np.abs(b-pb).mean(); rows.append((t,mae,ra,rb))
    pa,pb=a,b
for t,m,ra,rb in rows:
    flag=' <<' if ra>rb*1.4+2 else ''
    print(f"{t:6.2f} mae {m:5.1f}  f2f render {ra:5.1f} source {rb:5.1f}{flag}")
