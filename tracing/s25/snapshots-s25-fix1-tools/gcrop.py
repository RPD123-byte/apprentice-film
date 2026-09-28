#!/usr/bin/env python3
# gcrop.py F x0 y0 x1 y1 out [scale] [step] [dbgkey]: source (or drawing) crop with a labelled grid
import cv2, sys
f=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 3; st=int(sys.argv[8]) if len(sys.argv)>8 else 10
src=f'/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f{f:05d}.png' if len(sys.argv)<=9 else sys.argv[9]
im=cv2.imread(src)[y0:y1,x0:x1]
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); c=(0,140,255) if x%(st*5)==0 else (0,60,120); cv2.line(im,(X,0),(X,im.shape[0]-1),c,1)
    if x%(st*5)==0: cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); c=(0,140,255) if y%(st*5)==0 else (0,60,120); cv2.line(im,(0,Y),(im.shape[1]-1,Y),c,1)
    if y%(st*5)==0: cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,im)
