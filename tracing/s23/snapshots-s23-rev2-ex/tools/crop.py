#!/usr/bin/env python3
# crop.py DIR out.jpg x0 y0 x1 y1 k1,k2,... [scale] : rows of render|source crops for frames k (renders DIR/r%05d.png)
import sys,cv2,numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23rev2'
d,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); ks=[int(k) for k in sys.argv[7].split(',')]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
rows=[]
for k in ks:
    a=cv2.imread(f'{d}/r{k:05d}.png'); b=cv2.imread(f'{SP}/src/{k:05d}.png')
    ca=a[y0:y1,x0:x1]; cb=b[y0:y1,x0:x1]
    sep=np.full((ca.shape[0],6,3),(0,0,255),np.uint8)
    r=np.hstack([ca,sep,cb]); 
    cv2.putText(r,str(k),(8,28),cv2.FONT_HERSHEY_SIMPLEX,0.9,(0,255,255),2)
    rows.append(r); rows.append(np.full((4,r.shape[1],3),(0,0,255),np.uint8))
im=np.vstack(rows)
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88]); print(im.shape)
