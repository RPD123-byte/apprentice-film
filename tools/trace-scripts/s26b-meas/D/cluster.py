import json, numpy as np, cv2, sys
F=int(sys.argv[1]); thr=float(sys.argv[2]) if len(sys.argv)>2 else 10
R=np.array(json.load(open(f'patches-{F}.json')))
good=R[R[:,2]>0.72]
def T(r):
    px,py,sc,s,rot,qx,qy=r; a=np.radians(rot)
    M=np.array([[s*np.cos(a),-s*np.sin(a)],[s*np.sin(a),s*np.cos(a)]])
    return M, np.array([px,py])-M@np.array([qx,qy])
Ts=[T(r) for r in good]; n=len(good)
lab=-np.ones(n,int); c=0
for i in np.argsort(-good[:,2]):
    if lab[i]>=0: continue
    lab[i]=c; members=[i]; changed=True
    while changed:
        changed=False
        for j in range(n):
            if lab[j]>=0: continue
            if min(np.hypot(*(good[j,0:2]-good[m,0:2])) for m in members)>50: continue
            # consistent with the cluster's best transform (the seed) and with the nearest member
            M,t=Ts[i]; pred=M@good[j,5:7]+t
            if np.hypot(*(pred-good[j,0:2]))<thr and abs(good[j,3]-good[i,3])<0.3:
                lab[j]=c; members.append(j); changed=True
    c+=1
sizes=np.bincount(lab); print(c,'clusters; sizes',sorted(sizes)[::-1][:40], 'patches in clusters>=3:',sum(s for s in sizes if s>=3),'/',n)
json.dump({'patches':good.tolist(),'lab':lab.tolist()},open(f'clusters-{F}.json','w'))
cap=cv2.VideoCapture('/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'); cap.set(1,F); ok,f=cap.read(); f=(f*0.5).astype(np.uint8)
rng=np.random.default_rng(3); cols=rng.integers(60,255,(c,3))
for k,r in enumerate(good):
    col=tuple(int(v) for v in cols[lab[k]]) if sizes[lab[k]]>=3 else (80,80,80)
    cv2.circle(f,(int(r[0]),int(r[1])),11,col,-1)
cv2.imwrite(f'clusters-{F}.jpg',cv2.resize(f,(1103,473)))
