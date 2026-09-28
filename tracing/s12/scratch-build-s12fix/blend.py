import cv2, numpy as np, sys
# red = render dark, green = source dark (both dark = black-ish... ) : shows misalignment
a=cv2.imread(sys.argv[1],0); b=cv2.imread(sys.argv[2],0)
x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
im=np.dstack([np.maximum(A,B)//1, B, A])  # BGR: blue=max, green=source, red=render
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
g=int(sys.argv[9]) if len(sys.argv)>9 else 20
for gx in range((x0//g+1)*g,x1,g):
    X=int((gx-x0)*sc); cv2.line(im,(X,0),(X,im.shape[0]),(90,90,90),1)
    if gx%(g*5)==0: cv2.putText(im,str(gx),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,0),1)
for gy in range((y0//g+1)*g,y1,g):
    Y=int((gy-y0)*sc); cv2.line(im,(0,Y),(im.shape[1],Y),(90,90,90),1)
    if gy%(g*5)==0: cv2.putText(im,str(gy),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,0),1)
cv2.imwrite(out,im)
