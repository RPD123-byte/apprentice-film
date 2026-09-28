import cv2,numpy as np,sys
# zoom.py IMG x0 y0 x1 y1 scale out [gamma] [grid]
p=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]; g=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
im=np.load(p) if p.endswith('.npy') else cv2.imread(p).astype(np.float32)
c=im[y0:y1,x0:x1]
c=255*np.clip(c/255,0,1)**g
c=cv2.resize(c.astype(np.uint8),None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
step=int(sys.argv[9]) if len(sys.argv)>9 else 0
if step:
  for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*s); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%(step*5)==0 else (0,0,140),1)
    if x%(step*5)==0: cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,255,255),1)
  for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*s); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%(step*5)==0 else (0,0,140),1)
    if y%(step*5)==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,92])
