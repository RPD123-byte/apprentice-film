# pair.py render.png T out.jpg [x0 y0 x1 y1] [--scale k] [--blend]  -> render | source (| 50% blend) crops
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
a=sys.argv[1:]; blend='--blend' in a; a=[x for x in a if x!='--blend']
sc=1.0
if '--scale' in a: i=a.index('--scale'); sc=float(a[i+1]); del a[i:i+2]
r=cv2.imread(a[0]); t=float(a[1]); out=a[2]
c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,s=c.read()
if len(a)>=7: x0,y0,x1,y1=map(int,a[3:7]); r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
tiles=[r,s]
if blend: tiles.append(cv2.addWeighted(r,0.5,s,0.5,0))
im=np.hstack(tiles)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
# metrics
g1=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
g2=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
print(f"{out}: blurred MAE {np.abs(g1-g2).mean():.1f}  mean r {g1.mean():.1f} s {g2.mean():.1f}")
