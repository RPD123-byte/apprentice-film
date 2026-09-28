# Ink-line measurement: thin dark lines (black-hat) inside a mask -> skeleton -> polylines with widths.
import cv2, numpy as np
from skimage.morphology import skeletonize
from common import load
def dp(pts,eps):
    a=np.array(pts,np.float32).reshape(-1,1,2); return cv2.approxPolyDP(a,eps,False).reshape(-1,2)
def trace(t,mask,thr=28,k=11,minlen=20,eps=1.2,scale=2):
    g=cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY)
    # upsample for sub-pixel skeleton
    G=cv2.resize(g,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
    M=cv2.resize(mask,None,fx=scale,fy=scale,interpolation=cv2.INTER_NEAREST)
    bh=cv2.morphologyEx(G,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k*scale,k*scale)))
    L=((bh>thr)&(M>0)).astype(np.uint8)
    L=cv2.morphologyEx(L,cv2.MORPH_OPEN,np.ones((2,2),np.uint8))
    dist=cv2.distanceTransform(L,cv2.DIST_L2,3)
    sk=skeletonize(L>0).astype(np.uint8)
    # neighbour count
    nb=cv2.filter2D(sk,-1,np.ones((3,3),np.float32))-1; nb=nb*sk
    H,W=sk.shape; visited=np.zeros_like(sk,bool); strokes=[]
    dirs=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
    ys,xs=np.nonzero(sk)
    ends=[(y,x) for y,x in zip(ys,xs) if nb[y,x]!=2]
    def walk(y,x):
        path=[(y,x)]; visited[y,x]=True
        while True:
            nxt=None
            for dy,dx in dirs:
                yy,xx=y+dy,x+dx
                if 0<=yy<H and 0<=xx<W and sk[yy,xx] and not visited[yy,xx]:
                    nxt=(yy,xx); break
            if nxt is None: break
            y,x=nxt; visited[y,x]=True; path.append(nxt)
            if nb[y,x]!=2: break
        return path
    for (y,x) in ends:
        if visited[y,x] and nb[y,x]==1: continue
        for dy,dx in dirs:
            yy,xx=y+dy,x+dx
            if 0<=yy<H and 0<=xx<W and sk[yy,xx] and not visited[yy,xx]:
                visited[y,x]=True
                p=[(y,x)]+walk(yy,xx); strokes.append(p)
    # loops
    ys,xs=np.nonzero(sk&(~visited))
    for y,x in zip(ys,xs):
        if not visited[y,x]: strokes.append(walk(y,x))
    out=[]
    for p in strokes:
        if len(p)<minlen*scale: continue
        P=np.array([(x/scale,y/scale) for y,x in p],np.float32)
        wd=np.array([dist[y,x]*2/scale for y,x in p],np.float32)
        Q=dp(P,eps)
        # widths at simplified points: nearest original
        idx=[int(np.argmin(np.sum((P-q)**2,1))) for q in Q]
        wq=[float(np.median(wd[max(0,i-3):i+4])) for i in idx]
        out.append((Q.round(1).tolist(),[round(w,1) for w in wq]))
    return out
