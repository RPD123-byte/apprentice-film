#!/usr/bin/env python3
# bl.py k NOWDIR out.jpg x0 y0 x1 y1 [scale]: source | render | 50/50 blend (grey), crops
import sys, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
k=int(sys.argv[1]); now=sys.argv[2]; out=sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]) if len(sys.argv)>8 else 2
s=cv2.imread(f'{SP}/src/{k:05d}.png')[y0:y1,x0:x1]; r=cv2.imread(f'{now}/{k:05d}.png')[y0:y1,x0:x1]
b=np.zeros_like(s); gs=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY); gr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)
b[...,2]=gs; b[...,1]=gr; b[...,0]=gr
o=np.hstack([s,r,b]); o=cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
