#!/bin/sh
# fit2.sh PAGE T x0 y0 x1 y1 name scale -> 2 panels (render | source + red render outline), scaled
cd /Users/computer/rootline/apprentice-film/snapshots/s12-f4c-gal && rm -rf outfit && npx --yes hyperframes@0.8.69 snapshot . --at "$1.5" --no-end --describe false -o outfit 2>&1 | grep -i -E "error" | head -3
cd .. && python3 - "$@" <<'PY'
import cv2,numpy as np,sys
pg,t,x0,y0,x1,y1,name,sc=sys.argv[1:9]; t=float(t); x0,y0,x1,y1=map(int,(x0,y0,x1,y1)); sc=float(sc)
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read()
a=cv2.imread('s12-f4c-gal/outfit/frame-00-at-%s.5s.png'%pg)
A=a[y0:y1,x0:x1]; B=f[y0:y1,x0:x1].copy()
m=(cv2.GaussianBlur(cv2.cvtColor(A,cv2.COLOR_BGR2GRAY),(0,0),1.5)>60).astype(np.uint8)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cv2.drawContours(B,cs,-1,(0,0,255),2)
out=np.hstack([A,B]); out=cv2.resize(out,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite('s12-f4c-meas/fit-%s.jpg'%name,out,[1,92])
PY
