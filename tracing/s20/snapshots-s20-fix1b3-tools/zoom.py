#!/usr/bin/env python3
# zoom.py out.jpg fr|r:path x0 y0 x1 y1 scale [step] : crop with a fine labelled grid every `step` px (default 25)
import cv2, sys
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix1b3-src'
out,it=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); st=int(sys.argv[8]) if len(sys.argv)>8 else 25
im=cv2.imread(it[2:]) if it.startswith('r:') else cv2.imread(f'{D}/f_{it}.png')
im=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); c=(0,0,255) if x%100==0 else (0,150,255); cv2.line(im,(X,0),(X,im.shape[0]),c,1)
    if x%50==0: cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); c=(0,0,255) if y%100==0 else (0,150,255); cv2.line(im,(0,Y),(im.shape[1],Y),c,1)
    if y%50==0: cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
