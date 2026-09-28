#!/usr/bin/env python3
# r.py k out.jpg x0 y0 x1 y1 [scale] [dir] : crop with border rulers (ticks every 10 px, labels every 50) + faint 50-px grid
import sys, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
k=int(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7])
sc=float(sys.argv[7]) if len(sys.argv)>7 else 3; d=sys.argv[8] if len(sys.argv)>8 else SP+'/src'
f=cv2.imread(f'{d}/{k:05d}.png')[y0:y1,x0:x1]
f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
H,W=f.shape[:2]; P=30
c=np.full((H+2*P,W+2*P,3),255,np.uint8); c[P:P+H,P:P+W]=f
for x in range((x0//10+1)*10,x1,10):
    X=P+int((x-x0)*sc); L=10 if x%50 else 18
    for yy in (0,H+2*P-L): cv2.line(c,(X,yy),(X,yy+L),(0,0,200),1)
    if x%50==0:
        cv2.putText(c,str(x),(X-12,P-12),0,0.35,(0,0,200),1)
        cv2.line(c,(X,P),(X,P+H),(0,140,255),1)
for y in range((y0//10+1)*10,y1,10):
    Y=P+int((y-y0)*sc); L=10 if y%50 else 18
    for xx in (0,W+2*P-L): cv2.line(c,(xx,Y),(xx+L,Y),(0,0,200),1)
    if y%50==0:
        cv2.putText(c,str(y),(1,Y-3),0,0.35,(0,0,200),1)
        cv2.line(c,(P,Y),(P+W,Y),(0,140,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
