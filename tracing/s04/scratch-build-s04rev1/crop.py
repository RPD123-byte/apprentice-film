import cv2, sys, numpy as np, glob
# usage: crop.py dir idx x0 y0 x1 y1 out [scale] [v]
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out=sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv)>8 else 1.0
vert = len(sys.argv)>9 and sys.argv[9]=='v'
f = glob.glob(f'{d}/frame-{idx}-*.png')[0]; r = glob.glob(f'{d}/ref-{idx}-*.png')[0]
a = cv2.imread(f); b = cv2.imread(r)
A = a[y0:y1,x0:x1]; B = b[y0:y1,x0:x1]
sep = np.full((A.shape[0],6,3),(0,0,255),np.uint8) if not vert else np.full((6,A.shape[1],3),(0,0,255),np.uint8)
im = np.hstack([A,sep,B]) if not vert else np.vstack([A,sep,B])
if sc!=1: im = cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_NEAREST)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 92]); print(out, im.shape)
