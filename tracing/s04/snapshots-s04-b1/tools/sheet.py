# sheet.py DIR out.jpg T1,T2,... [w] [x0 y0 x1 y1]: rows of (render | source) at width w each
import cv2, sys, numpy as np
d,out,ts=sys.argv[1],sys.argv[2],sys.argv[3].split(','); w=int(sys.argv[4]) if len(sys.argv)>4 else 700
roi=[int(v) for v in sys.argv[5:9]] if len(sys.argv)>8 else None
rows=[]
for t in ts:
    t=f"{float(t):.2f}"; a=cv2.imread(f"{d}/r-{t}.png"); b=cv2.imread(f"{d}/src-{t}.png")
    if roi: a=a[roi[1]:roi[3],roi[0]:roi[2]]; b=b[roi[1]:roi[3],roi[0]:roi[2]]
    h=int(a.shape[0]*w/a.shape[1]); a=cv2.resize(a,(w,h),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(w,h),interpolation=cv2.INTER_AREA)
    cv2.putText(a,t,(6,20),0,0.6,(0,255,255),2)
    rows.append(np.hstack([a,np.full((h,4,3),(0,0,255),np.uint8),b]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
