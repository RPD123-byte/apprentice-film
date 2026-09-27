# crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale] [--v]  : render crop | source crop
import cv2, glob, sys, numpy as np
d, idx = sys.argv[1], int(sys.argv[2]); x0,y0,x1,y1 = map(int, sys.argv[3:7]); out=sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
vert = '--v' in sys.argv
f = sorted(glob.glob(f'{d}/frame-{idx:02d}-*.png'))[0]; r = f.replace('/frame-','/ref-')
a = cv2.imread(f)[y0:y1,x0:x1]; b = cv2.imread(r)[y0:y1,x0:x1]
if sc!=1: a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
sep = np.full((a.shape[0],6,3),(0,0,255),np.uint8) if not vert else np.full((6,a.shape[1],3),(0,0,255),np.uint8)
im = np.hstack([a,sep,b]) if not vert else np.vstack([a,sep,b])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90]); print(out, im.shape)
