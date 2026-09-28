# sbs.py k rdir x0 y0 x1 y1 scale out  : render | source crop side by side
import cv2, numpy as np, sys
k=int(sys.argv[1]); rd=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
R=cv2.imread(f'{rd}/r{k:03d}.png')[y0:y1,x0:x1]; S=cv2.imread(f'src/f{k:03d}.png')[y0:y1,x0:x1]
im=np.hstack([R,np.full((R.shape[0],4,3),(0,0,255),np.uint8),S])
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
