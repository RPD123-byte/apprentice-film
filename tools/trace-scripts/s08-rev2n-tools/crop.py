import cv2, sys, numpy as np
f=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); out=sys.argv[7]
hz=len(sys.argv)>8 and sys.argv[8]=='h'
r=cv2.imread(f)[y0:y1,x0:x1]; s=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
ip=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA
r=cv2.resize(r,None,fx=sc,fy=sc,interpolation=ip); s=cv2.resize(s,None,fx=sc,fy=sc,interpolation=ip)
sep=np.full((r.shape[0],6,3),255,np.uint8) if hz else np.full((6,r.shape[1],3),255,np.uint8)
cv2.imwrite(out,np.hstack([r,sep,s]) if hz else np.vstack([r,sep,s]),[cv2.IMWRITE_JPEG_QUALITY,92])
