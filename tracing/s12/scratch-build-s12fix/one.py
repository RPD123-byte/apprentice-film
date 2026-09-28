import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]; grid=int(sys.argv[8]) if len(sys.argv)>8 else 0
im=a[y0:y1,x0:x1].copy(); im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
if grid:
    for gx in range((x0//grid+1)*grid,x1,grid):
        X=int((gx-x0)*s); cv2.line(im,(X,0),(X,im.shape[0]),(0,0,255) if gx%(grid*5)==0 else (0,140,255),1); cv2.putText(im,str(gx),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
    for gy in range((y0//grid+1)*grid,y1,grid):
        Y=int((gy-y0)*s); cv2.line(im,(0,Y),(im.shape[1],Y),(0,0,255) if gy%(grid*5)==0 else (0,140,255),1); cv2.putText(im,str(gy),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,200,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
