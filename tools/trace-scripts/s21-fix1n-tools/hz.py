#!/usr/bin/env python3
# hz.py DIR out.jpg [z] [hw] [hh] : head close-ups (R | S) round the head centre, frame-px ticks every 5 px
import cv2, glob, re, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools')
from crop import centre
d,out=sys.argv[1],sys.argv[2]; z=float(sys.argv[3]) if len(sys.argv)>3 else 6; hw=int(sys.argv[4]) if len(sys.argv)>4 else 45; hh=int(sys.argv[5]) if len(sys.argv)>5 else 38
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); hx,hy=centre(t)
    x0,y0=int(hx-hw),int(hy-hh); x1,y1=int(hx+hw),int(hy+hh)
    ims=[]
    for p in (f,f.replace('frame-','ref-')):
        im=cv2.copyMakeBorder(cv2.imread(p),100,100,100,100,cv2.BORDER_CONSTANT)
        c=cv2.resize(im[y0+100:y1+100,x0+100:x1+100],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
        for x in range((x0//5+1)*5,x1,5):
            X=int((x-x0)*z); L=14 if x%10==0 else 6; cv2.line(c,(X,0),(X,L),(0,255,255),1)
            if x%20==0: cv2.putText(c,str(x),(X+1,26),0,0.4,(0,255,255),1)
        for y in range((y0//5+1)*5,y1,5):
            Y=int((y-y0)*z); L=14 if y%10==0 else 6; cv2.line(c,(0,Y),(L,Y),(0,255,255),1)
            if y%20==0: cv2.putText(c,str(y),(16,Y+4),0,0.4,(0,255,255),1)
        # cross at my head centre
        X,Y=int((hx-x0)*z),int((hy-y0)*z); cv2.line(c,(X-6,Y),(X+6,Y),(0,0,255),1); cv2.line(c,(X,Y-6),(X,Y+6),(0,0,255),1)
        ims.append(c)
    cv2.putText(ims[0],f'R {t:.2f}',(ims[0].shape[1]-90,ims[0].shape[0]-8),0,0.55,(0,255,255),2)
    rows.append(np.hstack([ims[0],np.full((ims[0].shape[0],4,3),(0,0,255),np.uint8),ims[1]]))
W=max(r.shape[1] for r in rows)
rows=[np.pad(r,((0,4),(0,W-r.shape[1]),(0,0))) for r in rows]
outs=[];cur=[];hh2=0
for r in rows:
    if hh2+r.shape[0]>1900 and cur: outs.append(np.vstack(cur)); cur=[]; hh2=0
    cur.append(r); hh2+=r.shape[0]
if cur: outs.append(np.vstack(cur))
for i,o in enumerate(outs):
    p=out.replace('.jpg',f'-{i}.jpg'); cv2.imwrite(p,o,[cv2.IMWRITE_JPEG_QUALITY,88]); print(p)
