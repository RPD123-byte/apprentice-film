#!/usr/bin/env python3
# grid.py k x0 y0 x1 y1 out.jpg [scale] [render.png]: source crop (and render crop) with a labelled 50 px grid
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools')
from m import src
k=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
ims=[src(k)] + ([cv2.imread(sys.argv[8])] if len(sys.argv)>8 else [])
res=[]
for im in ims:
    c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
    st=25 if sc>=2 else 50
    for x in range((x0//st+1)*st,x1,st):
        X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,140,255) if x%50==0 else (0,80,160),1); 
        if x%50==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//st+1)*st,y1,st):
        Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,140,255) if y%50==0 else (0,80,160),1)
        if y%50==0: cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
    res.append(c)
im=np.hstack([res[0]]+([np.full((res[0].shape[0],4,3),128,np.uint8),res[1]] if len(res)>1 else []))
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(im.shape)
