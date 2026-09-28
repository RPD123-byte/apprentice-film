import cv2,numpy as np,json
ELL={'E1':(777,440,652,350,0.248),'E2':(1601,527,350,150,3.84),'E3':(1097,427,940,364,-0.004),'E3b':(1080,420,850,300,-0.02)}
WIN={'E1':(2515,2535),'E2':(2515,2535),'E3':(2551,2570),'E3b':(2555,2570)}
def amask(f):
    g=cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32); gb=cv2.GaussianBlur(g,(0,0),1.2)
    th=gb-cv2.morphologyEx(gb,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    m=((gb>165)&(th>55)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    keep=np.zeros_like(m)
    for i in range(1,n):
        if max(st[i,2],st[i,3])>=70: keep[lab==i]=1
    return keep,gb
def dist(E,x,y):
    cx,cy,a,b,t=E; c,s=np.cos(-t),np.sin(-t); dx,dy=x-cx,y-cy; u=dx*c-dy*s; v=dx*s+dy*c
    r=np.hypot(u/a,v/b); return np.abs(r-1)*np.sqrt((a*a+b*b)/2)*0.9, np.arctan2(v/b,u/a)
def pt(E,p):
    cx,cy,a,b,t=E; u=a*np.cos(p); v=b*np.sin(p); return cx+u*np.cos(t)-v*np.sin(t), cy+u*np.sin(t)+v*np.cos(t)
M={}
for k,(a0,a1) in WIN.items():
    for f in range(a0,a1+1):
        if f not in M: M[f]=amask(f)
fitted={}
for k,E in ELL.items():
    a0,a1=WIN[k]
    for it,tol in enumerate([25,15,8]):
        X=[];Y=[]
        for f in range(a0,a1+1):
            ys,xs=np.nonzero(M[f][0]); d,_=dist(E,xs.astype(float),ys.astype(float)); sel=d<tol
            X+=xs[sel].tolist(); Y+=ys[sel].tolist()
        if len(X)<50: break
        (cx,cy),(w,h),ang=cv2.fitEllipse(np.stack([X,Y],1).astype(np.float32))
        a,b,t=w/2,h/2,np.radians(ang)
        if a<b: a,b,t=b,a,t+np.pi/2
        E=(cx,cy,a,b,t)
    fitted[k]=[round(float(v),3) for v in E]
    print(k,'fitted',fitted[k],'n',len(X))
# per-frame visible intervals
res={}
for f in sorted(M):
    m,gb=M[f]; md=cv2.dilate(m,np.ones((5,5),np.uint8)); dt=cv2.distanceTransform(m,cv2.DIST_L2,3)
    row=[]
    for k,E in fitted.items():
        a0,a1=WIN[k]
        if not (a0<=f<=a1): continue
        P=np.linspace(-np.pi,np.pi,721)[:-1]
        x,y=pt(E,P); ok=np.zeros(len(P),bool); wv=np.zeros(len(P)); vv=np.zeros(len(P))
        for i,(xx,yy) in enumerate(zip(x,y)):
            xi,yi=int(round(xx)),int(round(yy))
            if 0<=xi<2206 and 0<=yi<946 and md[yi,xi]:
                ok[i]=True; y0,y1,x0,x1=max(0,yi-4),yi+5,max(0,xi-4),xi+5
                wv[i]=2*dt[y0:y1,x0:x1].max()+1; vv[i]=gb[y0:y1,x0:x1].max()/255
        # close gaps < 8 deg (16 samples), circular
        n=len(P); okc=ok.copy()
        if ok.any():
            idx=np.nonzero(ok)[0]
            for j in range(len(idx)):
                a=idx[j]; b=idx[(j+1)%len(idx)]; gap=(b-a)%n
                if 1<gap<=16:
                    for q in range(1,gap): okc[(a+q)%n]=True
        # intervals
        ivs=[]
        if okc.all(): ivs=[(0,n-1)]
        elif okc.any():
            st=np.nonzero(okc&~np.roll(okc,1))[0]
            for s0 in st:
                e=s0
                while okc[(e+1)%n]: e+=1
                ivs.append((s0,e))
        for s0,e in ivs:
            L=e-s0+1
            if L<14: continue
            sel=[(s0+q)%n for q in range(L)]
            w=float(np.median(wv[sel][wv[sel]>0])) if (wv[sel]>0).any() else 6
            v=float(np.median(vv[sel][vv[sel]>0])) if (vv[sel]>0).any() else 0.9
            row.append([k,round(float(P[s0%n]),3),round(float(P[s0%n]+L*(2*np.pi/n)),3),round(w,1),round(v,2)])
    res[f]=row
    print(f'{f/25:.2f}',[(r[0],round(r[2]-r[1],2),r[3]) for r in row])
json.dump({'ell':fitted,'frames':res},open('arcfit.json','w'))
