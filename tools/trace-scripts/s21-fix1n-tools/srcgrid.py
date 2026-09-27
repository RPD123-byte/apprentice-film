#!/usr/bin/env python3
# srcgrid.py out.jpg F1,F2,... x0 y0 x1 y1 [z] : SOURCE frames (by 25fps index) cropped, zoomed, with a 10px grid
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; Fs=[int(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
z=float(sys.argv[7]) if len(sys.argv)>7 else 3
cols=int(sys.argv[8]) if len(sys.argv)>8 else 0
c=cv2.VideoCapture(V); tiles=[]
for F in Fs:
    c.set(1,F); ok,f=c.read()
    im=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*z); cv2.line(im,(X,0),(X,6 if x%50 else 14),(0,255,255),1)
        if x%50==0: cv2.putText(im,str(x),(X+1,26),0,0.4,(0,255,255),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*z); cv2.line(im,(0,Y),(6 if y%50 else 14,Y),(0,255,255),1)
        if y%50==0: cv2.putText(im,str(y),(16,Y+4),0,0.4,(0,255,255),1)
    cv2.putText(im,f'{F/25:.2f}',(im.shape[1]-70,im.shape[0]-8),0,0.6,(0,255,255),2)
    tiles.append(im)
n=len(tiles); cols=cols or max(1,min(n,1600//tiles[0].shape[1]))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
