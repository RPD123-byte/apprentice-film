# crop.py OUT f x0 y0 x1 y1 [renderdir...] : render|source crop of frame f (render png located by time f/25 search)
import cv2, numpy as np, glob, re, sys, math
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; f=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); dirs=sys.argv[7:]
cap=cv2.VideoCapture(SRC); cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,s=cap.read()
r=None
for d in dirs:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1))
        if abs(t*25-f)<0.3: r=cv2.imread(p)
if r is None: sys.exit('no render for f%d'%f)
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
sep=np.full((a.shape[0],6,3),(0,0,255),np.uint8)
im=np.hstack([a,sep,b])
if im.shape[1]>2000: im=cv2.resize(im,(2000,int(im.shape[0]*2000/im.shape[1])))
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
