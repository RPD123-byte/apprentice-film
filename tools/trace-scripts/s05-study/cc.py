# crop compare: cc.py DIR IDX x0 y0 x1 y1 Z out.jpg  -> render crop | source crop (vertical stack if wide)
import cv2, numpy as np, sys, glob
d,idx=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; Z=float(sys.argv[7]); out=sys.argv[8]
fr=cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0]); rf=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0])
a=cv2.resize(fr[y0:y1,x0:x1],None,fx=Z,fy=Z); b=cv2.resize(rf[y0:y1,x0:x1],None,fx=Z,fy=Z)
img=np.vstack([a,b]) if (x1-x0)>(y1-y0)*1.3 else np.hstack([a,b])
cv2.imwrite(out,img,[cv2.IMWRITE_JPEG_QUALITY,88])
