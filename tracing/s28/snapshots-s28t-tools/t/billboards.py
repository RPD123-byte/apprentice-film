# Objects standing on the desk (not on any fitted plane): vertical billboards through their measured base point.
# Post-processes depthgrids.json room grids: vertices whose ray hits the billboard rectangle get its depth.
import sys,os,json,numpy as np
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0,'snapshots/s28t-tools/t')
from geo import *
# (key time where measured, bbox x0,y0,x1,y1 in that frame, base pixel)
OBJ=[(129.32,(1774,585,1928,741),(1837,738),130.13),   # the mug on the right of the desk (base on the desk)
     (129.32,(74,586,216,834),0.96,129.73)]            # the chair back behind his left elbow (triangulated depth)
G=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'snapshots/s28t-tools/t/depthgrids.json'))
for (tm,(x0,y0,x1,y1),base,tmax) in OBJ:
    if isinstance(base,float):
        C0,R0=cam(tm); cxy=np.array([(x0+x1)/2,(y0+y1)/2])
        B=C0+(R0.T@np.array([(cxy[0]-CX)/F,(cxy[1]-CY)/F,1]))*base
    else: B=hit(tm,np.array([base],float),DESK)[0]
    C,_=cam(tm); v=C-B; v[1]=0; nrm=v/np.linalg.norm(v)            # billboard faces the measuring camera
    # world rectangle: rays through the bbox corners hit the billboard plane
    d=nrm@B
    pl=(nrm,d)
    Cc=hit(tm,np.array([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],float),pl)
    right=(Cc[1]-Cc[0]); up=(Cc[0]-Cc[3])
    for name,g in G.items():
        if not name.startswith('room') or g['t']>tmax: continue
        t=g['t']; Ck,Rk=cam(t)
        u0,v0,st,nu,nv=g['u0'],g['v0'],g['step'],g['nu'],g['nv']
        gu,gv=np.meshgrid(u0+np.arange(nu)*st,v0+np.arange(nv)*st)
        dc=np.stack([(gu.ravel()-CX)/F,(gv.ravel()-CY)/F,np.ones(gu.size)],1); dw=(Rk.T@dc.T).T
        s=(d-Ck@nrm)/(dw@nrm); X=Ck+dw*s[:,None]
        a=(X-Cc[3])@right/(right@right); b=(X-Cc[3])@up/(up@up)
        inside=(s>0)&(a>-0.04)&(a<1.04)&(b>-0.02)&(b<1.04)
        S=np.array(g['s'])
        zc=(Rk@(X-Ck).T).T[:,2]
        n=inside.sum()
        S[inside]=np.minimum(S[inside],zc[inside])
        g['s']=np.round(S,3).tolist()
        if n: print(name,'mug vertices',n)
json.dump(G,open(sys.argv[1] if len(sys.argv)>1 else 'snapshots/s28t-tools/t/depthgrids.json','w'),separators=(',',':'))
