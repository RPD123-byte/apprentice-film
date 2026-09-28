# Dense two-view depth for the s28 key frames: DIS optical flow from the key frame to neighbour frames, triangulated
# with the solved cameras (static-scene assumption), robustly pooled onto each key's depth grid.
# Writes depthgrids_flow.json with the same layout as depthgrids.json (grids replaced where flow depth is reliable).
import sys,os,json,numpy as np,cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0,'snapshots/s28t-tools/t')
from geo import *
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def gray(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
dis.setFinestScale(1)
G=json.load(open('snapshots/s28t-tools/t/depthgrids.json'))
S=np.exp(np.linspace(np.log(0.2),np.log(5.0),300))
def depth_map(tk,tjs,step=4):
    gk=gray(tk); H,W=gk.shape
    ys,xs=np.mgrid[0:H:step,0:W:step]; uv=np.stack([xs.ravel(),ys.ravel()],1).astype(np.float64)
    Ck,Rk=cam(tk)
    dc=np.stack([(uv[:,0]-CX)/F,(uv[:,1]-CY)/F,np.ones(len(uv))],1); dw=(Rk.T@dc.T).T
    cost=np.zeros((len(uv),len(S))); ok=np.ones(len(uv),bool); nuse=0
    for tj in tjs:
        gj=gray(tj)
        fw=dis.calc(gk,gj,None); bw=dis.calc(gj,gk,None)
        fx=fw[ys,xs].reshape(-1,2)
        tgt=uv+fx
        # forward-backward check
        tx=np.clip(tgt[:,0],0,W-1).astype(int); ty=np.clip(tgt[:,1],0,H-1).astype(int)
        back=bw[ty,tx]
        fb=np.linalg.norm(fx+back,axis=1)
        good=fb<1.5
        Cj,Rj=cam(tj)
        for si,s in enumerate(S):
            X=Ck+dw*s; q=(Rj@(X-Cj).T).T
            pu=F*q[:,0]/q[:,2]+CX; pv=F*q[:,1]/q[:,2]+CY
            cost[:,si]+=np.where(good,np.minimum((pu-tgt[:,0])**2+(pv-tgt[:,1])**2,400),0)
        ok&=good; nuse+=1
    best=S[np.argmin(cost,1)]
    # confidence: the cost curve must have a clear minimum (parallax large enough)
    cmin=cost.min(1); c2=np.sort(cost,1)[:,min(30,len(S)-1)]
    conf=ok&(cmin<4*nuse)&((c2-cmin)>2.0)
    # camera z of the point: s is along dw whose cam-z is 1 -> s is cam-z depth
    return uv,best,conf,(H,W,step)
pairs={129.32:[129.44,129.2],129.52:[129.64,129.40],129.72:[129.84,129.60],129.92:[130.04,129.80],130.12:[130.24,130.0],
       130.32:[130.44,130.20],130.52:[130.64,130.40],130.72:[130.84,130.60],130.92:[131.08,130.76],131.12:[130.92,130.96]}
out=json.load(open('snapshots/s28t-tools/t/depthgrids.json'))
for tk,tjs in pairs.items():
    uv,s,conf,(H,W,step)=depth_map(tk,tjs)
    D=np.full((H//step+(H%step>0),W//step+(W%step>0)),np.nan); D.ravel()[:]=np.where(conf,s,np.nan)
    for kind in ('room','fig'):
        name=f"{kind}{int(round(tk*100))}"
        if name not in out: continue
        g=out[name]; u0,v0,st,nu,nv=g['u0'],g['v0'],g['step'],g['nu'],g['nv']
        old=np.array(g['s']).reshape(nv,nu); new=old.copy(); cnt=0
        R=st  # pooling radius
        for j in range(nv):
            for i in range(nu):
                u=u0+i*st; v=v0+j*st
                a0=max(0,int((v-R)//step)); a1=min(D.shape[0],int((v+R)//step)+1)
                b0=max(0,int((u-R)//step)); b1=min(D.shape[1],int((u+R)//step)+1)
                w=D[a0:a1,b0:b1]; w=w[np.isfinite(w)]
                if w.size>=max(4,0.3*(a1-a0)*(b1-b0)):
                    m=np.median(w)
                    # figure keys: trust flow only within a sane band around the old (track) depth
                    if kind=='fig' and abs(m-old[j,i])>0.25: continue
                    new[j,i]=m; cnt+=1
        g['s']=np.round(new,3).ravel().tolist()
        print(name,'flow-depth vertices',cnt,'of',nu*nv,'median change',np.round(np.median(np.abs(new-old)),3))
json.dump(out,open('snapshots/s28t-tools/t/depthgrids_flow.json','w'),separators=(',',':'))
