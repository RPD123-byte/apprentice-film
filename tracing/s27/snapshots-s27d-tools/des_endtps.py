# End orbit (127.6–129.32): the KLT mesh degrades as the source redraws him turning, so the mesh after 127.6 is
# replaced by a thin-plate-spline warp of the 127.6 mesh driven by 16 landmarks read by eye on gridded frames
# (snapshots/s27d-study/L_*.jpg) at 128.2, 128.6, 129.0, 129.32 (interpolated with Catmull-Rom between keys).
import json, numpy as np
J=json.load(open('../s27d-meas/des_mesh3.json'))
X0,Y0,X1,Y1,GX,GY=J['grid']
F={round(r[0],2):np.array(r[1:]).reshape(-1,2) for r in J['frames']}
xs=np.linspace(X0,X1,GX); ys=np.linspace(Y0,Y1,GY); nodes=np.array([[x,y] for y in ys for x in xs])
def apply(N,P):
    P=np.float64(P); fx=np.clip((P[:,0]-X0)/(X1-X0)*(GX-1),0,GX-1-1e-6); fy=np.clip((P[:,1]-Y0)/(Y1-Y0)*(GY-1),0,GY-1-1e-6)
    i=np.floor(fx).astype(int); j=np.floor(fy).astype(int); u=fx-i; v=fy-j
    return N[j*GX+i]*((1-u)*(1-v))[:,None]+N[j*GX+i+1]*(u*(1-v))[:,None]+N[(j+1)*GX+i]*((1-u)*v)[:,None]+N[(j+1)*GX+i+1]*(u*v)[:,None]
# landmarks: 125.0 reference position, then 128.2, 128.6, 129.0, 129.32 (frame px)
LM=[ # name, ref, 128.2, 128.6, 129.0, 129.32
 ('beanieTop',(829,89),(850,102),(930,102),(1000,112),(1080,112)),
 ('beanieR',(1075,325),(1110,330),(1155,330),(1220,320),(1285,340)),
 ('cuffEnd',(990,510),(1005,520),(1050,530),(1110,520),(1175,510)),
 ('cuffL',(640,250),(665,245),(715,245),(790,255),(855,250)),
 ('eyeU',(777,390),(800,415),(840,420),(895,400),(958,390)),
 ('eyeL',(864,506),(900,520),(948,530),(1000,520),(1068,525)),
 ('smile',(680,498),(690,508),(735,508),(790,515),(860,520)),
 ('nose',(774,538),(780,535),(825,535),(885,535),(955,535)),
 ('cup',(533,518),(560,520),(585,510),(650,510),(705,485)),
 ('collar',(455,250),(500,265),(540,285),(640,285),(690,270)),
 ('shoulder',(322,263),(360,270),(400,268),(420,265),(480,255)),
 ('sleeveEnd',(766,833),(780,830),(745,830),(675,840),(625,830)),
 ('sleeveMid',(580,890),(600,900),(560,900),(460,895),(420,870)),
 ('cuffR',(1032,650),(1085,640),(1140,650),(1195,670),(1245,680)),
 ('hand',(900,700),(930,730),(960,730),(980,755),(1000,760)),
 ('chin',(720,604),(740,618),(760,620),(820,615),(880,600)),
 ('back1',(160,310),(150,305),(170,340),(200,370),(320,370)),
 ('back2',(3,459),(0,460),(60,510),(100,520),(270,540)),
]
KT=[128.2,128.6,129.0,129.32]
REF=np.array([l[1] for l in LM],float)
L76=apply(F[127.6],REF)          # landmarks where the mesh puts them at 127.6
KEYS=[(127.6,L76)]+[(t,np.array([l[2+k] for l in LM],float)) for k,t in enumerate(KT)]
def lm_at(t):
    ts=[k[0] for k in KEYS]
    if t<=ts[0]: return KEYS[0][1]
    if t>=ts[-1]: return KEYS[-1][1]
    i=max(k for k in range(len(ts)) if ts[k]<=t)
    p1,p2=KEYS[i][1],KEYS[i+1][1]; p0=KEYS[max(0,i-1)][1]; p3=KEYS[min(len(KEYS)-1,i+2)][1]
    u=(t-ts[i])/(ts[i+1]-ts[i])
    return 0.5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3)
def tps(src,dst,pts,reg=50.0):
    n=len(src); d=np.linalg.norm(src[:,None]-src[None],axis=2); K=np.where(d>0,d*d*np.log(d+1e-9),0)+reg*np.eye(n)
    P=np.c_[np.ones(n),src]; A=np.zeros((n+3,n+3)); A[:n,:n]=K; A[:n,n:]=P; A[n:,:n]=P.T
    b=np.zeros((n+3,2)); b[:n]=dst
    w=np.linalg.solve(A,b)
    dq=np.linalg.norm(pts[:,None]-src[None],axis=2); U=np.where(dq>0,dq*dq*np.log(dq+1e-9),0)
    return U@w[:n]+np.c_[np.ones(len(pts)),pts]@w[n:]
N76=F[127.6]
out={k:v for k,v in F.items() if k<=127.6+1e-6}
t=127.64
while t<=129.32+1e-6:
    L=lm_at(t)
    out[round(t,2)]=tps(L76,L,N76)
    t=round(t+0.04,2)
json.dump({'grid':J['grid'],'tref':J['tref'],'frames':[[k]+np.round(out[k],1).flatten().tolist() for k in sorted(out)]},open('../s27d-meas/des_mesh4.json','w'))
print('ok',len(out))
