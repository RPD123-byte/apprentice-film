# thin bright cut lines (the shard lines, 96.0-97.08) as strokes: white top-hat of the foreground increment,
# hysteresis, elongated thin components only, skeleton -> centre lines with widths and colours.
import cv2, numpy as np
from skimage.filters import apply_hysteresis_threshold
from skel import paths, smooth_simplify
def bright_lines(F, P, m, lo=0.12, hi=0.26, minlen=28, maxw=6.0):
    D=cv2.GaussianBlur((F-P).mean(-1),(0,0),0.6)
    th=cv2.morphologyEx(D,cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    L=apply_hysteresis_threshold(th,lo,hi).astype(np.uint8)
    L&=(m>0).astype(np.uint8)
    from skimage.morphology import skeletonize
    n,cc,st,_=cv2.connectedComponentsWithStats(L,connectivity=8)
    sk=skeletonize(L>0)
    sklen=np.bincount(cc[sk],minlength=n)
    keep=np.zeros(n,bool)
    for i in range(1,n):
        x,y,w,h,a=st[i]
        ext=max(w,h)
        if ext>=minlen and sklen[i]>0 and a/sklen[i]<=maxw: keep[i]=True
    L=keep[cc].astype(np.uint8)
    dt=cv2.distanceTransform(L,cv2.DIST_L2,5)
    strokes=[]
    Y=F.mean(-1)
    H,W=L.shape
    offs=np.arange(-5,5.01,0.5).astype(np.float32)
    for a,w in paths(L,dt,6):
        if len(a)<6: continue
        # direction along the path (smoothed), normal, and the across-line profile of the top-hat
        d=np.gradient(cv2.GaussianBlur(a.astype(np.float32).reshape(-1,1,2),(1,5),0).reshape(-1,2),axis=0)
        d/=np.maximum(np.linalg.norm(d,axis=1,keepdims=True),1e-6); nrm=np.stack([-d[:,1],d[:,0]],1)
        X=(a[:,0:1]+nrm[:,0:1]*offs[None]).astype(np.float32); Yy=(a[:,1:2]+nrm[:,1:2]*offs[None]).astype(np.float32)
        prof=cv2.remap(th.astype(np.float32),X,Yy,cv2.INTER_LINEAR)
        pk=np.maximum(prof.max(1),1e-3)
        wid=np.clip((np.clip(prof,0,None).sum(1)*0.5)/pk,1.0,6.0)
        # colour: the brightest sample across the line, per channel median along it
        ci=prof.argmax(1)
        cx=X[np.arange(len(a)),ci]; cy=Yy[np.arange(len(a)),ci]
        cols=np.stack([cv2.remap(F[...,c],cx.reshape(1,-1),cy.reshape(1,-1),cv2.INTER_LINEAR)[0] for c in range(3)],1)
        a2,w2=smooth_simplify(a,wid.astype(np.float32),2,0.7)
        if len(a2)<2: continue
        seglen=np.hypot(*(a2[-1]-a2[0]))
        if seglen<10: continue
        col=np.clip(np.median(cols,axis=0)[::-1],0,1)
        strokes.append({'c':[int(round(v*255)) for v in col],'p':[round(float(t),1) for q in a2 for t in q],'w':[round(float(x),1) for x in w2]})
    return strokes, L

def thin_lines(F, m, sign=-1, lo=0.06, hi=0.14, minlen=6, maxw=3.0, k=7, restrict=None):
    """thin dark (sign -1) or light (+1) lines inside the foreground that level fills smooth away: black/white top-hat,
    hysteresis, thin components, skeleton -> centre lines, width = ink mass / peak, colour = the line's own value"""
    from skimage.morphology import skeletonize
    Y=cv2.GaussianBlur(F.mean(-1),(0,0),0.5)
    se=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k))
    th=cv2.morphologyEx(Y,cv2.MORPH_BLACKHAT if sign<0 else cv2.MORPH_TOPHAT,se)
    inner=cv2.erode((m>0).astype(np.uint8),np.ones((3,3),np.uint8))
    if restrict is not None: inner&=restrict
    L=apply_hysteresis_threshold(th*inner,lo,hi).astype(np.uint8)
    n,cc,st,_=cv2.connectedComponentsWithStats(L,connectivity=8)
    sk=skeletonize(L>0); sklen=np.bincount(cc[sk],minlength=n)
    keep=np.zeros(n,bool)
    for i in range(1,n):
        if sklen[i]>=minlen and st[i,4]/max(sklen[i],1)<=maxw: keep[i]=True
    L=keep[cc].astype(np.uint8)
    dt=cv2.distanceTransform(L,cv2.DIST_L2,5)
    offs=np.arange(-4,4.01,0.5).astype(np.float32)
    out=[]
    for a,w in paths(L,dt,4):
        if len(a)<4: continue
        d=np.gradient(cv2.GaussianBlur(a.astype(np.float32).reshape(-1,1,2),(1,5),0).reshape(-1,2),axis=0)
        d/=np.maximum(np.linalg.norm(d,axis=1,keepdims=True),1e-6); nrm=np.stack([-d[:,1],d[:,0]],1)
        X=(a[:,0:1]+nrm[:,0:1]*offs[None]).astype(np.float32); Yy=(a[:,1:2]+nrm[:,1:2]*offs[None]).astype(np.float32)
        prof=cv2.remap(th.astype(np.float32),X,Yy,cv2.INTER_LINEAR)
        pk=np.maximum(prof.max(1),1e-3); wid=np.clip((np.clip(prof,0,None).sum(1)*0.5)/pk,0.7,maxw*1.5)
        ci=prof.argmax(1); cx=X[np.arange(len(a)),ci]; cy=Yy[np.arange(len(a)),ci]
        cols=np.stack([cv2.remap(F[...,c],cx.reshape(1,-1),cy.reshape(1,-1),cv2.INTER_LINEAR)[0] for c in range(3)],1)
        a2,w2=smooth_simplify(a,wid.astype(np.float32),1,0.5)
        if len(a2)<2: continue
        col=np.clip(np.median(cols,axis=0)[::-1],0,1)
        out.append({'c':[int(round(v*255)) for v in col],'p':[round(float(t),1) for q in a2 for t in q],'w':[round(float(x),1) for x in w2]})
    return out
