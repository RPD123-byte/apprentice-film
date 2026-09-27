import cv2,numpy as np,sys
src=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]); step=int(sys.argv[8]) if len(sys.argv)>8 else 10
M=60
a=np.load(src) if src.endswith('.npy') else None
im=(np.clip(a,0,1)*255).astype(np.uint8)[M+y0:M+y1,M+x0:M+x1] if a is not None else cv2.imread(src,0)[y0:y1,x0:x1]
c=cv2.cvtColor(cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC),cv2.COLOR_GRAY2BGR)
for x in range(x0-x0%step+step,x1,step):
  X=int((x-x0)*sc); col=(0,0,255) if x%50==0 else (0,110,180); cv2.line(c,(X,0),(X,c.shape[0]),col,1)
  if x%50==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range(y0-y0%step+step,y1,step):
  Y=int((y-y0)*sc); col=(0,0,255) if y%50==0 else (0,110,180); cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
  if y%50==0: cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,c)
