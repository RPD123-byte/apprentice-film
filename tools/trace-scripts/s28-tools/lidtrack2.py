# Lid quad per frame from its dark keyline: for each edge, sample points along the predicted edge, scan along the
# normal (from outside inward for top/right/bottom, from inside outward for the left edge, whose outside is hair),
# take the first dark pixel, RANSAC-fit a line; corners = intersections. Tracked frame to frame from a manual start.
import cv2,numpy as np,json,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def gray(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); return cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.0),f
def bil(g,x,y):
    H,W=g.shape; x=np.clip(x,0,W-1.001); y=np.clip(y,0,H-1.001); x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); fx=x-x0; fy=y-y0
    return g[y0,x0]*(1-fx)*(1-fy)+g[y0,x0+1]*fx*(1-fy)+g[y0+1,x0]*(1-fx)*fy+g[y0+1,x0+1]*fx*fy
def inter(p,d,q,e):
    A=np.array([d,-e]).T; s=np.linalg.solve(A,q-p); return p+s[0]*d
def fitline(P,it=200,thr=1.5,rng=np.random.default_rng(0)):
    best=None;bn=0
    for _ in range(it):
        i,j=rng.choice(len(P),2,replace=False)
        d=P[j]-P[i]; L=np.linalg.norm(d)
        if L<20: continue
        d/=L; n=np.array([-d[1],d[0]]); r=np.abs((P-P[i])@n); k=r<thr
        if k.sum()>bn: bn=k.sum(); best=k
    if best is None: return None,None,0
    Q=P[best]; cx=Q.mean(0); U,S,Vt=np.linalg.svd(Q-cx); return cx,Vt[0],bn
DARK=46
def edge_points(g,a,b,inward,scan_from_out,nsamp=50,R=30):
    d=(b-a)/np.linalg.norm(b-a); n=np.array([-d[1],d[0]])
    if np.dot(n,inward)<0: n=-n          # n points inward
    pts=[]
    for u in np.linspace(0.12,0.88,nsamp):
        p=a+(b-a)*u
        if p[0]<3 or p[0]>2202 or p[1]<3 or p[1]>942: continue
        offs=np.arange(-R,R+0.5,0.5)                 # negative = outside
        if not scan_from_out: offs=offs[::-1]
        xs=p[0]+n[0]*offs; ys=p[1]+n[1]*offs
        ok=(xs>1)&(xs<2204)&(ys>1)&(ys<944)
        v=bil(g,xs,ys)
        # need a lid-grey stretch on the inner side to trust it
        hit=np.where((v<DARK)&ok)[0]
        if len(hit)==0: continue
        k=hit[0]; pts.append(p+n*offs[k])
    return np.array(pts)
KEYS={ # TL, TR, BR, BL (BL/BR may be below the frame)
129.28:[[1400,330],[1770,360],[1617,812],[1238,893]],
129.30:[[1379,331],[1766,363],[1613,815],[1218,895]],
129.50:[[1234,369],[1718,381],[1597,826],[1065,926]],
129.70:[[1105,392],[1682,400],[1573,827],[968,932]],
129.90:[[884,423],[1565,429],[1492,861],[758,950]],
130.10:[[734,439],[1471,439],[1384,903],[640,985]],
130.30:[[519,463],[1298,463],[1255,960],[480,1000]],
130.50:[[411,479],[1206,476],[1180,960],[430,990]],
130.70:[[311,487],[1105,487],[1100,960],[330,990]],
130.90:[[221,497],[1000,500],[1026,960],[270,980]],
131.10:[[148,503],[898,503],[942,960],[210,975]],
131.36:[[128,508],[868,508],[918,960],[204,960]],
131.40:[[128,508],[868,508],[918,960],[204,960]]}
kt=sorted(KEYS)
def interp(t):
    t=min(max(t,kt[0]),kt[-1])
    for i in range(len(kt)-1):
        if kt[i]<=t<=kt[i+1]:
            u=(t-kt[i])/(kt[i+1]-kt[i]); return np.array(KEYS[kt[i]])*(1-u)+np.array(KEYS[kt[i+1]])*u

Q=np.array([[1400,330],[1770,360],[1624,790],[1235,895]],float)
out={}; frames=[]
n0=int(round(129.28*25)); n1=int(round(131.40*25))
prev=None
for nfr in range(n0,n1+1):
    g,f=gray(nfr)
    Q=interp(nfr/25).astype(float)
    cen=Q.mean(0)
    lines=[]
    for k,(scan_out) in enumerate([True,True,True,False]):   # top, right, bottom, left
        a,b=Q[k],Q[(k+1)%4]
        P=edge_points(g,a,b,cen-(a+b)/2,scan_out)
        if len(P)>=10:
            p,d,nin=fitline(P)
            dd=(b-a)/np.linalg.norm(b-a)
            if d is not None and abs(d@dd)>0.99 and nin>=8: lines.append((p,d)); continue
        lines.append((a,(b-a)/np.linalg.norm(b-a)))
    Qn=np.array([inter(*lines[(k-1)%4],*lines[k]) for k in range(4)])
    wq=np.linalg.norm(Q[1]-Q[0]); wn=np.linalg.norm(Qn[1]-Qn[0]); hq=np.linalg.norm(Q[3]-Q[0]); hn=np.linalg.norm(Qn[3]-Qn[0])
    if np.abs(Qn-Q).max()<120 and abs(wn/wq-1)<0.12 and abs(hn/hq-1)<0.12:
        vel=Qn-Q if prev is not None else np.zeros_like(Q); Q=Qn
    else:
        print('reject',nfr/25,np.round(Qn).astype(int).tolist())
        vel=np.zeros_like(Q)
    prev=Q.copy()
    out[f"{nfr/25:.2f}"]=Q.round(1).tolist()
    # predict next: constant velocity
    if prev is not None: pass
    frames.append((nfr,f.copy(),Q.copy()))
    Q=Q+vel
json.dump(out,open('snapshots/s28-tools/lidquads2.json','w'))
ims=[]
for nfr,f,Qq in frames[::5]:
    cv2.polylines(f,[np.int32(Qq).reshape(-1,1,2)],True,(0,0,255),2)
    cr=cv2.resize(f[200:946,0:2206],None,fx=0.3,fy=0.3); cv2.putText(cr,f"{nfr/25:.2f}",(5,20),0,0.7,(0,255,255),2); ims.append(cr)
while len(ims)%3: ims.append(np.zeros_like(ims[0]))
cv2.imwrite('snapshots/s28-study/lidq2.jpg',np.vstack([np.hstack(ims[i:i+3]) for i in range(0,len(ims),3)]))
for k in sorted(out)[::3]: print(k,np.round(out[k]).astype(int).tolist())
