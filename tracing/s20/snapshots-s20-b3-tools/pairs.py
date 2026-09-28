#!/usr/bin/env python3
# pairs.py renderdir outdir [--mae] : pair each r_T.png with the source frame at T (render | source), + blurred MAE
import cv2, numpy as np, sys, glob, re, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
rd,od=sys.argv[1],sys.argv[2]; os.makedirs(od,exist_ok=True)
c=cv2.VideoCapture(V); tot=[]
for p in sorted(glob.glob(rd+'/r_*.png')):
    t=float(re.search(r'r_([\d.]+)\.png',p).group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
    r=cv2.imread(p)
    a=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    b=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    e=np.abs(a-b); m=e.mean(); tot.append(m)
    bands=[e[:, :760].mean(), e[:, 760:1250].mean(), e[:, 1250:].mean()]
    sgn=(a-b).mean()
    print(f"t={t:.2f} mae6={m:5.2f}  L={bands[0]:5.2f} M={bands[1]:5.2f} R={bands[2]:5.2f} bias={sgn:+.2f}")
    pair=np.hstack([r,s]); pair=cv2.resize(pair,(2206,473))
    cv2.imwrite(f"{od}/pair_{t:.2f}.jpg",pair,[cv2.IMWRITE_JPEG_QUALITY,88])
if tot: print(f"mean mae6={np.mean(tot):.2f}")
