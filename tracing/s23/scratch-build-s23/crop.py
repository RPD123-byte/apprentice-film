# crop.py DIR x0 y0 x1 y1 [W] [out] -> side-by-side crops (render | source) stacked
import cv2, glob, sys, re, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); W=int(sys.argv[6]) if len(sys.argv)>6 else 900
out=sys.argv[7] if len(sys.argv)>7 else d+'/crops.jpg'
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    r=f.replace('frame-','ref-'); a=cv2.imread(f); b=cv2.imread(r)
    if a is None or b is None: continue
    ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
    h=int((y1-y0)*W/(x1-x0))
    ca=cv2.resize(ca,(W,h)); cb=cv2.resize(cb,(W,h))
    t=re.search(r'at-([\d.]+)s',f).group(1)
    cv2.putText(ca,t,(6,22),0,0.7,(0,255,255),2)
    rows.append(np.hstack([ca,np.full((h,6,3),80,np.uint8),cb]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(rows))
