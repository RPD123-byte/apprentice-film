import cv2,numpy as np,sys
# gridcrop.py x0 y0 x1 y1 scale out [src=T|path]
x0,y0,x1,y1=map(int,sys.argv[1:5]); s=float(sys.argv[5]); out=sys.argv[6]
src=sys.argv[7] if len(sys.argv)>7 else 'T'
if src=='T': g=np.clip(np.load('../s07-p2-dev/w/T.npy')*255,0,255).astype(np.uint8)
else: g=cv2.imread(src)
c=cv2.resize(g[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for x in range((x0//10+1)*10,x1,10):
  X=int((x-x0)*s); col=(0,0,255) if x%50==0 else (0,160,0)
  cv2.line(c,(X,0),(X,c.shape[0]),col,1)
  if x%50==0: cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
for y in range((y0//10+1)*10,y1,10):
  Y=int((y-y0)*s); col=(0,0,255) if y%50==0 else (0,160,0)
  cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
  if y%50==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
cv2.imwrite(out,c)
