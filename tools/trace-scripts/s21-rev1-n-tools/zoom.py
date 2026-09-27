import cv2, sys, numpy as np
# zoom.py frame.png ref.png x0 y0 x1 y1 scale out.jpg
f,r,x0,y0,x1,y1,sc,out=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:7]),float(sys.argv[7]),sys.argv[8]
a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(r)[y0:y1,x0:x1]
a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
im=np.hstack([a,np.full((a.shape[0],6,3),(0,0,160),np.uint8),b])
# grid every 20 px of frame
for k in range(2):
    ox=k*(a.shape[1]+6)
    for gx in range((x0//20+1)*20,x1,20):
        X=int((gx-x0)*sc)+ox; cv2.line(im,(X,0),(X,6),(0,200,255),1)
        if gx%100==0: cv2.putText(im,str(gx),(X+2,16),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
    for gy in range((y0//20+1)*20,y1,20):
        Y=int((gy-y0)*sc); cv2.line(im,(ox,Y),(ox+6,Y),(0,200,255),1)
        if gy%100==0: cv2.putText(im,str(gy),(ox+8,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
