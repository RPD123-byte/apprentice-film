import cv2, sys, numpy as np
# usage: crop.py render.png ref.png x0 y0 x1 y1 scale out.jpg [grid]
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); s=float(sys.argv[7]); out=sys.argv[8]
grid=int(sys.argv[9]) if len(sys.argv)>9 else 0
def c(im):
    im=im[y0:y1,x0:x1].copy()
    im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>=2 else cv2.INTER_AREA)
    if grid:
        for gx in range((x0//grid+1)*grid,x1,grid):
            X=int((gx-x0)*s); cv2.line(im,(X,0),(X,im.shape[0]),(0,0,255) if gx%(grid*5)==0 else (0,120,255),1)
            cv2.putText(im,str(gx),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
        for gy in range((y0//grid+1)*grid,y1,grid):
            Y=int((gy-y0)*s); cv2.line(im,(0,Y),(im.shape[1],Y),(0,0,255) if gy%(grid*5)==0 else (0,120,255),1)
            cv2.putText(im,str(gy),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
    return im
A=c(a);B=c(b)
sep=np.full((A.shape[0],6,3),(0,0,200),np.uint8)
cv2.imwrite(out,np.hstack([A,sep,B]),[cv2.IMWRITE_JPEG_QUALITY,90])
