#!/usr/bin/env python3
# sil.py REF thr sx sy OUT [--below] [--sig=S] [--eps=E] [--box=x0,y0,x1,y1] [--open=R]: silhouette MEASUREMENT: the outline of
# the connected region of the blurred ungraded reference above (or below) thr that contains the seed (sx, sy), simplified by
# RDP (eps px) -> OUT.json [[x,y],...] + OUT.jpg overlay. (Outlines only, a few dozen points; nothing here is loaded by the film.)
import sys, json, numpy as np, cv2
a=sys.argv; ref=a[1]; thr=float(a[2]); sx,sy=int(a[3]),int(a[4]); out=a[5]
opt=lambda k,d: [s for s in a if s.startswith(f'--{k}=')][0].split('=')[1] if any(s.startswith(f'--{k}=') for s in a) else d
sig=float(opt('sig',3)); eps=float(opt('eps',2.5)); box=[int(v) for v in opt('box','0,0,2206,946').split(',')]; ro=int(opt('open',0))
u=cv2.GaussianBlur(np.load(f'{ref}_u.npy').mean(2),(0,0),sig)
m=(u<thr) if '--below' in a else (u>thr)
bm=np.zeros_like(m); x0,y0,x1,y1=box; bm[y0:y1,x0:x1]=True; m&=bm
m=m.astype(np.uint8)
if ro: k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*ro+1,2*ro+1)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k)
n,lab=cv2.connectedComponents(m)
L=lab[sy,sx]
if L==0: print('seed not in region'); sys.exit(1)
mm=(lab==L).astype(np.uint8)
cs,_=cv2.findContours(mm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=cv2.contourArea)
p=cv2.approxPolyDP(c,eps,True)[:,0,:]
json.dump([[int(x),int(y)] for x,y in p],open(out+'.json','w'))
img=cv2.imread(f'{ref}.png'); cv2.polylines(img,[p.reshape(-1,1,2)],True,(0,0,255),2)
xs,ys=p[:,0],p[:,1]; X0,Y0,X1,Y1=max(0,xs.min()-40),max(0,ys.min()-40),min(2206,xs.max()+40),min(946,ys.max()+40)
cv2.imwrite(out+'.jpg',img[Y0:Y1,X0:X1],[cv2.IMWRITE_JPEG_QUALITY,85])
print(len(p),'points, area',int(mm.sum()))
