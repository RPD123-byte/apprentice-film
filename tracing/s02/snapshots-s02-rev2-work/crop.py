# usage: crop.py f x0 y0 x1 y1 out [scale]  -> render|source crop (render from rev2 frames, or rendered png path via env)
import cv2, glob, re, sys, numpy as np
root='/Users/computer/rootline/apprentice-film/snapshots/'
f=int(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
rp=None
for d in ['s02-rev2-a','s02-rev2-b','s02-rev2-c','s02-rev2-d','s02-rev2-det1','s02-rev2-bnd']:
    for p in glob.glob(root+d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); tt=int(t*30)/30
        if int(tt*25+0.5)==f: rp=p
r=cv2.imread(rp); s=cv2.imread(root+'s02-fix1h-src/%04d.png'%f)
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
im=np.hstack([a,np.full((a.shape[0],6,3),(0,0,255),np.uint8),b])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(root+'s02-rev2-work/'+out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(rp, im.shape)
