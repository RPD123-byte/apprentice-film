# dshards.py F : shards of the D key frame = rigid pieces of the stage page.
#   1. cluster the per-patch candidate matches (patchesK-F.json) into consistent similarities (seeded region growing)
#   2. per-pixel labels: local NCC of the frame against the stage page warped by each shard's similarity
#   3. polygons per shard (frame coords) + the similarity stage->frame; also the dark (black) pieces
import cv2, numpy as np, json, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
F=int(sys.argv[1])
R=json.load(open(f'patchesK-{F}.json'))
P=np.array([[r[0],r[1]] for r in R]); C=[r[2] for r in R]; n=len(R)
def Mt(c,p):
    sc,s,rot,qx,qy=c; a=np.radians(rot)
    M=np.array([[s*np.cos(a),-s*np.sin(a)],[s*np.sin(a),s*np.cos(a)]]); return M, np.array(p)-M@np.array([qx,qy])
def fitsim(Q,Pp):
    # least-squares similarity Q->Pp
    Q=np.array(Q,float); Pp=np.array(Pp,float)
    M,_=cv2.estimateAffinePartial2D(Q.astype(np.float32),Pp.astype(np.float32),method=cv2.LMEDS)
    return M[:,:2],M[:,2]
assigned=-np.ones(n,int); pick=[None]*n; clusters=[]
seeds=sorted([(c[0],i,j) for i in range(n) for j,c in enumerate(C[i])],reverse=True)
STR=32
for sc,i,j in seeds:
    if sc<0.8: break
    if assigned[i]>=0: continue
    M,t=Mt(C[i][j],P[i]); s0,r0=C[i][j][1],C[i][j][2]
    mem=[(i,j)]; used={i}
    for rnd in range(3):
        grow=True
        while grow:
            grow=False
            for k in range(n):
                if k in used or assigned[k]>=0: continue
                if min(np.hypot(*(P[k]-P[m])) for m,_ in mem)>STR*1.5+1: continue
                for jj,c in enumerate(C[k]):
                    if c[0]<0.6: continue
                    pred=M@np.array(c[3:5])+t
                    if np.hypot(*(pred-P[k]))<9 and abs(c[1]-s0)<0.35 and abs(c[2]-r0)<13:
                        mem.append((k,jj)); used.add(k); grow=True; break
        if len(mem)>=3:
            M,t=fitsim([C[k][jj][3:5] for k,jj in mem],[P[k] for k,jj in mem])
    if len(mem)>=3:
        cid=len(clusters)
        for k,jj in mem: assigned[k]=cid; pick[k]=jj
        s=float(np.hypot(M[0,0],M[1,0])); a=float(np.degrees(np.arctan2(M[1,0],M[0,0])))
        clusters.append({'M':M.tolist(),'t':t.tolist(),'n':len(mem),'s':s,'rot':a,'members':[int(k) for k,_ in mem]})
print(len(clusters),'shards; patches assigned',int((assigned>=0).sum()),'/',n)
print(sorted([c['n'] for c in clusters])[::-1][:40])
json.dump(clusters,open(f'shards-{F}.json','w'))
# ---- per-pixel labels
cap=cv2.VideoCapture(V); cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
Wn=17
def lstats(x):
    m=cv2.boxFilter(x,-1,(Wn,Wn)); v=cv2.boxFilter(x*x,-1,(Wn,Wn))-m*m; return m,np.sqrt(np.maximum(v,1))
mg,sg=lstats(g)
best=np.full(g.shape,-1.0,np.float32); lab=-np.ones(g.shape,np.int32)
for cid,c in enumerate(clusters):
    M=np.hstack([np.array(c['M']),np.array(c['t'])[:,None]]).astype(np.float32)
    w=cv2.warpAffine(A,M,(2206,946),flags=cv2.INTER_LINEAR,borderValue=-999)
    valid=cv2.erode((w>-900).astype(np.uint8),np.ones((5,5),np.uint8))>0
    w[~valid]=0
    mw,sw=lstats(w)
    ncc=(cv2.boxFilter(g*w,-1,(Wn,Wn))-mg*mw)/(sg*sw)
    ncc[~valid]=-1
    upd=ncc>best; best[upd]=ncc[upd]; lab[upd]=cid
lab[best<0.45]=-1
# black pieces: dark and flat, not matched
dark=(cv2.GaussianBlur(g,(0,0),3)<28)&(sg<10)&(lab<0)
np.save(f'lab-{F}.npy',lab); np.save(f'dark-{F}.npy',dark)
rng=np.random.default_rng(2); cols=rng.integers(50,255,(len(clusters)+1,3)).astype(np.uint8)
vis=np.zeros(f.shape,np.uint8); vis[lab>=0]=cols[lab[lab>=0]]; vis[dark]=(40,40,40)
cv2.imwrite(f'labels-{F}.jpg',cv2.resize(np.vstack([vis,f]),(1103,946)))
print('labelled px',int((lab>=0).sum()),'dark px',int(dark.sum()))
