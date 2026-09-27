# snap_poly.py RENDER.png BLOCK [apply] [densify]  -- register traced polygons (ORN or CLOUD) onto the source frame 764
import sys, re, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s08-f3-tools')
from snaplib import *
ORNF='/Users/computer/rootline/apprentice-film/src/shots/s08/ornaments.js'
render, block = sys.argv[1], sys.argv[2]
apply='apply' in sys.argv; densify='densify' in sys.argv
txt=open(ORNF).read()
start=txt.index(f'export const {block} = [\n'); end=txt.index('\n];',start)
pre,blk,post=txt[:start],txt[start:end],txt[end:]
NUM=r'-?\d+(?:\.\d+)?'
pat=re.compile(r'\[('+NUM+r'(?:,\s*'+NUM+r'){7,})\]')
polys=[]
for m in pat.finditer(blk):
    pts=np.array(list(map(float,m.group(1).split(',')))).reshape(-1,2)
    after=blk[m.end():m.end()+6]; fm=re.match(r',\s*(\d)\]',after)
    polys.append(dict(span=m.span(1), P=pts, flag=int(fm.group(1)) if fm else 0))
def catmull(pts, per=3):
    n=len(pts); out=[]
    for i in range(n):
        p0,p1,p2,p3=pts[(i-1)%n],pts[i],pts[(i+1)%n],pts[(i+2)%n]
        for j in range(per):
            t=j/per; t2=t*t; t3=t2*t
            out.append(0.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
    return np.array(out)
def resample(poly, step=7):
    Q=np.vstack([poly,poly[:1]]); seg=np.hypot(*np.diff(Q,axis=0).T); L=np.concatenate([[0],np.cumsum(seg)])
    n=max(8,int(L[-1]/step)); s=np.linspace(0,L[-1],n,endpoint=False)
    return np.stack([np.interp(s,L,Q[:,0]),np.interp(s,L,Q[:,1])],1)
dense=[catmull(p['P']) if p['flag']!=1 else p['P'] for p in polys]
R,_=luma(render); S,Sim=luma(SRC)
red_mask=cv2.dilate(((Sim[...,2]>140)&(Sim[...,1]<90)&(Sim[...,0]<80)).astype(np.uint8),np.ones((5,5),np.uint8))
def red(xs,ys):
    xi=np.clip(np.round(xs).astype(int),0,2205); yi=np.clip(np.round(ys).astype(int),0,945); return red_mask[yi,xi]>0
ZONES={'ORN':[[0, 100], [170, 100], [185, 150], [560, 150], [560, 320], [800, 320], [800, 590], [1110, 590], [1110, 946], [0, 946]],
       'CLOUD':[[1600, 690], [2206, 690], [2206, 946], [1600, 946]]}
ZONE=np.array(ZONES[block],np.float32)
def zone_w(p):
    d=cv2.pointPolygonTest(ZONE.reshape(-1,1,2),(float(p[0]),float(p[1])),True)
    if d<=0: return 0
    # frame edges don't count
    ed=[]
    for i in range(len(ZONE)):
        a,b=ZONE[i],ZONE[(i+1)%len(ZONE)]
        if (a[0]==b[0] and a[0] in (0,2206)) or (a[1]==b[1] and a[1] in (946,)): continue
        t=np.clip(np.dot(p-a,b-a)/np.dot(b-a,b-a),0,1); ed.append(np.hypot(*(p-(a+t*(b-a)))))
    return float(np.clip((min(ed+[99])-6)/15,0,1))
def occl(p):
    x,y=p
    if block=='ORN' and x<790 and 285<y<445: return True     # date lines on top
    if 1440<x<1922 and 172<y<840: return True                # card
    return False
def covered(i,p):
    for j in range(i+1,len(polys)):
        c=dense[j].astype(np.float32).reshape(-1,1,2)
        if cv2.pointPolygonTest(c,(float(p[0]),float(p[1])),True)>-1.0: return True
    return False
newP=[]
alld=[]
for i,p in enumerate(polys):
    if p['flag']==1:
        # straight wedge: shift each edge along its normal by the median measured at 3 points
        P=p['P']; n=len(P); shifts=[]
        for k in range(n):
            a,b=P[k],P[(k+1)%n]; t=b-a; L=np.hypot(*t); nn=np.array([-t[1]/L,t[0]/L])
            pts=np.array([a+t*f for f in (0.3,0.5,0.7)]); Ns=np.repeat(nn[None],3,0)
            d,_=measure(pts,Ns,R,S,win=6,rng=5,red=red)
            ok=[dd for dd,q in zip(d,pts) if not np.isnan(dd) and not occl(q) and not covered(i,q) and zone_w(q)>0.5]
            shifts.append((float(np.clip(np.median(ok),-2,2)) if len(ok)>=2 and L>25 else 0.0, nn))
        if apply:
            lines=[(P[k]+s*nn, (P[(k+1)%n]-P[k])) for k,(s,nn) in enumerate(shifts)]
            Q=[]
            for k in range(n):
                (p1,d1),(p2,d2)=lines[k-1],lines[k]
                A=np.array([d1,-d2]).T
                if abs(np.linalg.det(A))<1e-3: Q.append(P[k]+0.5*(shifts[k-1][0]*shifts[k-1][1]+shifts[k][0]*shifts[k][1])); continue
                tt=np.linalg.solve(A,p2-p1); q=p1+tt[0]*d1
                Q.append(q if np.hypot(*(q-P[k]))<8 else P[k])
            newP.append(np.array(Q))
        else: newP.append(P)
        alld+= [abs(s) for s,_ in shifts]
        print(f'{block}[{i}] wedge edges shifts',' '.join('%.1f'%s for s,_ in shifts))
        continue
    P=resample(dense[i],7) if densify else p['P']
    N=normals(P,True)
    # outward normals are not needed: measure() returns the shift along N whichever way it points
    d,conf=measure(P,N,R,S,win=7,rng=6,red=red)
    w=np.array([zone_w(q) for q in P])
    for k,q in enumerate(P):
        if occl(q) or covered(i,q) or w[k]==0: d[k]=np.nan
    ds=smooth(d,True,sig=1.5,maxgap=3)
    mv=np.nan_to_num(ds)*w
    v=~np.isnan(d); alld+=list(np.abs(d[v]))
    print(f'{block}[{i}] n={len(P)} meas={v.sum()} |d| mean={np.nanmean(np.abs(d)) if v.any() else 0:.2f} max={np.nanmax(np.abs(d)) if v.any() else 0:.2f} applied max {np.abs(mv).max():.2f}')
    newP.append(P+N*(0.85*mv)[:,None] if apply else P)
print('mean |d|',np.mean(alld) if alld else 0)
if apply or densify:
    out=blk; 
    for p,Q in sorted(zip(polys,newP),key=lambda z:-z[0]['span'][0]):
        s0,s1=p['span']; out=out[:s0]+','.join(f'{v:.1f}' for v in Q.ravel())+out[s1:]
    open(ORNF,'w').write(pre+out+post); print('written')
