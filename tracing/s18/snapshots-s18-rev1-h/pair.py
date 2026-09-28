import cv2, numpy as np, sys
# pair.py n x0 y0 x1 y1 [scale] [dir] -> s18-rev1-pairs/p<n>_<x0>_<y0>.jpg  (render on top, source below)
n=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
d=sys.argv[7] if len(sys.argv)>7 else 'fwd'
r=cv2.imread('s18-rev1-h/%s/r%d.png'%(d,n)); s=cv2.imread('s18-rev1-src/f%04d.png'%n)
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
sep=np.full((6,a.shape[1],3),(0,0,255),np.uint8)
out=np.vstack([a,sep,b]) if (x1-x0)>(y1-y0)*1.3 else np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b])
cv2.putText(out,'R %d'%n,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
p='s18-rev1-pairs/p%d_%d_%d_%d_%d.jpg'%(n,x0,y0,x1,y1); cv2.imwrite(p,out,[cv2.IMWRITE_JPEG_QUALITY,90]); print(p)
