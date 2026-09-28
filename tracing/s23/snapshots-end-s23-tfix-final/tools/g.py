#!/usr/bin/env python3
# g.py k out.jpg x0 y0 x1 y1 [scale] [step] [dir]  : source frame k (or dir/k.png) crop with a labelled grid in frame px
import sys, cv2
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
k=int(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7])
sc=float(sys.argv[7]) if len(sys.argv)>7 else 2; st=int(sys.argv[8]) if len(sys.argv)>8 else 20
d=sys.argv[9] if len(sys.argv)>9 else SP+'/src'
f=cv2.imread(f'{d}/{k:05d}.png')[y0:y1,x0:x1]
f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); big=x%100==0
    cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if big else (0,160,255),1)
    if x%(st*2)==0 or big: cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); big=y%100==0
    cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if big else (0,160,255),1)
    if y%(st*2)==0 or big: cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
