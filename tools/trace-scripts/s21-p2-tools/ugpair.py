#!/usr/bin/env python3
# ugpair.py DIR out.jpg [s] [half]: render|source crops on a head-centred owl-unit grid (origin = my head centre)
import cv2, glob, re, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-p2-tools')
from crop import centre
d=sys.argv[1]; out=sys.argv[2]
def scale(t):
    if t<71.98: return 0.30
    if t<73.02: return 0.30+0.03*min(1,max(0,(t-72.0)/0.9))
    return 0.34
def grid(im,hx,hy,s,half,z,t,lab):
    f=cv2.copyMakeBorder(im,300,300,300,300,cv2.BORDER_CONSTANT)
    x0=int(hx-half)+300; y0=int(hy-half*0.8)+300
    c=cv2.resize(f[y0:y0+int(1.8*half),x0:x0+2*half],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    ox=(hx-(x0-300))*z; oy=(hy-(y0-300))*z
    for u in range(-600,601,50):
        X=int(ox+u*s*z); Y=int(oy+u*s*z)
        col=(0,0,255) if u==0 else ((0,170,255) if u%100==0 else (0,80,120))
        if 0<=X<c.shape[1]: cv2.line(c,(X,0),(X,c.shape[0]),col,1)
        if 0<=Y<c.shape[0]: cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
        if u%100==0:
            if 0<=X<c.shape[1]: cv2.putText(c,str(u),(X+2,12),0,0.4,(0,255,255),1)
            if 0<=Y<c.shape[0]: cv2.putText(c,str(u),(2,Y-2),0,0.4,(0,255,255),1)
    cv2.putText(c,f'{lab} {t:.3f}',(c.shape[1]-120,c.shape[0]-8),0,0.6,(0,255,255),2)
    return c
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    hx,hy=centre(t)
    s=scale(t); half=int(float(sys.argv[4])) if len(sys.argv)>4 else (130 if t<71.98 else 170); z=min(3.0,560/(2*half))
    a=grid(cv2.imread(f),hx,hy,s,half,z,t,'R'); b=grid(cv2.imread(f.replace('frame-','ref-')),hx,hy,s,half,z,t,'S')
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b]))
W=max(r.shape[1] for r in rows)
rows=[np.pad(r,((0,4),(0,W-r.shape[1]),(0,0))) for r in rows]
outs=[];cur=[];hh=0
for r in rows:
    if hh+r.shape[0]>2000 and cur: outs.append(np.vstack(cur)); cur=[]; hh=0
    cur.append(r); hh+=r.shape[0]
if cur: outs.append(np.vstack(cur))
for i,o in enumerate(outs):
    p=out.replace('.jpg',f'-{i}.jpg'); cv2.imwrite(p,o,[cv2.IMWRITE_JPEG_QUALITY,88]); print(p)
