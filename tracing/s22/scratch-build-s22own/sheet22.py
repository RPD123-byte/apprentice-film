# sheet22.py dir out.jpg W t:x0,y0,x1,y1 ...   -> rows of [render | source] crops, each scaled to width W
import cv2, glob, sys, numpy as np
d,out,W=sys.argv[1],sys.argv[2],int(sys.argv[3]); rows=[]
for spec in sys.argv[4:]:
    t,r=spec.split(':'); x0,y0,x1,y1=[int(v) for v in r.split(',')]
    fa=[f for f in glob.glob(f'{d}/frame-*-at-{t}s.png')]
    if not fa: print('missing',t); continue
    A=cv2.imread(fa[0])[y0:y1,x0:x1]; B=cv2.imread(fa[0].replace('frame-','ref-'))[y0:y1,x0:x1]
    s=W/A.shape[1]; A=cv2.resize(A,None,fx=s,fy=s,interpolation=cv2.INTER_AREA); B=cv2.resize(B,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
    cv2.putText(A,'R '+t,(4,16),0,0.5,(0,255,255),1); cv2.putText(B,'S '+t,(4,16),0,0.5,(0,255,255),1)
    rows.append(np.hstack([A,np.full((A.shape[0],4,3),90,np.uint8),B]))
w=max(r.shape[1] for r in rows)
rows=[np.hstack([r,np.zeros((r.shape[0],w-r.shape[1],3),np.uint8)]) for r in rows]
cv2.imwrite(out,np.vstack([np.vstack([r,np.full((4,w,3),90,np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out)
