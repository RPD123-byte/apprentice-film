#!/usr/bin/env python3
# gz.py IMG_or_T x0 y0 x1 y1 scale out.jpg [step]  -> zoomed crop with a labelled grid (labels = frame px)
import cv2, sys, os, numpy as np
src=sys.argv[1]
if os.path.exists(src): f=cv2.imread(src)
else:
    V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
    c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(float(src)*25))); ok,f=c.read()
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=int(sys.argv[6]); out=sys.argv[7]; step=int(sys.argv[8]) if len(sys.argv)>8 else 10
im=cv2.resize(f[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST)
for x in range((x0//step+1)*step,x1,step):
    X=(x-x0)*s; col=(255,255,0) if x%50 else (0,0,255)
    cv2.line(im,(X,0),(X,im.shape[0]),col,1)
    if x%(step*2)==0 or step>=20: cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,0),1)
for y in range((y0//step+1)*step,y1,step):
    Y=(y-y0)*s; col=(255,255,0) if y%50 else (0,0,255)
    cv2.line(im,(0,Y),(im.shape[1],Y),col,1)
    if y%(step*2)==0 or step>=20: cv2.putText(im,str(y),(2,Y-2),0,0.4,(0,255,0),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
