# Sheet of gridded zoomed crops at several times with per-time crop boxes: cropsheet.py out.jpg zoom "t:x0,y0,x1,y1" ...
import cv2, numpy as np, sys
from src import frame
out=sys.argv[1]; z=float(sys.argv[2]); ims=[]
for spec in sys.argv[3:]:
    t,box=spec.split(':'); t=float(t); x0,y0,x1,y1=[int(v) for v in box.split(',')]
    c=cv2.resize(frame(t)[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    for gx in range((x0//10+1)*10,x1,10):
        X=int((gx-x0)*z); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if gx%50==0 else (0,190,255),1)
        if gx%50==0: cv2.putText(c,str(gx),(X+2,11),0,0.38,(255,255,0),1)
    for gy in range((y0//10+1)*10,y1,10):
        Y=int((gy-y0)*z); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if gy%50==0 else (0,190,255),1)
        if gy%50==0: cv2.putText(c,str(gy),(2,Y-2),0,0.38,(255,255,0),1)
    cv2.putText(c,f"{t:.2f}",(4,c.shape[0]-6),0,0.6,(0,255,0),2); ims.append(c)
cols=int(sys.argv[0] and 2) if len(ims)>1 else 1
h=max(i.shape[0] for i in ims); w=max(i.shape[1] for i in ims)
ims=[np.pad(i,((0,h-i.shape[0]+3),(0,w-i.shape[1]+3),(0,0))) for i in ims]
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(out,np.vstack([np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
