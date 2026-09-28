# crop.py k x0 y0 x1 y1 scale out [run]  -> render (top) | source (bottom) crop, upscaled
import cv2,numpy as np,sys
k,x0,y0,x1,y1=map(int,sys.argv[1:6]); sc=float(sys.argv[6]); out=sys.argv[7]; run=sys.argv[8] if len(sys.argv)>8 else 'run1'
D='snapshots/s07-rev2-h/'
a=cv2.imread(D+run+'/f-%.2f.png'%(k/25)); b=cv2.imread(D+'src/s%04d.png'%k)
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
ca=cv2.resize(ca,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA); cb=cv2.resize(cb,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA)
def lab(im,t):
    im=im.copy(); cv2.putText(im,t,(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,0,255),2); return im
horiz = (x1-x0) < (y1-y0)
sep=np.full((6,ca.shape[1],3),(0,0,255),np.uint8) if not horiz else np.full((ca.shape[0],6,3),(0,0,255),np.uint8)
im=(np.vstack if not horiz else np.hstack)([lab(ca,'render f%d'%k),sep,lab(cb,'source f%d'%k)])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92]); print(out,im.shape)
