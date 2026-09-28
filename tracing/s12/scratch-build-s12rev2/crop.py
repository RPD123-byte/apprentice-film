import cv2, sys, numpy as np
# usage: crop.py frame.png ref.png x0 y0 x1 y1 out.jpg [scale] [grid]
f,r,x0,y0,x1,y1,out=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:7]),sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
grid=int(sys.argv[9]) if len(sys.argv)>9 else 0
A=cv2.imread(f)[y0:y1,x0:x1]; B=cv2.imread(r)[y0:y1,x0:x1]
def g(im):
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
    if grid:
        for x in range((x0//grid+1)*grid,x1,grid):
            X=int((x-x0)*sc); cv2.line(im,(X,0),(X,im.shape[0]),(0,0,255),1)
            cv2.putText(im,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
        for y in range((y0//grid+1)*grid,y1,grid):
            Y=int((y-y0)*sc); cv2.line(im,(0,Y),(im.shape[1],Y),(0,0,255),1)
            cv2.putText(im,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
    return im
A=g(A);B=g(B)
sep=np.full((A.shape[0],6,3),(0,0,200),np.uint8)
cv2.imwrite(out,np.hstack([A,sep,B]),[cv2.IMWRITE_JPEG_QUALITY,90])
