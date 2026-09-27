# render|source metrics using the source frame the render actually shows (the snapshot tool floors t*25; its own
# reference image is the ceil frame, so pairs can be one frame apart)
import cv2, glob, re, sys, math, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; crop=[int(v) for v in sys.argv[2].split(',')] if len(sys.argv)>2 else None; z=float(sys.argv[3]) if len(sys.argv)>3 else 0.7
c=cv2.VideoCapture(V)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); k=math.floor(t*25)
    c.set(cv2.CAP_PROP_POS_FRAMES,k); ok,src=c.read()
    ren=cv2.imread(f)
    a=cv2.cvtColor(ren,cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY).astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    full=np.abs(ab-bb).mean(); owl=np.abs(ab-bb)[280:600,330:930].mean()
    print(f"{t:6.2f} (frame {k/25:.2f}) blurMAE full {full:5.1f}  owl-region {owl:5.1f}   mean render {a.mean():5.1f} src {b.mean():5.1f}")
    if crop:
        x0,y0,x1,y1=crop
        A=cv2.resize(ren[y0:y1,x0:x1],None,fx=z,fy=z); B=cv2.resize(src[y0:y1,x0:x1],None,fx=z,fy=z)
        r=np.hstack([A,np.full((A.shape[0],4,3),128,np.uint8),B]); cv2.putText(r,f"{k/25:.2f}",(6,20),0,0.6,(0,255,0),2); rows.append(r)
if rows: cv2.imwrite(d+'/crops-own.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
