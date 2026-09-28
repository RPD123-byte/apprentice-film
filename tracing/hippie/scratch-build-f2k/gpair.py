import cv2, numpy as np, sys
# gpair.py render ref x0 y0 x1 y1 out [scale] [step]  -> render over source (vertical), gridded with frame labels
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
s=float(sys.argv[8]) if len(sys.argv)>8 else 2.0
st=int(sys.argv[9]) if len(sys.argv)>9 else 50
def g(im):
  c=cv2.resize(im[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
  for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*s); cv2.line(c,(X,0),(X,c.shape[0]),(0,200,255) if x%100 else (0,0,255),1); cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
  for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*s); cv2.line(c,(0,Y),(c.shape[1],Y),(0,200,255) if y%100 else (0,0,255),1); cv2.putText(c,str(y),(2,Y-3),0,0.4,(0,255,255),1)
  return c
A=g(a); B=g(b)
horiz=len(sys.argv)>10 and sys.argv[10]=='h'
if horiz: im=np.hstack([A,np.full((A.shape[0],6,3),255,np.uint8),B])
else: im=np.vstack([A,np.full((6,A.shape[1],3),255,np.uint8),B])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
