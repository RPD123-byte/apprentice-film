import cv2,numpy as np,json
from scipy.optimize import least_squares
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
cx,cy=1103.,473.
st=json.load(open('card3d.json')); f=st['f']; ka=st['ka']; static=np.array(st['poses']['57.32'])
ecc=json.load(open('ecc3.json'))
def proj(p,U):
    R,_=cv2.Rodrigues(np.array(p[:3],float)); X=np.stack([U[:,0],U[:,1]*ka,np.zeros(len(U))],1)
    P=(R@X.T).T+p[3:6]; return np.stack([f*P[:,0]/P[:,2]+cx,f*P[:,1]/P[:,2]+cy],1)
EDGES={'L':np.array([[0,0],[0,648]],float),'R':np.array([[465,0],[465,648]],float),'B':np.array([[0,648],[465,648]],float),'T':np.array([[0,0],[465,0]],float)}
def seg_in_frame(a,b,n=9):
    pts=[a+(b-a)*k/(n-1) for k in range(n)]
    return [p for p in pts if -50<p[0]<2256 and -50<p[1]<996]
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,fr=c.read(); return fr
prev=static.copy(); res={}; log=[]
ts=[round(61.44+0.04*i,2) for i in range(42)]
for t in ts:
    fr=grab(t); g=cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY)
    m=(cv2.GaussianBlur(g,(0,0),2)>175).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,sts,_=cv2.connectedComponentsWithStats(m); i=1+np.argmax(sts[1:,4]); m=((lab==i)*255).astype(np.uint8)
    e=cv2.Canny(m,50,150)
    L=cv2.HoughLines(e,1,np.pi/720,90)
    lines=[] if L is None else [tuple(l) for l in L[:40,0,:]]
    # predicted edges from prev pose
    matched={}
    for k,E in EDGES.items():
        if t>62.70 and k!='L': continue
        q=proj(prev,E); d=q[1]-q[0]; ang=np.arctan2(d[1],d[0])
        nrm=np.array([-np.sin(ang),np.cos(ang)])
        # Hough line: x cos th + y sin th = rho; its normal (cos th, sin th)
        best=None
        for rho,th in lines:
            nl=np.array([np.cos(th),np.sin(th)])
            dot=abs(nl@nrm)
            if dot<np.cos(np.radians(10)): continue
            mid=(q[0]+q[1])/2
            vis=seg_in_frame(q[0],q[1])
            if len(vis)<3: continue
            vm=np.mean(vis,0)
            dist=abs(vm@nl-rho)
            if dist<90 and (best is None or dist<best[0]): best=(dist,rho,th)
        if best: matched[k]=(best[1],best[2])
    pts={}
    if str(t) in ecc:
        H=np.array(ecc[str(t)])
        for nm,u in [('TL',(51,160)),('Tx',(92,201))]:
            p=cv2.perspectiveTransform(np.float32([[u]]),H)[0,0]
            if 0<p[0]<2206 and 5<p[1]<941: pts[nm]=(u,p)
    us={}
    for k in matched:
        q=proj(prev,EDGES[k]); us[k]=[u for u in np.linspace(0,1,9) if -50<(q[0]+(q[1]-q[0])*u)[0]<2256 and -50<(q[0]+(q[1]-q[0])*u)[1]<996]
    def resid(p):
        r=[]
        for k,(rho,th) in matched.items():
            E=EDGES[k]; nl=np.array([np.cos(th),np.sin(th)])
            U=np.array([E[0]+(E[1]-E[0])*u for u in us[k]]) if us[k] else np.zeros((0,2))
            if len(U)==0: continue
            for v in proj(p,U): r.append((v@nl-rho)*1.0)
        for nm,(u,o) in pts.items():
            r+=list((proj(p,np.array([u],float))[0]-o)*0.7)
        w=np.array([40,40,40,0.03,0.03,0.03]) if t<=62.70 else np.array([600,600,600,0.02,0.02,0.3])
        r+=list((p-prev)*w)
        return np.array(r)
    sol=least_squares(resid,prev,loss='soft_l1',f_scale=15)
    prev=sol.x; res[t]=sol.x.tolist()
    Cn=proj(sol.x,np.array([[0,0],[465,0],[465,648],[0,648]],float))
    print(f'{t:.2f} edges={"".join(matched)} pts={len(pts)} rms={np.sqrt(np.mean(sol.fun[:-6]**2)) if len(sol.fun)>6 else 0:.1f} corners '+' '.join(f'({x:.0f},{y:.0f})' for x,y in Cn))
json.dump({'f':f,'ka':ka,'poses':{**{'57.32':static.tolist()},**{str(k):v for k,v in res.items()}}},open('fit3d.json','w'))
# homographies (card units -> frame) for overlay
Hs={}
for t,p in res.items():
    U=np.float32([[0,0],[465,0],[465,648],[0,648]]); Q=proj(np.array(p),U.astype(float)).astype(np.float32)
    Hs[str(t)]=cv2.getPerspectiveTransform(U,Q).tolist()
json.dump(Hs,open('fit3d_H.json','w'))
