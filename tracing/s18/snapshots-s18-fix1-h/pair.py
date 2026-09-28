import cv2, numpy as np, sys
# pair.py DIR n x0 y0 x1 y1 [scale] [out] -> render | source crop
d=sys.argv[1]; n=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
out=sys.argv[8] if len(sys.argv)>8 else '../s18-fix1-pairs/%s_%d_%d_%d.jpg'%(d.replace('/','_'),n,x0,y0)
r=cv2.imread('%s/r%d.png'%(d,n)); s=cv2.imread('../s18-fix1-src/f%04d.png'%n)
A=r[y0:y1,x0:x1]; B=s[y0:y1,x0:x1]
if sc!=1: A=cv2.resize(A,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC); B=cv2.resize(B,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
if (x1-x0)>(y1-y0)*1.3: o=np.vstack([A,np.full((6,A.shape[1],3),(0,0,255),np.uint8),B])
else: o=np.hstack([A,np.full((A.shape[0],6,3),(0,0,255),np.uint8),B])
cv2.putText(o,'R %d'%n,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
import os; os.makedirs(os.path.dirname(out),exist_ok=True); cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
