#!/usr/bin/env python3
# ov.py k NOWDIR out.jpg x0 y0 x1 y1 [scale] [thr]: source crop (grey) with the render's dark ink (< thr) in red and the
# source's own dark ink (< thr) in cyan, side by side with the plain source
import sys, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
k=int(sys.argv[1]); now=sys.argv[2]; out=sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]) if len(sys.argv)>8 else 2; thr=int(sys.argv[9]) if len(sys.argv)>9 else 100
s=cv2.imread(f'{SP}/src/{k:05d}.png')[y0:y1,x0:x1]; r=cv2.imread(f'{now}/{k:05d}.png')[y0:y1,x0:x1]
gs=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY); gr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY)
base=cv2.cvtColor((gs*0.5+127).astype(np.uint8),cv2.COLOR_GRAY2BGR)
m1=gs<thr; m2=gr<thr
o=base.copy(); o[m1]=(200,160,0); o[m2]=(0,0,255); o[m1&m2]=(0,0,0)
o=cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
