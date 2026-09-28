import cv2, sys
# fgrid.py in.png out.jpg x0 y0 x1 y1 [zoom]
im=cv2.imread(sys.argv[1]); out=sys.argv[2]
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]) if len(sys.argv)>7 else 2
c=im[y0:y1,x0:x1].copy()
c=cv2.resize(c,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//20)*20,x1,20):
    if x<x0: continue
    X=int((x-x0)*z); col=(0,0,255) if x%100==0 else (0,140,200)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%100==0: cv2.putText(c,str(x),(X+2,14),0,0.5,(0,255,255),1)
for y in range((y0//20)*20,y1,20):
    if y<y0: continue
    Y=int((y-y0)*z); col=(0,0,255) if y%100==0 else (0,140,200)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%100==0: cv2.putText(c,str(y),(2,Y-3),0,0.5,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
