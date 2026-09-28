import cv2, glob, re, numpy as np
d='snapshots/s19-rev2-dense'
def load(t,kind):
    f=glob.glob(f'{d}/{kind}-*-at-{t}s.png')[0]; return cv2.imread(f,0).astype(np.float32)
bgR=cv2.GaussianBlur(cv2.imread(glob.glob('snapshots/s19-rev2-cmp/frame-*-at-57.36s.png')[0],0).astype(np.float32),(0,0),3); bgS=cv2.GaussianBlur(cv2.imread(glob.glob('snapshots/s19-rev2-cmp/ref-*-at-57.36s.png')[0],0).astype(np.float32),(0,0),3)
def mask(im,bg):
    m=(np.abs(cv2.GaussianBlur(im,(0,0),3)-bg)>40).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    m[850:]=0
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n<2: return m*0
    k=1+np.argmax(st[1:,4]); return (lab==k).astype(np.uint8)
ts=['57.4','57.44','57.48','57.52','57.56','57.6','57.64','57.68','57.72','57.76','57.8','57.84','57.88','57.92','57.96','58','58.04','58.08','58.12','58.16','58.2','58.24','58.28','58.32','58.36']
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
    cv2.imwrite(f'snapshots/s19-rev2-ana/dmask-{t}.png',cv2.resize(vis,None,fx=0.5,fy=0.5))
