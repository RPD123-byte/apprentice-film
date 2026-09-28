# samp2.py RENDER.png T x0,y0,x1,y1 [...]  -> median RGB of source vs render in each box
import cv2, sys, numpy as np
from src import frame
R=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); S=frame(t)
for b in sys.argv[3:]:
    x0,y0,x1,y1=[int(v) for v in b.split(',')]
    s=np.median(S[y0:y1,x0:x1].reshape(-1,3),0)[::-1]; r=np.median(R[y0:y1,x0:x1].reshape(-1,3),0)[::-1]
    print(f"{b:22s} src {tuple(int(v) for v in s)}  ren {tuple(int(v) for v in r)}  d {tuple(int(v) for v in s-r)}")
