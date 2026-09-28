#!/usr/bin/env python3
# crop.py OUT.jpg NOWDIR k1,k2,... x0 y0 x1 y1 [scale]  -> rows per k: SRC | NOW | BASE crops (labelled)
import sys, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
out, now = sys.argv[1], sys.argv[2]; ks=[int(x) for x in sys.argv[3].split(',')]
x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
rows=[]
for k in ks:
    ims=[]
    for lab,p in [('SRC',f'{SP}/src/{k:05d}.png'),('NOW',f'{now}/{k:05d}.png'),('BASE',f'{SP}/base/{k:05d}.png')]:
        a=cv2.imread(p)
        if a is None: a=np.zeros((946,2206,3),np.uint8)
        c=a[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
        cv2.putText(c,f'{lab} {k}',(6,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)
        ims.append(c)
    rows.append(np.hstack(ims))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
