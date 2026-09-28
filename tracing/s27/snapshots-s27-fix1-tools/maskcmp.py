# maskcmp.py render.png T out.jpg x0 y0 x1 y1 [scale]: dark-mask overlay: black=both, red=source only, blue=render only
import cv2, sys, numpy as np
from src import frame
R=cv2.imread(sys.argv[1]); t=float(sys.argv[2]); out=sys.argv[3]; x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 2
S=frame(t); TH=int(__import__("os").environ.get("TH","55"))
ms=cv2.cvtColor(S,cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]<TH; mr=cv2.cvtColor(R,cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]<TH
im=np.full(ms.shape+(3,),255,np.uint8)
im[ms&~mr]=(60,60,230); im[mr&~ms]=(230,120,40); im[ms&mr]=(0,0,0)
c=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
for x in range(x0-x0%25+25,x1,25):
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,200,0) if x%100==0 else (180,220,180),1)
    if x%50==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,140,0),1)
for y in range(y0-y0%25+25,y1,25):
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,200,0) if y%100==0 else (180,220,180),1)
    if y%50==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,140,0),1)
iou=(ms&mr).sum()/max(1,(ms|mr).sum())
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90]); print('dark IoU',round(iou,3),'src',ms.sum(),'ren',mr.sum())
