# pair.py OUT dirA,dirB,... frames x0 y0 x1 y1 [scale]  -> rows per frame: SRC | dirA | dirB ...
import cv2, numpy as np, sys
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
out=sys.argv[1]; dirs=sys.argv[2].split(','); fr=[int(v) for v in sys.argv[3].split(',')]
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
rows=[]
for f in fr:
    ims=[cv2.imread(f'{M}/src_{f:05d}.png')]+[cv2.imread(f'{d}/{f}.png') for d in dirs]
    ims=[(i if i is not None else np.zeros((946,2206,3),np.uint8))[y0:y1,x0:x1] for i in ims]
    rows.append(np.hstack(ims))
im=np.vstack(rows)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
