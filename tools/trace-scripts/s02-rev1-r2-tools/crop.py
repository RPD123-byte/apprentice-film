import cv2, sys, numpy as np, glob, re
# crop.py dir t x0 y0 x1 y1 out [scale] [v]
d,t=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
vert=len(sys.argv)>9 and sys.argv[9]=='v'
f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-t)<1e-3][0]
a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
if vert: s=np.vstack([a,np.full((4,a.shape[1],3),(0,0,255),np.uint8),b])
else: s=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
if sc!=1: s=cv2.resize(s,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,s,[cv2.IMWRITE_JPEG_QUALITY,92])
