import cv2, numpy as np, json
from skimage.measure import label
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
sk=np.load(SP+'/cl_sk.npy').astype(np.uint8)
k=np.ones((3,3),np.uint8); nb=(cv2.filter2D(sk,-1,k)-1)*sk
br=cv2.dilate((nb>2).astype(np.uint8),np.ones((3,3),np.uint8))>0
seg=sk.copy(); seg[br]=0
lab=label(seg,connectivity=2)
def order(ys,xs):
    pts=set(zip(xs.tolist(),ys.tolist()))
    # find an endpoint
    def nbrs(p): 
        x,y=p; return [(x+dx,y+dy) for dx in(-1,0,1) for dy in(-1,0,1) if (dx or dy) and (x+dx,y+dy) in pts]
    start=next((p for p in pts if len(nbrs(p))<=1), next(iter(pts)))
    path=[start]; seen={start}
    while True:
        nx=[q for q in nbrs(path[-1]) if q not in seen]
        if not nx: break
        path.append(nx[0]); seen.add(nx[0])
    return np.array(path,float)
def fit(P):
    xs,ys=P[:,0],P[:,1]
    A=np.c_[2*xs,2*ys,np.ones(len(xs))]; bb=xs**2+ys**2
    c=np.linalg.lstsq(A,bb,rcond=None)[0]; cx,cy=c[0],c[1]; r=np.sqrt(max(c[2]+cx*cx+cy*cy,1))
    return cx,cy,r,np.abs(np.hypot(xs-cx,ys-cy)-r).mean()
out=[]
for i in range(1,lab.max()+1):
    ys,xs=np.where(lab==i)
    if len(xs)<20: continue
    P=order(ys,xs)
    if len(P)<20: continue
    # smooth path and compute direction
    w=5
    cuts=[0]
    ang=[]
    for j in range(len(P)):
        a=P[max(0,j-w)]; b=P[j]; c=P[min(len(P)-1,j+w)]
        v1=b-a; v2=c-b
        if np.linalg.norm(v1)<1 or np.linalg.norm(v2)<1: ang.append(0); continue
        t=np.degrees(np.arctan2(v1[0]*v2[1]-v1[1]*v2[0], v1@v2)); ang.append(t)
    ang=np.array(ang)
    j=w
    while j<len(P)-w:
        if abs(ang[j])>40:
            jj=j+np.argmax(np.abs(ang[j:j+2*w]))
            cuts.append(jj); j=jj+2*w
        else: j+=1
    cuts.append(len(P))
    for a,b in zip(cuts[:-1],cuts[1:]):
        Q=P[a+2:b-2] if b-a>10 else P[a:b]
        if len(Q)<18: continue
        cx,cy,r,res=fit(Q)
        out.append(dict(p0=Q[0].tolist(),p1=Q[-1].tolist(),mid=Q[len(Q)//2].tolist(),n=len(Q),c=[round(cx),round(cy)],r=round(r,1),res=round(res,2)))
out.sort(key=lambda d:d['mid'][0])
for d in out:
    print('%-14s %-14s %-14s n%4d circ %-14s r%6.1f res %.2f'%(tuple(map(int,d['p0'])),tuple(map(int,d['mid'])),tuple(map(int,d['p1'])),d['n'],tuple(d['c']),d['r'],d['res']))
json.dump(out,open(SP+'/arcs.json','w'))
