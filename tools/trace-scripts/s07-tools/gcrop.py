# grid crop of the source (or any image) : gcrop.py T|img.png x0 y0 x1 y1 scale out [step]
import cv2, sys
src=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=float(sys.argv[6]); out=sys.argv[7]; step=int(sys.argv[8]) if len(sys.argv)>8 else 25
if src.endswith('.png') or src.endswith('.jpg'): f=cv2.imread(src)
else:
  c=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); c.set(1,int(round(float(src)*25))); ok,f=c.read()
g=f[y0:y1,x0:x1].copy(); g=cv2.resize(g,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC if s>1 else cv2.INTER_AREA)
for x in range((x0//step+1)*step,x1,step):
  X=int((x-x0)*s); cv2.line(g,(X,0),(X,g.shape[0]),(0,200,255) if x%100 else (0,0,255),1)
  if x%(step*2)==0: cv2.putText(g,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
  Y=int((y-y0)*s); cv2.line(g,(0,Y),(g.shape[1],Y),(0,200,255) if y%100 else (0,0,255),1)
  if y%(step*2)==0: cv2.putText(g,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,g)
