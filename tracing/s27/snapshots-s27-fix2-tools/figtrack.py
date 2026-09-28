# chained frame-to-frame homography of the designer (figure region) -> H mapping 129.0-frame px to frame px at t
import cv2, numpy as np, json
from src import frame, times
T=times(127.72,129.32,0.04); REF=129.0
s=cv2.SIFT_create(3000)
def feats(t):
    g=frame(t,True); m=np.zeros_like(g)
    poly=np.array([[0,150],[1180,150],[1180,560],[1100,700],[700,760],[0,760]],np.int32)
    cv2.fillPoly(m,[poly],255)
    return s.detectAndCompute(g,m)
F={t:feats(t) for t in T}
bf=cv2.BFMatcher()
def H(a,b):
    ka,da=F[a]; kb,db=F[b]
    g=[x for x,y in bf.knnMatch(da,db,k=2) if x.distance<0.75*y.distance]
    pa=np.float32([ka[x.queryIdx].pt for x in g]); pb=np.float32([kb[x.trainIdx].pt for x in g])
    M,inl=cv2.findHomography(pa,pb,cv2.RANSAC,3.0)
    return M,int(inl.sum()),len(g)
out={}; i0=T.index(REF); out[REF]=np.eye(3)
for i in range(i0,len(T)-1):
    M,n,ng=H(T[i],T[i+1]); out[T[i+1]]=M@out[T[i]]; print(T[i+1],n,ng)
for i in range(i0,0,-1):
    M,n,ng=H(T[i],T[i-1]); out[T[i-1]]=M@out[T[i]]; print(T[i-1],n,ng)
rows=[[t]+list((out[t]/out[t][2,2]).ravel()[:8]) for t in sorted(out)]
json.dump(rows,open('../s27-fix2-meas/figH.json','w'))
for r in rows[::5]: print(r[0], np.round(np.array(r[1:]),4).tolist())
