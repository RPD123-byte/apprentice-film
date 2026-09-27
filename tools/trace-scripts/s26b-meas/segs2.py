# Straight crack segments from a presence map: probabilistic Hough on the skeleton + collinear merging.
import cv2, numpy as np, sys, json, math
from skimage.morphology import skeletonize
from skimage.transform import probabilistic_hough_line
P=np.load(sys.argv[1]); thr=float(sys.argv[2]); out=sys.argv[3]
PR=np.load(sys.argv[5]); PRd=cv2.dilate((PR>0.3).astype(np.uint8),np.ones((3,3),np.uint8))
supmin=float(sys.argv[6])
m=P>thr
m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,np.ones((2,2),np.uint8)).astype(bool)
sk=skeletonize(m)
lines=probabilistic_hough_line(sk,threshold=8,line_length=18,line_gap=9,rng=1)
segs=[np.array([[a[0],a[1]],[b[0],b[1]]],float) for a,b in lines]
def ang(s): d=s[1]-s[0]; return math.atan2(d[1],d[0])%math.pi
def merge_pass(segs):
    used=[False]*len(segs); out=[]
    order=sorted(range(len(segs)),key=lambda i:-np.linalg.norm(segs[i][1]-segs[i][0]))
    for i in order:
        if used[i]: continue
        s=segs[i]; used[i]=True; changed=True
        while changed:
            changed=False
            a=ang(s); d=np.array([math.cos(a),math.sin(a)]); n=np.array([-d[1],d[0]])
            L0,L1=sorted([(s[0]-s[0])@d,(s[1]-s[0])@d])
            for j in order:
                if used[j]: continue
                t=segs[j]; da=abs(ang(t)-a); da=min(da,math.pi-da)
                if da>math.radians(4): continue
                if max(abs((t[0]-s[0])@n),abs((t[1]-s[0])@n))>3.2: continue
                u0,u1=sorted([(t[0]-s[0])@d,(t[1]-s[0])@d])
                if u0>L1+14 or u1<L0-14: continue
                lo,hi=min(L0,u0),max(L1,u1)
                # refit through the union of endpoints
                pts=np.array([s[0],s[1],t[0],t[1]]); c=pts.mean(0)
                w=np.array([np.linalg.norm(s[1]-s[0])]*2+[np.linalg.norm(t[1]-t[0])]*2)
                C=((pts-c)*w[:,None]).T@(pts-c); ev,evec=np.linalg.eigh(C); d2=evec[:,1]
                pr=(pts-c)@d2
                s=np.array([c+d2*pr.min(),c+d2*pr.max()]); used[j]=True; changed=True; break
        out.append(s)
    return out
for _ in range(3): segs=merge_pass(segs)
segs=[s for s in segs if np.linalg.norm(s[1]-s[0])>=int(sys.argv[4])]
def support(s):
    L=np.linalg.norm(s[1]-s[0]); n=max(2,int(L/2)); u=np.linspace(0,1,n)
    pts=s[0][None]+(s[1]-s[0])[None]*u[:,None]
    xs=np.clip(pts[:,0].round().astype(int),0,PR.shape[1]-1); ys=np.clip(pts[:,1].round().astype(int),0,PR.shape[0]-1)
    return PRd[ys,xs].mean()
segs=[s for s in segs if support(s)>=supmin]
# snap endpoints: extend each endpoint to the nearest other segment within 10 px along its direction
def snap(segs):
    res=[]
    for i,s in enumerate(segs):
        s=s.copy()
        for k in (0,1):
            p=s[k]; q=s[1-k]; d=(p-q)/np.linalg.norm(p-q)
            best=None
            for j,t in enumerate(segs):
                if j==i: continue
                # intersection of ray p+ld with segment t
                e=t[1]-t[0]; M=np.array([d,-e]).T
                if abs(np.linalg.det(M))<1e-6: continue
                l,u=np.linalg.solve(M,t[0]-p)
                if -3<=l<=12 and -0.05<=u<=1.05:
                    if best is None or abs(l)<abs(best): best=l
            if best is not None: s[k]=p+d*best
        res.append(s)
    return res
segs=snap(segs)
json.dump([[round(v,1) for v in s.flatten().tolist()] for s in segs],open(out,'w'))
H,W=P.shape; img=np.zeros((H,W,3),np.uint8)
for s in segs: cv2.line(img,tuple(int(v) for v in s[0]),tuple(int(v) for v in s[1]),(255,255,255),2,cv2.LINE_AA)
cv2.imwrite(out.replace('.json','.png'),img)
print(len(segs),'segments, total len',int(sum(np.linalg.norm(s[1]-s[0]) for s in segs)))
