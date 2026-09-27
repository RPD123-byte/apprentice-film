# gridpair.py T x0 y0 x1 y1 out [renderpng]: source (and optional render) crop with a 50px grid labelled in frame px
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
def grid(f):
    f=f.copy()
    for x in range(0,f.shape[1],50):
        cv2.line(f,(x,0),(x,f.shape[0]),(0,200,255) if x%100 else (0,0,255),1)
        if x%100==0: cv2.putText(f,str(x),(x+2,y0+14),0,0.5,(0,255,255),1)
    for y in range(0,f.shape[0],50):
        cv2.line(f,(0,y),(f.shape[1],y),(0,200,255) if y%100 else (0,0,255),1)
        if y%100==0: cv2.putText(f,str(y),(x0+2,y-3),0,0.5,(0,255,255),1)
    return f[y0:y1,x0:x1]
ims=[grid(f)]
if len(sys.argv)>7: ims.insert(0,grid(cv2.imread(sys.argv[7])))
cv2.imwrite(out,np.hstack(ims),[cv2.IMWRITE_JPEG_QUALITY,90])
