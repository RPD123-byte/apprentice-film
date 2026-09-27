import cv2,numpy as np,sys
# crop.py rd k x0 y0 x1 y1 out [scale]
rd,k,x0,y0,x1,y1,out=sys.argv[1],int(sys.argv[2]),*map(int,sys.argv[3:7]),sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
a=cv2.imread(f'{rd}/r{k}.png')[y0:y1,x0:x1]; b=cv2.imread(f'snapshots/s08-f3-src/f{k}.png')[y0:y1,x0:x1]
im=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
cv2.imwrite(out,im)
