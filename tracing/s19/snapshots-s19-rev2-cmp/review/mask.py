import cv2, glob, re, numpy as np
d='snapshots/s19-rev2-cmp'
def load(t,kind):
    f=glob.glob(f'{d}/{kind}-*-at-{t}s.png')[0]; return cv2.imread(f,0).astype(np.float32)
bgR=cv2.GaussianBlur(load('57.36','frame'),(0,0),3); bgS=cv2.GaussianBlur(load('57.36','ref'),(0,0),3)
def mask(im,bg):
    m=(np.abs(cv2.GaussianBlur(im,(0,0),3)-bg)>40).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    m[850:]=0
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n<2: return m*0
    k=1+np.argmax(st[1:,4]); return (lab==k).astype(np.uint8)
ts=['57.52','57.64','57.76','57.88','58','58.12','58.24','58.36','58.52','58.76','59','59.24','59.52','59.76','59.88','60','60.24','60.52','60.76','61','61.12','61.16','61.24','61.36']
for t in ts:
    mr=mask(load(t,'frame'),bgR); ms=mask(load(t,'ref'),bgS)
    def st(m):
        ys,xs=np.nonzero(m)
        if len(xs)==0: return None
        return xs.min(),ys.min(),xs.max(),ys.max(),xs.mean(),ys.mean(),len(xs)
    a=st(mr); b=st(ms)
    iou=(mr&ms).sum()/max(1,(mr|ms).sum())
    print(f"{t:>6} R bbox {a[:4]} c=({a[4]:.0f},{a[5]:.0f}) A={a[6]}  | S bbox {b[:4]} c=({b[4]:.0f},{b[5]:.0f}) A={b[6]} | IoU {iou:.2f}")
    vis=np.dstack([ms*255,mr*255,np.zeros_like(mr)]).astype(np.uint8)
    cv2.imwrite(f'snapshots/s19-rev2-ana/mask-{t}.png',cv2.resize(vis,None,fx=0.5,fy=0.5))
