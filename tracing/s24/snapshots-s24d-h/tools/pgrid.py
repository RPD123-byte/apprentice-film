import cv2,sys,numpy as np
src=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; step=int(sys.argv[6]); sc=float(sys.argv[7]); out=sys.argv[8]
m=np.load(src) if src.endswith('.npy') else cv2.imread(src,0)
f=cv2.cvtColor(np.clip(m[y0:y1,x0:x1],0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step+1)*step,x1,step):
  X=int((x-x0)*sc); cv2.line(f,(X,0),(X,f.shape[0]),(0,160,255) if x%(step*4) else (0,0,255),1); cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
  Y=int((y-y0)*sc); cv2.line(f,(0,Y),(f.shape[1],Y),(0,160,255) if y%(step*4) else (0,0,255),1); cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,92])
