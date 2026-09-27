#!/usr/bin/env python3
# cellmap.py T x0 y0 x1 y1 cell -> table of (render - source) mean luminance per cell (+ = render brighter)
import cv2, sys, os, numpy as np
H=os.path.dirname(os.path.abspath(__file__))
t=float(sys.argv[1]); x0,y0,x1,y1,c=[int(v) for v in sys.argv[2:7]]
s=cv2.imread(f'{H}/src/f{int(round(t*25))}.png').astype(float); r=cv2.imread(f'{H}/out/r-{t:.3f}.png').astype(float)
Ls=s@[0.114,0.587,0.299]; Lr=r@[0.114,0.587,0.299]
print('      '+''.join(f'{x:5d}' for x in range(x0,x1,c)))
for y in range(y0,y1,c):
    row=[]
    for x in range(x0,x1,c):
        row.append(Lr[y:y+c,x:x+c].mean()-Ls[y:y+c,x:x+c].mean())
    print(f'{y:5d} '+''.join(f'{v:5.0f}' for v in row))
