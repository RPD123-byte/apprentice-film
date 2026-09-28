#!/bin/sh
# fit.sh PAGE T x0 y0 x1 y1 name  -> snapshots/s12-f4c-meas/fit-<name>.jpg (render page | source at T)
cd /Users/computer/rootline/apprentice-film/snapshots/s12-f4c-gal && rm -rf outfit && npx --yes hyperframes@0.8.69 snapshot . --at "$1.5" --no-end --describe false -o outfit 2>&1 | grep -i -E "error" | head -3
cd .. && python3 - "$@" <<'PY'
import cv2,numpy as np,sys
pg,t,x0,y0,x1,y1,name=sys.argv[1:8]; t=float(t); x0,y0,x1,y1=map(int,(x0,y0,x1,y1))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read()
a=cv2.imread('s12-f4c-gal/outfit/frame-00-at-%s.5s.png'%pg)
A=a[y0:y1,x0:x1]; B=f[y0:y1,x0:x1]
# overlay: render silhouette edge (threshold) drawn on source in red
m=(cv2.GaussianBlur(cv2.cvtColor(A,cv2.COLOR_BGR2GRAY),(0,0),1.5)>60).astype(np.uint8)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
O=B.copy(); cv2.drawContours(O,cs,-1,(0,0,255),1)
cv2.imwrite('s12-f4c-meas/fit-%s.jpg'%name,np.hstack([A,B,O]),[1,92])
PY
