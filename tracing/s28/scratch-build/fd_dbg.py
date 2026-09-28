import sys,os,numpy as np,cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0,'snapshots/s28-tools')
import importlib.util
src=open('snapshots/s28-tools/flowdepth.py').read().split("pairs={")[0]
exec(src)
tk=129.32; tjs=[129.40,129.24]
gk=gray(tk); H,W=gk.shape; step=4
ys,xs=np.mgrid[0:H:step,0:W:step]; uv=np.stack([xs.ravel(),ys.ravel()],1).astype(np.float64)
Ck,Rk=cam(tk)
dc=np.stack([(uv[:,0]-CX)/F,(uv[:,1]-CY)/F,np.ones(len(uv))],1); dw=(Rk.T@dc.T).T
for tj in tjs:
    gj=gray(tj); fw=dis.calc(gk,gj,None); bw=dis.calc(gj,gk,None)
    fx=fw[ys,xs].reshape(-1,2); tgt=uv+fx
    tx=np.clip(tgt[:,0],0,W-1).astype(int); ty=np.clip(tgt[:,1],0,H-1).astype(int)
    fb=np.linalg.norm(fx+bw[ty,tx],axis=1)
    print(tj,'fb<1.5 frac',(fb<1.5).mean(),(fb<3).mean(),'median flow',np.median(np.abs(fx),0))
    Cj,Rj=cam(tj)
    cost=np.zeros((len(uv),len(S)))
    for si,s in enumerate(S):
        X=Ck+dw*s; q=(Rj@(X-Cj).T).T
        pu=F*q[:,0]/q[:,2]+CX; pv=F*q[:,1]/q[:,2]+CY
        cost[:,si]=(pu-tgt[:,0])**2+(pv-tgt[:,1])**2
    cmin=cost.min(1); print('  cmin percentiles',np.percentile(cmin,[10,50,90]).round(2))
    best=S[np.argmin(cost,1)]; print('  depth percentiles',np.percentile(best,[10,50,90]).round(2))
    # vertical residual: epipolar consistency
