#!/usr/bin/env python3
# hp.py DIR: per frame, high-pass energy (std of img - blur sigma 3) and edge energy x/y (Sobel mean abs, sigma 1) render vs source, owl masked
import cv2, numpy as np, sys, glob, re, json
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-fix2/h')
from common import frame, owlmask
d=sys.argv[1]
for p in sorted(glob.glob(d+'/r*.png'), key=lambda p:int(re.search(r'r(\d+)\.png',p).group(1))):
    f=int(re.search(r'r(\d+)\.png',p).group(1))
    r=cv2.imread(p,0).astype(np.float32); s=cv2.cvtColor(frame(f),cv2.COLOR_BGR2GRAY).astype(np.float32)
    m=owlmask(f,pad=1.5)==0
    def e(a):
        hp=a-cv2.GaussianBlur(a,(0,0),3)
        b=cv2.GaussianBlur(a,(0,0),1)
        gx=np.abs(cv2.Sobel(b,cv2.CV_32F,1,0)); gy=np.abs(cv2.Sobel(b,cv2.CV_32F,0,1))
        return hp[m].std(), gx[m].mean(), gy[m].mean()
    a=e(r); b=e(s)
    print(f'{f} {f/25:.2f} hp {a[0]:5.1f}/{b[0]:5.1f}  gx {a[1]:5.1f}/{b[1]:5.1f}  gy {a[2]:5.1f}/{b[2]:5.1f}')
