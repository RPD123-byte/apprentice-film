#!/usr/bin/env python3
# gov.py gal.png k x0 y0 x1 y1 out.jpg [scale]: source | gallery owl (on black) | overlay (source green, owl magenta)
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools'); from m import src
r=cv2.imread(sys.argv[1]); k=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
s=src(k)[y0:y1,x0:x1]; a=r[y0:y1,x0:x1]
gs=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY); ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY)
o=np.dstack([ga,gs,ga])
def grid(c):
    c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    for x in range((x0//50+1)*50,x1,50):
        X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,140,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,140,255),1); cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
    return c
ims=[grid(s.copy()),grid(a.copy()),grid(o)]
sep=np.full((ims[0].shape[0],4,3),128,np.uint8)
cv2.imwrite(out,np.hstack([ims[0],sep,ims[1],sep,ims[2]]),[cv2.IMWRITE_JPEG_QUALITY,88])
