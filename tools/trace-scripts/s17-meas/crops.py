# side-by-side crops (render | source) from a compare.sh output dir
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')]; out=sys.argv[3]; z=float(sys.argv[4]) if len(sys.argv)>4 else 1
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f); b=cv2.imread(f.replace('frame-','ref-'))
    a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
    if z!=1: a=cv2.resize(a,None,fx=z,fy=z); b=cv2.resize(b,None,fx=z,fy=z)
    r=np.hstack([a,np.full((a.shape[0],4,3),128,np.uint8),b]); cv2.putText(r,t,(6,20),0,0.6,(0,255,0),2); rows.append(r)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
