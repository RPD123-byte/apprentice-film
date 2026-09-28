import cv2, sys, numpy as np
# grid2.py frame ref out x0 y0 x1 y1 width  -> side-by-side with coordinate grid lines every 50px (labels every 100)
f,r,o=sys.argv[1:4]; x0,y0,x1,y1=map(int,sys.argv[4:8]); w=int(sys.argv[8])
ims=[]
for p,lab in ((f,'RENDER'),(r,'SOURCE')):
    a=cv2.imread(p)[y0:y1,x0:x1].copy()
    s=w/(x1-x0); a=cv2.resize(a,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
    step=50 if (x1-x0)<=900 else 100
    for gx in range((x0//step+1)*step, x1, step):
        X=int((gx-x0)*s); cv2.line(a,(X,0),(X,a.shape[0]),(0,160,255) if gx%100==0 else (0,80,130),1)
        if gx%100==0: cv2.putText(a,str(gx),(X+2,12),0,0.4,(0,200,255),1)
    for gy in range((y0//step+1)*step, y1, step):
        Y=int((gy-y0)*s); cv2.line(a,(0,Y),(a.shape[1],Y),(0,160,255) if gy%100==0 else (0,80,130),1)
        if gy%100==0: cv2.putText(a,str(gy),(2,Y-2),0,0.4,(0,200,255),1)
    cv2.putText(a,lab,(10,a.shape[0]-10),0,0.8,(0,0,255),2); ims.append(a)
horiz=(x1-x0)<(y1-y0)*1.6
cv2.imwrite(o,np.hstack(ims) if horiz else np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,90])
