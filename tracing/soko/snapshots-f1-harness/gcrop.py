# gcrop.py IMG x0 y0 x1 y1 scale out step [--dots]  -> zoomed crop with tick rulers in a margin (labels = page px)
import cv2, sys, numpy as np
a=sys.argv; im=cv2.imread(a[1]); x0,y0,x1,y1=[int(v) for v in a[2:6]]; s=float(a[6]); out=a[7]; step=int(a[8])
dots='--dots' in a
c=im[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
M=34; H,W=c.shape[:2]; o=np.zeros((H+M,W+M,3),np.uint8); o[M:,M:]=c
for x in range((x0//step)*step, x1, step):
    if x<x0: continue
    X=int((x-x0)*s)+M; big=x%(step*5)==0
    cv2.line(o,(X,M-(12 if big else 6)),(X,M-1),(0,255,255),1)
    if big: cv2.putText(o,str(x),(X-14,11),0,0.38,(0,255,255),1)
    if dots:
        for Y in range(M,H+M,6): o[Y,X]=(0,200,255) if big else (0,120,160)
for y in range((y0//step)*step, y1, step):
    if y<y0: continue
    Y=int((y-y0)*s)+M; big=y%(step*5)==0
    cv2.line(o,(M-(12 if big else 6),Y),(M-1,Y),(0,255,255),1)
    if big: cv2.putText(o,str(y),(0,Y+4),0,0.33,(0,255,255),1)
    if dots:
        for X in range(M,W+M,6): o[Y,X]=(0,200,255) if big else (0,120,160)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,93])
