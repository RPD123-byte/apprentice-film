# contour.py x0 y0 x1 y1 thr [--below] [--eps E] [--min A] [--blur S] [--img clean_u] [--all]
# outline measurement: iso-contours of the (ungraded) plate over a box, simplified; prints JS point arrays (page px)
import cv2, sys, numpy as np, argparse
ap=argparse.ArgumentParser(); ap.add_argument('box',nargs=4,type=int); ap.add_argument('thr',type=float)
ap.add_argument('--below',action='store_true'); ap.add_argument('--eps',type=float,default=1.0); ap.add_argument('--min',type=float,default=30)
ap.add_argument('--blur',type=float,default=1.0); ap.add_argument('--img',default='clean_u'); ap.add_argument('--n',type=int,default=6); ap.add_argument('--close',type=int,default=0)
ap.add_argument('--show',default='')
a=ap.parse_args()
u=cv2.imread(f'../f1-p3/{a.img}.png',0).astype(np.float32)
x0,y0,x1,y1=a.box
S=4
c=u[y0:y1,x0:x1]
if a.blur>0: c=cv2.GaussianBlur(c,(0,0),a.blur)
c=cv2.resize(c,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
m=(c<a.thr) if a.below else (c>a.thr)
m=m.astype(np.uint8)*255
if a.close: m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((a.close*S,a.close*S),np.uint8))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cs=sorted(cs,key=lambda q:-cv2.contourArea(q))
out=[]
for q in cs[:a.n]:
    A=cv2.contourArea(q)/(S*S)
    if A<a.min: continue
    p=cv2.approxPolyDP(q,a.eps*S,True)[:,0,:].astype(np.float32)/S
    p[:,0]+=x0; p[:,1]+=y0
    out.append((A,p))
    print(f'// area {A:.0f} n {len(p)} bbox {p[:,0].min():.0f},{p[:,1].min():.0f}-{p[:,0].max():.0f},{p[:,1].max():.0f}')
    print('['+', '.join(f'[{x:.1f}, {y:.1f}]' for x,y in p)+'],')
if a.show:
    g=cv2.imread('../f1-p3/clean_g.png'); cr=cv2.resize(g[y0:y1,x0:x1],None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    for A,p in out:
        pp=((p-[x0,y0])*S).astype(np.int32); cv2.polylines(cr,[pp],True,(0,0,255),1)
    cv2.imwrite(a.show,cr)
