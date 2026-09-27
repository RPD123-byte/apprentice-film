#!/usr/bin/env python3
# szoom.py out.jpg z "t:x0,y0,x1,y1" ... : zoomed SOURCE crops with frame-px ticks every 10 px, tiled
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; z=float(sys.argv[2]); c=cv2.VideoCapture(V); tiles=[]
for spec in sys.argv[3:]:
    t,b=spec.split(':'); t=float(t); x0,y0,x1,y1=[int(v) for v in b.split(',')]
    c.set(1,int(round(t*25))); ok,f=c.read()
    im=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*z); L=12 if x%50==0 else 5; cv2.line(im,(X,0),(X,L),(0,255,255),1)
        if x%50==0: cv2.putText(im,str(x),(X+1,22),0,0.4,(0,255,255),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*z); L=12 if y%50==0 else 5; cv2.line(im,(0,Y),(L,Y),(0,255,255),1)
        if y%50==0: cv2.putText(im,str(y),(14,Y+4),0,0.4,(0,255,255),1)
    cv2.putText(im,f'{t:.2f}',(im.shape[1]-60,im.shape[0]-8),0,0.6,(0,255,255),2)
    tiles.append(im)
H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
tiles=[np.pad(t,((0,H-t.shape[0]+3),(0,W-t.shape[1]+3),(0,0))) for t in tiles]
cols=int(max(1,min(len(tiles),1600//W)))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,90])
