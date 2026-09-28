# crop.py DIR TIME x0 y0 x1 y1 out.jpg [width]  -> render crop above/left of reference crop
import cv2, sys, glob, numpy as np
d,t=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; w=int(sys.argv[8]) if len(sys.argv)>8 else 1800
f=glob.glob(f'{d}/frame-*-at-{t}s.png'); r=glob.glob(f'{d}/ref-*-at-{t}s.png')
if not r: r=glob.glob(f'{d}/reference-*-at-{t}s.png')
if not f or not r: print('missing',f,r, sorted(glob.glob(d+'/*'))[:5]); sys.exit(1)
A=cv2.imread(f[0]); B=cv2.imread(r[0])
if B.shape!=A.shape: B=cv2.resize(B,(A.shape[1],A.shape[0]))
a=A[y0:y1,x0:x1]; b=B[y0:y1,x0:x1]
horiz=(x1-x0)<(y1-y0)*1.3
im=np.hstack([a,np.full((a.shape[0],6,3),255,np.uint8),b]) if horiz else np.vstack([a,np.full((6,a.shape[1],3),255,np.uint8),b])
s=w/im.shape[1]; im=cv2.resize(im,(w,int(im.shape[0]*s)),interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,im.shape)
