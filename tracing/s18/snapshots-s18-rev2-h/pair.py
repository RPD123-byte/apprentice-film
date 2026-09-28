import cv2, numpy as np, sys
# pair.py n x0 y0 x1 y1 [scale] [dir] [tag]  (render top/left, source bottom/right)
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
d=sys.argv[7] if len(sys.argv)>7 else 'fwd'; tag=sys.argv[8] if len(sys.argv)>8 else ''
r=cv2.imread('s18-rev2-h/%s/r%d.png'%(d,n)); s=cv2.imread('s18-rev2-src/f%04d.png'%n)
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_NEAREST); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_NEAREST)
if (x1-x0)>(y1-y0)*1.3: out=np.vstack([a,np.full((6,a.shape[1],3),(0,0,255),np.uint8),b])
else: out=np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b])
cv2.putText(out,'R %d'%n,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2)
p='s18-rev2-pairs/%sp%d_%d_%d_%d_%d.jpg'%(tag,n,x0,y0,x1,y1); cv2.imwrite(p,out,[cv2.IMWRITE_JPEG_QUALITY,90]); print(p)
