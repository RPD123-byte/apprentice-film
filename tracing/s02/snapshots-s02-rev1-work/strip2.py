# strip2.py OUT dir x0 y0 x1 y1 f1,f2,... [--w W]: rows of render|source crops for listed frames
import cv2, numpy as np, glob, re, sys, math
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; dirs=sys.argv[2].split(','); x0,y0,x1,y1=map(int,sys.argv[3:7]); fs=[int(v) for v in sys.argv[7].split(',')]
W=int(sys.argv[8]) if len(sys.argv)>8 else 1800
cap=cv2.VideoCapture(SRC)
R={}
for d in dirs:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); R[math.floor(t*25+0.5)]=p
rows=[]
for f in fs:
    cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,s=cap.read()
    r=cv2.imread(R[f]) if f in R else np.zeros_like(s)
    a=r[y0:y1,x0:x1].copy(); b=s[y0:y1,x0:x1].copy()
    cv2.putText(a,f'R {f} {f/25:.2f}',(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
    cv2.putText(b,f'S {f}',(8,24),cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,0,255),2)
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b]))
    rows.append(np.full((3,rows[-1].shape[1],3),(0,0,255),np.uint8))
im=np.vstack(rows)
sc=W/im.shape[1]
if sc<1: im=cv2.resize(im,(W,int(im.shape[0]*sc)))
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
