import cv2,sys
f=cv2.imread(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; k=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
step=int(sys.argv[8]) if len(sys.argv)>8 else 50
c=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_AREA if k<1 else cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*k); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%100==0 else (0,160,255),1)
    if x%100==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*k); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%100==0 else (0,160,255),1)
    if y%100==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(sys.argv[6],c,[cv2.IMWRITE_JPEG_QUALITY,90])
