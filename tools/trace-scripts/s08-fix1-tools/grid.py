# grid.py img x0 y0 x1 y1 scale out [step]
import cv2,sys
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]; st=int(sys.argv[8]) if len(sys.argv)>8 else 20
c=im[y0:y1,x0:x1].copy(); c=cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
  X=int((x-x0)*s); col=(0,255,255) if x%100==0 else (0,110,110); cv2.line(c,(X,0),(X,c.shape[0]),col,1)
  if x%100==0: cv2.putText(c,str(x),(X+2,12),0,0.45,(0,255,0),1)
for y in range((y0//st+1)*st,y1,st):
  Y=int((y-y0)*s); col=(0,255,255) if y%100==0 else (0,110,110); cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
  if y%100==0: cv2.putText(c,str(y),(2,Y+12),0,0.45,(0,255,0),1)
cv2.imwrite(out,c)
