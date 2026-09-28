import json, numpy as np, cv2
from pose import pose_from_H, load_H, K
Hs=load_H(); BG={float(t):np.array(v) for t,v in json.load(open('bgH.json')).items()}
S=30.4/2206
R0,t0,_=pose_from_H(Hs[119.6])
# camera centre and world frame = screen coords (cm) at 119.6 (screen assumed static in world)
def cam(t):
    R,tv,_=pose_from_H(Hs[t]); return R,tv
# sample wall points: pixels at 119.6 back-projected to a plane parallel to the screen at depth z=d (cm, +z = behind screen?)
pts=np.float32([[x,y] for x in range(150,1650,150) for y in range(30,540,90)])
Kinv=np.linalg.inv(K)
def backproj(p,R,tv,d):
    # ray in camera coords -> world (screen coords): X = R^T (s*r - tv); plane z=d
    r=Kinv@np.array([p[0],p[1],1.0]); A=R.T@r; B=-R.T@tv
    s=(d-B[2])/A[2]; return A*s+B
for d in [-60,-40,-20,-10,0]:
    errs=[]
    for t in [120.4,121.2,122.0,122.8,123.6,124.4,125.2,126.0]:
        R,tv=cam(t)
        W=[backproj(p,R0,t0,d) for p in pts]
        proj=np.array([ (K@(R@w+tv)) for w in W]); proj=proj[:,:2]/proj[:,2:]
        obs=cv2.perspectiveTransform(pts[None],BG[t])[0]
        errs.append(np.median(np.linalg.norm(proj-obs,axis=1)))
    print('d',d,' '.join(f'{e:6.1f}' for e in errs))
