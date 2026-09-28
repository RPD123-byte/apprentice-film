import cv2,sys,numpy as np
# crop.py rdir k x0 y0 x1 y1 scale out
rd=sys.argv[1]; k=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
r=cv2.imread(f'{rd}/r{k}.png')[y0:y1,x0:x1]; s=cv2.imread(f'snapshots/s08-p4-src/f{k}.png')[y0:y1,x0:x1]
ip=cv2.INTER_NEAREST if sc>=2 else (cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
r=cv2.resize(r,None,fx=sc,fy=sc,interpolation=ip); s=cv2.resize(s,None,fx=sc,fy=sc,interpolation=ip)
sep=np.full((6,r.shape[1],3),255,np.uint8)
cv2.imwrite(out,np.vstack([r,sep,s]),[cv2.IMWRITE_JPEG_QUALITY,92])
