# Per-plane homography chains (hero/final frame coords -> frame t), from KLT tracks whose SfM 3D point lies on the plane.
import sys,json,numpy as np,cv2
sys.path.insert(0,'snapshots/s28-tools')
from geo import *
K=json.load(open('snapshots/s28-tools/klt.json')); n0=K['n0']
S=json.load(open('snapshots/s28-tools/sfm_phi_pitch.json'))
first={}
for tr in K['tracks']:
    s,x,y=tr[0]; first[(s,round(x,1),round(y,1))]=tr
tracks=[]
for p in S['pts']:
    key=(p['s'],round(p['u'],1),round(p['v'],1))
    if key in first and p['err']<3: tracks.append((np.array(p['X']),first[key]))
print('tracks with 3D',len(tracks))
def on_plane(X,pl,tol): n,d=pl; return abs(X@n-d)<tol
planes={'back':(BACK,0.12),'right':(RIGHT,0.12),'desk':(DESK,0.05)}
nF=int(round(131.36*25))-n0
NK=max(o[0] for _,tr in tracks for o in tr)+1
out={}
for name,(pl,tol) in planes.items():
    sel=[tr for X,tr in tracks if on_plane(X,pl,tol)]
    # observations per frame
    obs={}
    for i,tr in enumerate(sel):
        for (k,x,y) in tr: obs.setdefault(k,{})[i]=(x,y)
    H={nF:np.eye(3)}; Hc=np.eye(3)
    for k in range(nF,0,-1):
        a=obs.get(k,{}); b=obs.get(k-1,{})
        common=[i for i in a if i in b]
        if len(common)<8:
            H[k-1]=Hc.copy(); print(name,'frame',(n0+k-1)/25,'few',len(common)); continue
        A=np.float32([a[i] for i in common]); B=np.float32([b[i] for i in common])
        if np.abs(A-B).max()<0.3: H[k-1]=Hc.copy(); continue
        h,inl=cv2.findHomography(A,B,cv2.RANSAC,1.5)
        if h is None: H[k-1]=Hc.copy(); continue
        Hc=h@Hc; Hc/=Hc[2,2]; H[k-1]=Hc.copy()
    # frames after nF: identity
    for k in range(nF,NK): H[k]=np.eye(3)
    out[name]={f"{(n0+k)/25:.2f}":H[k].tolist() for k in sorted(H)}
    # report a hero point's trajectory
    def ap(Hm,p): v=Hm@np.array([p[0],p[1],1.0]); return (v[:2]/v[2]).round(1)
    pt={'back':(400,300),'right':(1900,300),'desk':(1700,880)}[name]
    print(name,len(sel),'tracks;',' '.join(f"{(n0+k)/25:.2f}:{ap(H[k],pt)}" for k in range(0,nF+1,6)))
json.dump(out,open('snapshots/s28-tools/planeH.json','w'))
