# Lid quad per frame: manual keys (read on gridded frames), interpolated, then each edge refined by a robust line fit
# to the lid mask boundary within +-16 px of the prediction.
import cv2,numpy as np,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
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
c=cv2.VideoCapture(V)
def mask_at(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read()
    g=cv2.medianBlur(f,5).astype(np.int16)
    mx=g.max(2); mn=g.min(2)
    m=((mx<140)&(mn>40)&(mx-mn<24)).astype(np.uint8)*255
    return m,f
def fitline(P):
    for it in range(4):
        cx=P.mean(0); U,S,Vt=np.linalg.svd(P-cx); d=Vt[0]; nrm=np.array([-d[1],d[0]])
        r=np.abs((P-cx)@nrm)
        if it<3: P=P[r<max(1.5,np.percentile(r,75))]
    return cx,d
def inter(l1,l2):
    (p,d),(q,e)=l1,l2
    A=np.array([d,-e]).T; s=np.linalg.solve(A,q-p); return p+s[0]*d
out={}
n0=int(round(129.28*25)); n1=int(round(131.40*25))
for n in range(n0,n1+1):
    t=n/25; Q=interp(t)
    m,f=mask_at(n)
    # boundary of mask: gradient of mask
    edges=cv2.morphologyEx(m,cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))
    ys,xs=np.nonzero(edges); E=np.stack([xs,ys],1).astype(float)
    E=E[(E[:,0]>3)&(E[:,0]<2202)&(E[:,1]>3)&(E[:,1]<942)]
    lines=[]; info=[]
    for k in range(4):
        a,b=Q[k],Q[(k+1)%4]; d=(b-a)/np.linalg.norm(b-a); nrm=np.array([-d[1],d[0]]); L=np.linalg.norm(b-a)
        s=(E-a)@d; r=(E-a)@nrm
        sel=(np.abs(r)<16)&(s>0.15*L)&(s<0.85*L)
        if sel.sum()>40:
            p,dd=fitline(E[sel])
            # reject if the fitted line deviates in angle a lot
            if abs(dd@d)>0.995: lines.append((p,dd)); info.append(int(sel.sum())); continue
        lines.append((a,d)); info.append(0)
    Qn=np.array([inter(lines[(k-1)%4],lines[k]) for k in range(4)])
    out[f"{t:.2f}"]=Qn.round(1).tolist()
    print(f"{t:.2f} {Qn.round(0).astype(int).tolist()} pts={info}")
    if n%5==0:
        o=f.copy(); cv2.polylines(o,[np.int32(Qn).reshape(-1,1,2)],True,(0,0,255),2)
        cv2.imwrite(f'snapshots/s28-study/lidr-{t:.2f}.jpg',cv2.resize(o,None,fx=0.35,fy=0.35))
json.dump(out,open('snapshots/s28t-tools/t/lidquads.json','w'))
