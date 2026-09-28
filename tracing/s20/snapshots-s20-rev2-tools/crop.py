# crop.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [--stack] : render | source crop side by side (or stacked)
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
if sc!=1: ca=cv2.resize(ca,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC); cb=cv2.resize(cb,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
def grid(im):
    im=im.copy(); h,w=im.shape[:2]
    for X in range((x0//50+1)*50,x1,50):
        px=int((X-x0)*sc); cv2.line(im,(px,0),(px,h),(0,0,255) if X%100==0 else (0,0,120),1)
        if X%100==0: cv2.putText(im,str(X),(px+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,255),1)
    for Y in range((y0//50+1)*50,y1,50):
        py=int((Y-y0)*sc); cv2.line(im,(0,py),(w,py),(0,0,255) if Y%100==0 else (0,0,120),1)
        if Y%100==0: cv2.putText(im,str(Y),(2,py-2),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,255),1)
    return im
if '--nogrid' not in sys.argv: ca,cb=grid(ca),grid(cb)
sep=np.full((6,ca.shape[1],3),(0,200,0),np.uint8) if '--stack' in sys.argv else np.full((ca.shape[0],6,3),(0,200,0),np.uint8)
im=np.vstack([ca,sep,cb]) if '--stack' in sys.argv else np.hstack([ca,sep,cb])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
