# crop with coordinate ticks on the border only (every 50 px, labels every 100)
import cv2,sys,numpy as np
f=cv2.imread(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; k=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
c=cv2.resize(f[y0:y1,x0:x1],None,fx=k,fy=k,interpolation=cv2.INTER_AREA if k<1 else cv2.INTER_CUBIC)
P=24
out=np.zeros((c.shape[0]+2*P,c.shape[1]+2*P,3),np.uint8); out[P:-P,P:-P]=c
for x in range((x0//25+1)*25,x1,25):
    X=int((x-x0)*k)+P; L=10 if x%100==0 else (6 if x%50==0 else 3)
    cv2.line(out,(X,P-L),(X,P),(0,255,255),1); cv2.line(out,(X,out.shape[0]-P),(X,out.shape[0]-P+L),(0,255,255),1)
    if x%100==0: cv2.putText(out,str(x),(X-14,10),0,0.35,(0,255,255),1)
for y in range((y0//25+1)*25,y1,25):
    Y=int((y-y0)*k)+P; L=10 if y%100==0 else (6 if y%50==0 else 3)
    cv2.line(out,(P-L,Y),(P,Y),(0,255,255),1); cv2.line(out,(out.shape[1]-P,Y),(out.shape[1]-P+L,Y),(0,255,255),1)
    if y%100==0: cv2.putText(out,str(y),(0,Y-2),0,0.3,(0,255,255),1)
cv2.imwrite(sys.argv[6],out,[cv2.IMWRITE_JPEG_QUALITY,90])
