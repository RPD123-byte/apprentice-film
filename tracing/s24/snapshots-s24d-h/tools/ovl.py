# overlay: render (kNN.png) vs a reference (plate .npy in the same coords, or source frame); crop; 3 panels
import cv2,numpy as np,sys
ren=sys.argv[1]; ref=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
a=cv2.imread(ren,0).astype(np.float32)
b=np.load(ref) if ref.endswith('.npy') else cv2.imread(ref,0).astype(np.float32)
a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
ea=cv2.Canny(np.clip(a,0,255).astype(np.uint8),60,140)
o=cv2.cvtColor(np.clip(b,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR); o[ea>0]=(0,0,255)
p=np.hstack([cv2.cvtColor(np.clip(a,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR),cv2.cvtColor(np.clip(b,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR),o])
p=cv2.resize(p,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,p,[cv2.IMWRITE_JPEG_QUALITY,88])
