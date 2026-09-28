#!/usr/bin/env python3
# gridc.py T out.jpg x0 y0 x1 y1 [scale] [step] [--render file.png]  -> crop with labelled grid (frame px)
import cv2, sys
from src import frame
a=sys.argv; t=float(a[1]); out=a[2]; x0,y0,x1,y1=[int(v) for v in a[3:7]]
sc=float(a[7]) if len(a)>7 and not a[7].startswith('--') else 3
st=int(a[8]) if len(a)>8 and not a[8].startswith('--') else 25
f=frame(t)
if '--render' in a: f=cv2.imread(a[a.index('--render')+1])
c=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%100==0 else (0,200,255),1)
    if x%(st*2)==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,0),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%100==0 else (0,200,255),1)
    if y%(st*2)==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,0),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
