# zoomed crop of an image (png or npy) with a labelled grid every STEP px (labels = frame px). study only
import cv2, numpy as np, sys
src,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; z=float(sys.argv[7]) if len(sys.argv)>7 else 2; step=int(sys.argv[8]) if len(sys.argv)>8 else 25
im=np.load(src) if src.endswith('.npy') else cv2.imread(src,0)
im=np.clip(im,0,255).astype(np.uint8)
c=cv2.resize(im[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
c=cv2.cvtColor(c,cv2.COLOR_GRAY2BGR)
for x in range((x0//step+1)*step,x1,step):
    X=int((x-x0)*z); col=(0,0,255) if x%100==0 else (0,170,255)
    cv2.line(c,(X,0),(X,c.shape[0]),col,1)
    if x%50==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//step+1)*step,y1,step):
    Y=int((y-y0)*z); col=(0,0,255) if y%100==0 else (0,170,255)
    cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
    if y%50==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
