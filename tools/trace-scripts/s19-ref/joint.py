import cv2,numpy as np,json
from scipy.optimize import least_squares
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return f
L1=json.load(open('liftecc.json')); E3=json.load(open('ecc3.json')); LE=json.load(open('lateecc.json'))
Cu=np.float32([[0,0],[465,0],[465,648],[0,648]])
def eccH(t):
    k=str(t)
    if t<=61.72 and k in L1: return cv2.getPerspectiveTransform(Cu,np.float32(np.array(L1[k]).reshape(4,2))).astype(np.float64), 1.0
    if t<=62.56 and k in E3: return np.array(E3[k]), 1.0
    # 62.60+: the card keeps its 62.56 orientation and slides right; the position comes from the measured text start
    # (the 3D-fit table's text start matches the source within ~15 px there)
    H56=np.array(E3['62.56']); d=textstart(t)-P(H56,[(85,205)])[0]
    return np.array([[1,0,d[0]],[0,1,d[1]],[0,0,1.0]])@H56, 1.0
import re
ROWS=[]
for line in open('card_table.js'):
    m=re.findall(r'-?\d+\.?\d*',line)
    if len(m)==9: ROWS.append([float(v) for v in m])
def textstart(t):
    r=min(ROWS,key=lambda r:abs(r[0]-t)); H=cv2.getPerspectiveTransform(Cu,np.float32(np.array(r[1:]).reshape(4,2))).astype(np.float64)
    return P(H,[(85,205)])[0]
def P(H,U):
    U=np.asarray(U,float); q=(H@np.c_[U,np.ones(len(U))].T).T; return q[:,:2]/q[:,2:3]
EDGES={'L':np.array([[0,0],[0,648]],float),'R':np.array([[465,0],[465,648]],float),'B':np.array([[0,648],[465,648]],float)}
def inframe(p,m=-20): return (p[:,0]>m)&(p[:,0]<2206-m)&(p[:,1]>m)&(p[:,1]<946-m)
out={}; info={}
ts=[round(61.48+0.04*i,2) for i in range(41)]
for t in ts:
    if t==61.52: continue
    He,_=eccH(t)
    if He is None: print(t,'no ecc'); continue
    f=grab(t); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    m=(cv2.GaussianBlur(g,(0,0),2)>170).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,sts,_=cv2.connectedComponentsWithStats(m); i=1+np.argmax(sts[1:,4]); m=((lab==i)*255).astype(np.uint8)
    e=cv2.Canny(m,50,150); Lh=cv2.HoughLines(e,1,np.pi/720,80)
    lines=[] if Lh is None else [tuple(l) for l in Lh[:40,0,:]]
    matched={}
    for k,E in EDGES.items():
        us=np.linspace(0,1,15); Upts=E[0]+(E[1]-E[0])*us[:,None]; q=P(He,Upts); vis=inframe(q)
        if vis.sum()<4: continue
        d=q[-1]-q[0]; nrm=np.array([-d[1],d[0]])/np.linalg.norm(d)
        best=None
        for rho,th in lines:
            nl=np.array([np.cos(th),np.sin(th)])
            if abs(nl@nrm)<np.cos(np.radians(8)): continue
            dist=np.abs(q[vis]@nl-rho).mean()
            if dist<45 and (best is None or dist<best[0]): best=(dist,rho,th)
        if best: matched[k]=(best[1],best[2],Upts[vis])
    # band points from ECC (the region the ECC template covered), where visible
    gu,gv=np.meshgrid(np.linspace(51,423,8),np.linspace(150,320,5)); B=np.c_[gu.ravel(),gv.ravel()]
    tb=P(He,B); vb=inframe(tb,0); B=B[vb]; tb=tb[vb]
    BRT=[(61.76,1600,725),(61.84,1588,735),(61.92,1575,725),(62.00,1588,720),(62.08,1605,705),(62.16,1665,650),(62.24,1725,610),(62.32,1785,595),(62.40,1835,600),(62.48,1895,605),(62.56,1955,610),(62.64,2025,612),(62.72,2100,630),(62.80,2170,640),(62.88,2240,645),(62.96,2310,650),(63.04,2380,655),(63.12,2450,660)]
    br=None
    if t>=61.76:
        tt=[r[0] for r in BRT]; br=np.array([np.interp(t,tt,[r[1] for r in BRT]),np.interp(t,tt,[r[2] for r in BRT])])
    p0=(He/He[2,2]).ravel()[:8]
    def res(p):
        H=np.append(p,1).reshape(3,3); r=list(((P(H,B)-tb)).ravel()*0.6)
        for k,(rho,th,Up) in matched.items():
            nl=np.array([np.cos(th),np.sin(th)]); r+=list((P(H,Up)@nl-rho)*1.0)
        if br is not None: r+=list((P(H,[(452,635)])[0]-br)*2.0)
        return np.array(r)
    sol=least_squares(res,p0,x_scale='jac',loss='soft_l1',f_scale=6)
    H=np.append(sol.x,1).reshape(3,3)
    C=P(H,Cu); out[t]=C.ravel().tolist()
    a,b=P(H,[(85,205),(381,205)])
    print(t,'BR',P(H,[(452,635)])[0].round(),'edges',''.join(matched),'nb',len(B),'rms %.1f'%np.sqrt(np.mean(sol.fun**2)),'text ang %.1f'%np.degrees(np.arctan2(b[1]-a[1],b[0]-a[0])),'start',a.round(),'corners',' '.join(f'({x:.0f},{y:.0f})' for x,y in C))
out[61.52]=out[61.56]
json.dump(out,open('joint.json','w'))
