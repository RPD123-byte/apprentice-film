# Per-key depth grids (ray parameter s along each key camera's pixel rays) for the room and figure key drawings.
# Room: nearest hit of the fitted planes, corrected by nearby reconstructed room points; figure: kernel regression
# of the reconstructed figure points seen in that key. Output JSON {name: {t, u0, v0, step, nu, nv, s:[...]}}
import sys,os,json,numpy as np,cv2
os.chdir('/Users/computer/rootline/apprentice-film'); sys.path.insert(0,'snapshots/s28-tools')
from geo import *
from matplotlib.path import Path
D=json.load(open('snapshots/s28-tools/sfm_phi_pitch.json'))
P=D['pts']
X=np.array([p['X'] for p in P]); err=np.array([p['err'] for p in P]); L=np.array([p['len'] for p in P])
good=(err<2.5)&(L>=5)
hu=F*X[:,0]/X[:,2]+CX; hv=F*X[:,1]/X[:,2]+CY
lidH=Path([[85,470],[905,470],[955,990],[165,990]])
deskY=0.025+0.0036*X[:,0]+0.1086*X[:,2]
is_desk=np.abs(X[:,1]-deskY)<0.015
is_lid=lidH.contains_points(np.c_[hu,hv])&(X[:,2]<0.8)
is_fig=good&(X[:,2]>0.55)&(X[:,2]<1.12)&~is_lid&~is_desk&(X[:,1]<deskY-0.01)
is_room=good&~is_fig&~is_lid&((X[:,2]>=1.12)|is_desk)
print('fig',is_fig.sum(),'room',is_room.sum())
Q=json.load(open('snapshots/s28-tools/lidquads.json'))
SO=json.load(open('snapshots/s28-tools/silh_orbit_out.json'))
def cam_t(t):
    return cam(t)
def ray_s_plane(C,d):
    best=np.full(len(d),np.inf)
    for i,pl in enumerate([BACK,RIGHT,DESK]):
        n,dd=pl; s=(dd-C@n)/(d@n); Xh=C+d*s[:,None]
        ok=s>0
        if i<2: ok&=Xh[:,1]<0.35   # walls above floor level
        best=np.where(ok&(s<best),s,best)
    return best
def grid_rays(t,u0,v0,step,nu,nv):
    C,R=cam_t(t)
    gu,gv=np.meshgrid(u0+np.arange(nu)*step,v0+np.arange(nv)*step)
    dc=np.stack([(gu.ravel()-CX)/F,(gv.ravel()-CY)/F,np.ones(gu.size)],1)
    return C,(R.T@dc.T).T,gu.ravel(),gv.ravel()
def pts_in_key(t,mask):
    C,R=cam_t(t); Xc=(R@(X[mask]-C).T).T
    u=F*Xc[:,0]/Xc[:,2]+CX; v=F*Xc[:,1]/Xc[:,2]+CY
    s=np.linalg.norm(X[mask]-C,axis=1)   # ray param with unit-norm... we use d with z=1 in cam => s = Xc.z * |d|
    return u,v,Xc[:,2]
out={}
# ---- room keys
for t in [129.32,129.52,129.72,129.92,130.12,130.32,130.52,130.72,130.92,131.12,131.6]:
    step=24; u0,v0=-264,-144; nu=(2206+528)//step+2; nv=(946+288)//step+2
    C,d,gu,gv=grid_rays(t,u0,v0,step,nu,nv)
    # param: s = depth along camera z (d has cam-z component 1 after rotation? use d from dc with z=1 -> s is cam z)
    s0=ray_s_plane(C,d)
    s0=np.where(np.isfinite(s0),s0,4.0)
    u,v,z=pts_in_key(t,is_room)
    inb=(u>-50)&(u<2256)&(v>-50)&(v<996)&(z>0.1)
    u,v,z=u[inb],v[inb],z[inb]
    s=np.empty_like(s0)
    for i in range(len(gu)):
        d2=(u-gu[i])**2+(v-gv[i])**2; w=np.exp(-d2/(2*40**2))
        w0=0.6
        s[i]=((w*z).sum()+w0*s0[i])/(w.sum()+w0)
    # keep plane depth where plane is nearer than points by a lot? (walls behind objects are fine)
    out[f"room{int(round(t*100))}"]=dict(t=t,u0=u0,v0=v0,step=step,nu=nu,nv=nv,s=np.round(s,3).tolist())
    print('room',t,'pts',len(u),'s range',s.min().round(2),s.max().round(2))
# ---- figure keys
for t in [129.32,129.52,129.72,129.92,130.12,130.32,130.52,130.72,130.92,131.12,131.44]:
    ring=np.array(max(SO[f"{t:.2f}"],key=len)) if f"{t:.2f}" in SO else None
    if ring is None:
        H=json.load(open('snapshots/s28-tools/hero_regions.json')); ring=np.array(max(H['silhouette'],key=len))
    x0,y0=ring.min(0)-48; x1,y1=ring.max(0)+48
    step=16; u0=int(x0//step*step); v0=int(y0//step*step); nu=int((x1-u0)//step)+2; nv=int((y1-v0)//step)+2
    C,d,gu,gv=grid_rays(t,u0,v0,step,nu,nv)
    u,v,z=pts_in_key(t,is_fig)
    inb=(u>x0-100)&(u<x1+100)&(v>y0-100)&(v<y1+100)&(z>0.1)
    u,v,z=u[inb],v[inb],z[inb]
    zmed=np.median(z)
    s=np.empty(len(gu))
    for i in range(len(gu)):
        d2=(u-gu[i])**2+(v-gv[i])**2; w=np.exp(-d2/(2*45**2))
        s[i]=((w*z).sum()+0.3*zmed)/(w.sum()+0.3)
    out[f"fig{int(round(t*100))}"]=dict(t=t,u0=u0,v0=v0,step=step,nu=nu,nv=nv,s=np.round(s,3).tolist())
    print('fig',t,'pts',len(u),'zmed',round(zmed,3),'grid',nu,nv)
json.dump(out,open('snapshots/s28-tools/depthgrids.json','w'),separators=(',',':'))
