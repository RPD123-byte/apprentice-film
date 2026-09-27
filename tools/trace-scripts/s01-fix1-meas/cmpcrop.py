# cmpcrop.py DIR IDX x0 y0 x1 y1 out.jpg [zoom]  -> render (top) vs source (bottom) crop, frame coordinates
import sys, cv2, glob, numpy as np
d, idx = sys.argv[1], int(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]; Z=float(sys.argv[8]) if len(sys.argv)>8 else 1
fr=cv2.imread(sorted(glob.glob(f"{d}/frame-{idx:02d}-*.png"))[0]); rf=cv2.imread(sorted(glob.glob(f"{d}/ref-{idx:02d}-*.png"))[0])
a=fr[y0:y1,x0:x1]; b=rf[y0:y1,x0:x1]
im=np.vstack([a,np.full((4,a.shape[1],3),(0,0,255),np.uint8),b]) if (x1-x0)>(y1-y0)*1.3 else np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
if Z!=1: im=cv2.resize(im,None,fx=Z,fy=Z,interpolation=cv2.INTER_AREA if Z<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
