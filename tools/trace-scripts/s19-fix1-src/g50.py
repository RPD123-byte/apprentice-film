# g50.py T x0 y0 x1 y1 out [render.png]: 1:1 crop, 50px grid, every line labelled with its frame coordinate
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
def grid(f):
    f=f[y0:y1,x0:x1].copy()
    for x in range((x0//50+1)*50,x1,50):
        cv2.line(f,(x-x0,0),(x-x0,y1-y0),(0,0,255) if x%100==0 else (0,180,255),1)
        cv2.putText(f,str(x),(x-x0+2,12),0,0.4,(0,255,255),1)
    for y in range((y0//50+1)*50,y1,50):
        cv2.line(f,(0,y-y0),(x1-x0,y-y0),(0,0,255) if y%100==0 else (0,180,255),1)
        cv2.putText(f,str(y),(2,y-y0-2),0,0.4,(0,255,255),1)
    return f
ims=[grid(f)]
if len(sys.argv)>7: ims.insert(0,grid(cv2.imread(sys.argv[7])))
cv2.imwrite(out,np.hstack(ims),[cv2.IMWRITE_JPEG_QUALITY,90])
