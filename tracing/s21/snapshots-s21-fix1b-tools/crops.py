# crops.py DIR x0 y0 x1 y1 [scale] -> DIR/crop-*.jpg (render | source), plus DIR/crops.jpg mosaic
import cv2, glob, sys, re, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]) if len(sys.argv)>6 else 3
auto = x0<0
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    r=f.replace('frame-','ref-'); a=cv2.imread(f); b=cv2.imread(r)
    if b.shape!=a.shape: b=cv2.resize(b,(a.shape[1],a.shape[0]))
    ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
    im=np.hstack([ca,np.full((ca.shape[0],4,3),128,np.uint8),cb])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    t=re.search(r'at-([\d.]+)s',f).group(1)
    cv2.putText(im,t,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)
    cv2.imwrite(f"{d}/crop-{t}.jpg",im,[cv2.IMWRITE_JPEG_QUALITY,90]); rows.append(im)
