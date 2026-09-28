import cv2, sys, numpy as np
r=cv2.imread(sys.argv[1]); f=cv2.imread(sys.argv[2])
x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]; out=sys.argv[7]; mw=int(sys.argv[8]) if len(sys.argv)>8 else 1900
a=r[y0:y1,x0:x1]; b=f[y0:y1,x0:x1]
vert = (x1-x0) > 1.6*(y1-y0)
im=np.vstack([a,np.full((6,a.shape[1],3),(0,0,255),np.uint8),b]) if vert else np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b])
if im.shape[1]>mw: im=cv2.resize(im,(mw,int(im.shape[0]*mw/im.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
