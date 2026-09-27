# the torn white rim of the empty header slot, from the clean plates (rim-1: 84.04-86.08, rim-2: 86.12-88.68)
import cv2, numpy as np, json
from skimage.filters import apply_hysteresis_threshold
from skel import paths, smooth_simplify
import fgx
X0,Y0,X1,Y1=193.5,185.5,1975.0,361.0
def band_mask(H=946,W=2206,r=14):
    m=np.zeros((H,W),np.uint8)
    cv2.rectangle(m,(int(X0-r),int(Y0-r)),(int(X1+r),int(Y1+r)),1,-1)
    cv2.rectangle(m,(int(X0+r),int(Y0+r)),(int(X1-r),int(Y1-r)),0,-1)
    return m
def rim_strokes(P):
    Y=P.mean(-1)
    th=cv2.morphologyEx(cv2.GaussianBlur(Y,(0,0),0.6),cv2.MORPH_TOPHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    L=apply_hysteresis_threshold(th,0.15,0.35).astype(np.uint8)&band_mask()
    # only along the dark hole: within 7 px of its interior
    D=((Y<0.1).astype(np.uint8))
    D[:int(Y0-12)]=0; D[int(Y1+12):]=0; D[:, :int(X0-12)]=0; D[:, int(X1+12):]=0
    n,cc,st,_=cv2.connectedComponentsWithStats(D,connectivity=4)
    big=1+int(np.argmax(st[1:,4])); I=(cc==big).astype(np.uint8)
    I=cv2.morphologyEx(I,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    Z=cv2.dilate(I,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))&(1-cv2.erode(I,np.ones((3,3),np.uint8)))
    L&=Z
    n,cc,st,_=cv2.connectedComponentsWithStats(L,connectivity=8)
    keep=np.zeros(n,bool); keep[1:]=st[1:,4]>=40
    L=keep[cc].astype(np.uint8)
    dt=cv2.distanceTransform(L,cv2.DIST_L2,5)
    offs=np.arange(-5,5.01,0.5).astype(np.float32)
    out=[]
    for a,w in paths(L,dt,8):
        d=np.gradient(cv2.GaussianBlur(a.astype(np.float32).reshape(-1,1,2),(1,5),0).reshape(-1,2),axis=0)
        d/=np.maximum(np.linalg.norm(d,axis=1,keepdims=True),1e-6); nrm=np.stack([-d[:,1],d[:,0]],1)
        X=(a[:,0:1]+nrm[:,0:1]*offs[None]).astype(np.float32); Yy=(a[:,1:2]+nrm[:,1:2]*offs[None]).astype(np.float32)
        prof=cv2.remap(th.astype(np.float32),X,Yy,cv2.INTER_LINEAR)
        pk=np.maximum(prof.max(1),1e-3); wid=np.clip((np.clip(prof,0,None).sum(1)*0.5)/pk,1.0,6.0)
        ci=prof.argmax(1); cx=X[np.arange(len(a)),ci]; cy=Yy[np.arange(len(a)),ci]
        cols=np.stack([cv2.remap(P[...,c],cx.reshape(1,-1),cy.reshape(1,-1),cv2.INTER_LINEAR)[0] for c in range(3)],1)
        a2,w2=smooth_simplify(a,wid.astype(np.float32),2,0.5)
        if len(a2)<2: continue
        col=np.clip(np.median(cols,axis=0)[::-1],0,1)
        out.append({'c':[int(round(v*255)) for v in col],'p':[round(float(t),1) for q in a2 for t in q],'w':[round(float(x),1) for x in w2]})
    return out,L
if __name__=='__main__':
    res={}
    for name in ['H1a','H1b','H2']:
        P=fgx.plate(name)
        S,L=rim_strokes(P)
        res[name]=S
        print(name,len(S),'strokes',sum(len(s['w']) for s in S),'points','median w',np.median([w for s in S for w in s['w']]),'median col',np.median([s['c'] for s in S],axis=0))
        # interior colour of the hole
        inner=P[200:345,220:1950].reshape(-1,3); print(' hole interior median',np.round(np.median(inner,0)[::-1]*255,1))
        vis=np.zeros((946,2206,3),np.uint8)
        for s in S:
            p=np.array(s['p']).reshape(-1,2)
            for j in range(len(p)-1): cv2.line(vis,tuple(np.int32(p[j])),tuple(np.int32(p[j+1])),(255,255,255),max(1,int(round(s['w'][j]))))
        cv2.imwrite('rim_%s.jpg'%name,np.vstack([np.clip(P*255,0,255).astype(np.uint8)[150:400,150:1100],vis[150:400,150:1100]]))
    json.dump(res,open('rims.json','w'))
