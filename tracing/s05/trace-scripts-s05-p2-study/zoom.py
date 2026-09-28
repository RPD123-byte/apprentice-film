# zoom.py img x0 y0 x1 y1 scale out [grid]
import cv2,sys
a=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); g=int(sys.argv[8]) if len(sys.argv)>8 else 20
c=cv2.resize(a[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for x in range(x0 - x0%g + g, x1, g):
  X=int((x-x0)*s); cv2.line(c,(X,0),(X,6 if x%100 else 16),(0,0,255),1)
  if x%100==0: cv2.putText(c,str(x),(X+2,28),0,0.5,(0,0,255),1)
for y in range(y0 - y0%g + g, y1, g):
  Y=int((y-y0)*s); cv2.line(c,(0,Y),(6 if y%100 else 16,Y),(0,0,255),1)
  if y%100==0: cv2.putText(c,str(y),(18,Y+5),0,0.5,(0,0,255),1)
cv2.imwrite(sys.argv[7],c)
