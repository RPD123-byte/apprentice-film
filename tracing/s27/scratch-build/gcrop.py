# usage: gcrop.py dir idx x0 y0 x1 y1 out [step]  -> render | source side by side, both with a labelled grid in frame px
import cv2, glob, sys, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out=sys.argv[7]; st=int(sys.argv[8]) if len(sys.argv)>8 else 100
fr = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0]); rf = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0])
def g(im):
    a=im[y0:y1,x0:x1].copy()
    for x in range((x0//st+1)*st,x1,st):
        cv2.line(a,(x-x0,0),(x-x0,a.shape[0]),(0,220,0),1); cv2.putText(a,str(x),(x-x0+2,14),0,0.45,(0,255,0),1)
    for y in range((y0//st+1)*st,y1,st):
        cv2.line(a,(0,y-y0),(a.shape[1],y-y0),(0,220,0),1); cv2.putText(a,str(y),(2,y-y0-3),0,0.45,(0,255,0),1)
    return a
im=(np.vstack([g(fr),np.full((6,x1-x0,3),(0,255,255),np.uint8),g(rf)]) if "--v" in sys.argv else np.hstack([g(fr),np.full((y1-y0,6,3),(0,255,255),np.uint8),g(rf)]))
mw=1900
if im.shape[1]>mw: im=cv2.resize(im,(mw,int(im.shape[0]*mw/im.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(out,im.shape)
