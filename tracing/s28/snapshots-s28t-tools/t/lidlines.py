# Track the laptop lid's four edges per source frame by robust line fits to the lid mask boundary.
import cv2,numpy as np,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def mask_at(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read()
    g=cv2.medianBlur(f,5).astype(np.int16)
    mx=g.max(2); mn=g.min(2)
    m=((mx<110)&(mn>45)&(mx-mn<22)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    n_,lab,st,_=cv2.connectedComponentsWithStats(m)
    i=1+np.argmax(st[1:,4]); m=(lab==i).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((31,31),np.uint8))
    return m,f
def fitline(P):
    # total least squares with iterative trimming
    for it in range(4):
        cx=P.mean(0); U,S,Vt=np.linalg.svd(P-cx); d=Vt[0]; nrm=np.array([-d[1],d[0]])
        r=np.abs((P-cx)@nrm)
        if it<3:
            k=r<max(2.0,np.percentile(r,80)); P=P[k]
    return cx,d
def inter(l1,l2):
    (p,d),(q,e)=l1,l2
    A=np.array([d,-e]).T; s=np.linalg.solve(A,q-p); return p+s[0]*d
def lineof(a,b): a=np.array(a,float); b=np.array(b,float); return a,(b-a)/np.linalg.norm(b-a)
out={}
# initial quad (129.28) from hand measurements: TL TR BR BL
Q=np.array([[1375,332],[1775,357],[1612,812],[1215,895]],float)
n0=int(round(129.28*25)); n1=int(round(131.40*25))
for n in range(n0,n1+1):
    m,f=mask_at(n)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    C=max(cs,key=cv2.contourArea).reshape(-1,2).astype(float)
    C=C[(C[:,0]>3)&(C[:,0]<2202)&(C[:,1]>3)&(C[:,1]<942)]
    lines=[]
    for k in range(4):
        a,b=Q[k],Q[(k+1)%4]
        p,d=lineof(a,b); nrm=np.array([-d[1],d[0]])
        L=np.linalg.norm(b-a)
        s=(C-p)@d; r=(C-p)@nrm
        sel=(np.abs(r)<30)&(s>0.12*L)&(s<0.88*L)
        if sel.sum()>=15:
            lines.append(fitline(C[sel]))
        else:
            lines.append((p,d))   # keep predicted
    newQ=np.array([inter(lines[(k-1)%4],lines[k]) for k in range(4)])
    # sanity: limit jumps
    if np.abs(newQ-Q).max()<200: Q=newQ
    out[f"{n/25:.2f}"]=Q.round(1).tolist()
    o=f.copy(); cv2.polylines(o,[np.int32(Q).reshape(-1,1,2)],True,(0,0,255),3)
    if n%5==0: cv2.imwrite(f'snapshots/s28-study/lidl-{n/25:.2f}.jpg',cv2.resize(o,None,fx=0.35,fy=0.35))
    print(f"{n/25:.2f} {Q.round(0).tolist()}",flush=True)
json.dump(out,open('snapshots/s28t-tools/t/lidquads.json','w'))
