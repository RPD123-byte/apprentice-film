import cv2, sys, glob, re, numpy as np
# crop.py DIR x0 y0 x1 y1 out.jpg [scale]  -> stacks (render|source) crops for every frame in DIR
d,x0,y0,x1,y1,out=sys.argv[1],*map(int,sys.argv[2:6]),sys.argv[6]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    r=f.replace('frame-','ref-'); a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(r)[y0:y1,x0:x1]
    t=re.search(r'at-([\d.]+)s',f).group(1)
    row=np.hstack([a,np.full((a.shape[0],4,3),128,np.uint8),b])
    if sc!=1: row=cv2.resize(row,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    cv2.putText(row,t,(4,18),0,0.6,(0,255,255),1); rows.append(row)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
