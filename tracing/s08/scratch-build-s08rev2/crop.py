import cv2,numpy as np,sys
# usage: crop.py renderpng srcpng x0 y0 x1 y1 scale out [v]
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
vert=len(sys.argv)>9
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
it=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA
a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=it); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=it)
sep=np.full((6,a.shape[1],3),(0,0,255),np.uint8) if vert else np.full((a.shape[0],6,3),(0,0,255),np.uint8)
im=np.vstack([a,sep,b]) if vert else np.hstack([a,sep,b])
cv2.putText(im,'R',(5,20),0,0.7,(0,255,0),2)
cv2.imwrite(out,im)
