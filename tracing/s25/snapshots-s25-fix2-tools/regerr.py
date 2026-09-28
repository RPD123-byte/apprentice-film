#!/usr/bin/env python3
# regerr.py F dirA dirB ... -- sigma-8 mean |diff| vs source in named boxes, per render dir
import cv2, numpy as np, sys
f=int(sys.argv[1]); dirs=sys.argv[2:]
S=cv2.GaussianBlur(cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png',0).astype(np.float32),(0,0),8)
B={'TL':(200,0,900,380),'TR':(1400,0,2206,420),'BL':(0,560,700,946),'BR':(1400,420,2206,946),'C':(700,200,1400,946),'all':(0,0,2206,946)}
for d in dirs:
    R=cv2.GaussianBlur(cv2.imread(f'{d}/r{f:05d}.png',0).astype(np.float32),(0,0),8); D=R-S
    print(d.ljust(16), ' '.join(f'{k} {np.abs(D[y0:y1,x0:x1]).mean():5.2f}({D[y0:y1,x0:x1].mean():+5.1f})' for k,(x0,y0,x1,y1) in B.items()))
