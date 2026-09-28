# crop.py dir k x0 y0 x1 y1 out.jpg [scale] [--v]  : render | source crop side by side (or stacked with --v); grid every 50px
import cv2,numpy as np,sys
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24fix1'
d,k=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
vert='--v' in sys.argv; grid='--g' in sys.argv
imgs=[]
for fn in ([d+'/k%02d.png'%k] if d!='-' else [])+[SP+'/src/f%04d.png'%(2420+k)]:
  a=cv2.imread(fn)[y0:y1,x0:x1].copy()
  a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
  if grid:
    for x in range((x0//50+1)*50,x1,50):
      X=int((x-x0)*sc); cv2.line(a,(X,0),(X,a.shape[0]),(0,200,255) if x%100==0 else (0,110,160),1)
      if x%100==0: cv2.putText(a,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
      Y=int((y-y0)*sc); cv2.line(a,(0,Y),(a.shape[1],Y),(0,200,255) if y%100==0 else (0,110,160),1)
      if y%100==0: cv2.putText(a,str(y),(2,Y-2),0,0.4,(0,255,255),1)
  imgs.append(a)
p=np.vstack(imgs) if vert else np.hstack(imgs)
cv2.imwrite(out,p,[cv2.IMWRITE_JPEG_QUALITY,90])
