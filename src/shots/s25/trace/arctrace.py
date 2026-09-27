import cv2,numpy as np,json,sys
from skimage.morphology import skeletonize
def ell_param(E,x,y):
    (cx,cy),(w,h),ang=E; a,b=w/2,h/2; t=np.radians(ang); c,s=np.cos(-t),np.sin(-t)
    dx,dy=x-cx,y-cy; u=dx*c-dy*s; v=dx*s+dy*c
    return np.arctan2(v/b,u/a), np.abs(np.hypot(u/a,v/b)-1)*min(a,b)
out={}
frames=list(range(int(sys.argv[1]),int(sys.argv[2])+1))
for f in frames:
    g=cv2.imread(f'src/f{f:05d}.png',0).astype(np.float32)
    gb=cv2.GaussianBlur(g,(0,0),1.2)
    th=gb-cv2.morphologyEx(gb,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    m=((gb>170)&(th>60)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    sk=skeletonize(m>0).astype(np.uint8)
    dt=cv2.distanceTransform(m,cv2.DIST_L2,3)
    n,lab,st,_=cv2.connectedComponentsWithStats(sk,connectivity=8)
    arcs=[]
    for i in range(1,n):
        if st[i,4]<120: continue
        ys,xs=np.nonzero(lab==i)
        if max(xs.max()-xs.min(),ys.max()-ys.min())<140: continue
        E=cv2.fitEllipse(np.stack([xs,ys],1).astype(np.float32))
        (cx,cy),(w,h),ang=E
        if min(w,h)<200 or max(w,h)>4000: continue
        t,res=ell_param(E,xs.astype(float),ys.astype(float))
        if np.median(res)>3.5: continue
        # covered param interval: sort, largest gap
        ts=np.sort(t); gaps=np.diff(np.concatenate([ts,[ts[0]+2*np.pi]])); j=int(np.argmax(gaps))
        t0=ts[(j+1)%len(ts)]; t1=ts[j]
        if t1<t0: t1+=2*np.pi
        wv=float(np.median(2*dt[ys,xs]+1)); vv=float(np.median(gb[ys,xs]))/255
        arcs.append([round(cx,1),round(cy,1),round(w/2,1),round(h/2,1),round(float(np.radians(ang)),4),round(float(t0),3),round(float(t1),3),round(wv,1),round(vv,2)])
    out[f]=arcs
    print(f'{f/25:.2f}', len(arcs), [ (a[0],a[1],a[2],a[3], round(a[6]-a[5],2), a[7]) for a in arcs], flush=True)
    if f in (2522,2528,2560):
        vis=cv2.cvtColor(g.astype(np.uint8),cv2.COLOR_GRAY2BGR)//2
        for a in arcs:
            cx,cy,A,B,an,t0,t1,wv,vv=a
            tt=np.linspace(t0,t1,200); u=A*np.cos(tt); v=B*np.sin(tt)
            X=cx+u*np.cos(an)-v*np.sin(an); Y=cy+u*np.sin(an)+v*np.cos(an)
            cv2.polylines(vis,[np.stack([X,Y],1).astype(np.int32)],False,(0,0,255),3)
        cv2.imwrite(f'arcs{f}.jpg',cv2.resize(vis,None,fx=0.5,fy=0.5))
json.dump(out,open(f'arcs_{sys.argv[1]}.json','w'))
