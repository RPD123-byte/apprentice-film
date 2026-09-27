# Measure a region of a source frame as flat colour regions (posterized, simplified polygons) + ink strokes.
# Used for the designer (the user's own character) at 125.0 s. Output: JSON {regions:[{c:'#rrggbb', p:[[x,y..]], holes}], strokes:[...]}
import cv2, numpy as np, json, sys
from common import load
from trace_lines import trace
from ungrade import ungrade, hexc
def vectorize(t, mask, K=14, minarea=80, eps=1.8, seed=1, inkthr=28):
    f=load(t)
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    ink=((bh>inkthr)&(g<150)).astype(np.uint8)*255
    ink=cv2.dilate(ink,np.ones((3,3),np.uint8))
    clean=cv2.inpaint(f,ink,5,cv2.INPAINT_TELEA)
    clean=cv2.bilateralFilter(clean,9,40,9); clean=cv2.medianBlur(clean,7)
    lab=cv2.cvtColor(clean,cv2.COLOR_BGR2LAB).astype(np.float32)
    ys,xs=np.nonzero(mask)
    Z=lab[ys,xs]
    cv2.setRNGSeed(seed)
    _,lb,cen=cv2.kmeans(Z,K,None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,40,0.5),4,cv2.KMEANS_PP_CENTERS)
    L=np.full(mask.shape,-1,np.int32); L[ys,xs]=lb.ravel()
    # majority filter
    for it in range(2):
        votes=np.zeros((K,)+mask.shape,np.float32)
        for k in range(K): votes[k]=cv2.boxFilter((L==k).astype(np.float32),-1,(7,7))
        L2=np.argmax(votes,0); L=np.where(mask>0,L2,-1)
    regions=[]
    bgr=cv2.cvtColor(cen.reshape(1,-1,3).astype(np.uint8),cv2.COLOR_LAB2BGR).reshape(-1,3)
    for k in range(K):
        m=((L==k)).astype(np.uint8)*255
        n,cc,st,cent=cv2.connectedComponentsWithStats(m)
        for i in range(1,n):
            if st[i,4]<minarea: continue
            mi=(cc==i).astype(np.uint8)*255
            cnts,hier=cv2.findContours(mi,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
            outer=[];holes=[]
            for j,c in enumerate(cnts):
                a=cv2.approxPolyDP(c,eps,True).reshape(-1,2)
                if len(a)<3: continue
                (holes if hier[0][j][3]>=0 else outer).append(a.tolist())
            cx,cy=cent[i]
            col=bgr[k][::-1]; pre=ungrade(col,cx,cy)
            for o in outer: regions.append({'c':hexc(pre),'k':int(k),'a':int(st[i,4]),'p':o,'h':[h for h in holes if cv2.pointPolygonTest(np.float32(o),tuple(map(float,h[0])),False)>=0]})
    regions.sort(key=lambda r:-r['a'])
    strokes=trace(t,mask,thr=inkthr)
    return regions,strokes,L,bgr
if __name__=='__main__':
    pass
