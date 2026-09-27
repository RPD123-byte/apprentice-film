#!/usr/bin/env python3
# src.py out.jpg z "t:x0,y0,x1,y1" ...   source crops (frame index round(t*25)) with ticks every 10 px, labels every 50
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; z=float(sys.argv[2]); c=cv2.VideoCapture(V)
tiles=[]
for spec in sys.argv[3:]:
    t,b=spec.split(':'); t=float(t); x0,y0,x1,y1=[int(v) for v in b.split(',')]
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    im=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*z); L=18 if x%50==0 else 7; cv2.line(im,(X,0),(X,L),(0,200,255),1)
        if x%50==0: cv2.putText(im,str(x),(X+2,30),0,0.45,(0,255,255),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*z); L=18 if y%50==0 else 7; cv2.line(im,(0,Y),(L,Y),(0,200,255),1)
        if y%50==0: cv2.putText(im,str(y),(20,Y+5),0,0.45,(0,255,255),1)
    cv2.putText(im,f'{t:.2f}',(im.shape[1]-70,im.shape[0]-10),0,0.6,(0,255,255),2)
    tiles.append(im)
W=max(t.shape[1] for t in tiles)
tiles=[np.pad(t,((0,4),(0,W-t.shape[1]),(0,0))) for t in tiles]
cv2.imwrite(out,np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,90])
