#!/usr/bin/env python3
# ugrid.py out.jpg "t:hx,hy,s[,half]" ...  source crop centred on the head (hx,hy) with a grid in owl units (100 = head r)
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
out=sys.argv[1]; c=cv2.VideoCapture(V); tiles=[]
for spec in sys.argv[2:]:
    t,b=spec.split(':'); t=float(t); v=[float(q) for q in b.split(',')]
    hx,hy,s=v[:3]; half=int(v[3]) if len(v)>3 else 160
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
    f=cv2.copyMakeBorder(f,300,300,300,300,cv2.BORDER_CONSTANT)
    x0=int(hx-half)+300; y0=int(hy-half)+300
    z=3.0
    im=cv2.resize(f[y0:y0+2*half,x0:x0+2*half],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    ox=(hx-(x0-300))*z; oy=(hy-(y0-300))*z
    for u in range(-600,601,50):
        X=int(ox+u*s*z); Y=int(oy+u*s*z)
        col=(0,0,255) if u==0 else ((0,180,255) if u%100==0 else (0,90,140))
        if 0<=X<im.shape[1]: cv2.line(im,(X,0),(X,im.shape[0]),col,1)
        if 0<=Y<im.shape[0]: cv2.line(im,(0,Y),(im.shape[1],Y),col,1)
        if u%100==0:
            if 0<=X<im.shape[1]: cv2.putText(im,str(u),(X+2,14),0,0.45,(0,255,255),1)
            if 0<=Y<im.shape[0]: cv2.putText(im,str(u),(2,Y-3),0,0.45,(0,255,255),1)
    cv2.putText(im,f'{t:.2f}',(im.shape[1]-80,im.shape[0]-10),0,0.7,(0,255,255),2)
    tiles.append(im)
cols=2 if len(tiles)>1 else 1
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
tiles=[np.pad(t,((0,H-t.shape[0]+4),(0,W-t.shape[1]+4),(0,0))) for t in tiles]
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
