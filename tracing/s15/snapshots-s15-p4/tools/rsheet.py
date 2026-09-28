#!/usr/bin/env python3
# rsheet.py RENDERDIR out.jpg F1,F2,... : render | source pairs (from r<f>.png) packed 2 per row
import sys, os, cv2, numpy as np
sys.path.insert(0,os.path.dirname(__file__)); from common import frame
d,out,fs=sys.argv[1],sys.argv[2],[int(x) for x in sys.argv[3].split(',')]
tiles=[]
for f in fs:
    r=cv2.imread(f'{d}/r{f}.png'); s=frame(f)
    if r is None: continue
    p=np.hstack([r,s]); p=cv2.resize(p,(1400,300),interpolation=cv2.INTER_AREA); cv2.putText(p,f'{f} {f/25:.2f}',(6,22),0,0.7,(0,255,255),2); tiles.append(p)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,85]); print(out,len(tiles))
