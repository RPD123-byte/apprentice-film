# plaster_fit.py : fit the plaster model (two rounded strips: centre, angle, length, width) to the 23.04 source frame's
# dark outline lines (black-hat, inside the white head, round the plaster), by minimising the mean distance from the
# model's outline to the nearest outline pixel (chamfer) plus the reverse term. Prints the fitted strips.
import cv2, numpy as np, math
from scipy.optimize import minimize
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
g=cv2.imread(f'{SRC}/576.png',0).astype(np.float32)
x0,y0,x1,y1=1540,295,1660,385
bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
lit=cv2.GaussianBlur(g,(0,0),6)>175
E=((bh>28)&lit).astype(np.uint8)
E[:y0,:]=0;E[y1:,:]=0;E[:,:x0]=0;E[:,x1:]=0
dt=cv2.distanceTransform(1-E,cv2.DIST_L2,3)
ys,xs=np.nonzero(E); EP=np.stack([xs,ys],1).astype(np.float64)
def outline(c,a,L,w,n=60):
    th=math.radians(a); ux,uy=math.cos(th),math.sin(th); nx,ny=-uy,ux; r=w/2; h=max(0,L/2-r); pts=[]
    for k in range(n//2):
        t=-math.pi/2+math.pi*k/(n//2-1); pts.append((c[0]+ux*(h+r*math.cos(t))+nx*r*math.sin(t), c[1]+uy*(h+r*math.cos(t))+ny*r*math.sin(t)))
    for k in range(n//2):
        t=math.pi/2+math.pi*k/(n//2-1); pts.append((c[0]+ux*(-h+r*math.cos(t))+nx*r*math.sin(t), c[1]+uy*(-h+r*math.cos(t))+ny*r*math.sin(t)))
    return np.array(pts)
def dsamp(P):
    X=np.clip(P[:,0],0,g.shape[1]-1).astype(int); Y=np.clip(P[:,1],0,g.shape[0]-1).astype(int); return dt[Y,X]
def cost(q):
    A=outline((q[0],q[1]),q[2],q[3],q[4]); B=outline((q[5],q[6]),q[7],q[8],q[9])
    f=np.mean(np.minimum(dsamp(A),8))+np.mean(np.minimum(dsamp(B),8))
    M=np.vstack([A,B]); d=np.sqrt(((EP[:,None,:]-M[None,::2,:])**2).sum(-1)).min(1)
    return f+0.5*np.mean(np.minimum(d,8))
q0=[1597,340,21.5,85,16.7,1591,339,-52.5,78,15]
best=None
for da in (-4,0,4):
  for db in (-4,0,4):
    q=q0.copy(); q[2]+=da; q[7]+=db
    r=minimize(cost,q,method='Nelder-Mead',options={'maxiter':4000,'xatol':0.05,'fatol':1e-4})
    if best is None or r.fun<best.fun: best=r
q=best.x
print('cost',round(best.fun,3),'E pixels',len(EP))
print('A: c (%.1f, %.1f) a %.1f L %.1f w %.1f'%tuple(q[:5]))
print('B: c (%.1f, %.1f) a %.1f L %.1f w %.1f'%tuple(q[5:]))
im=cv2.cvtColor(g.astype(np.uint8),cv2.COLOR_GRAY2BGR)
for S in (q[:5],q[5:]):
    P=outline((S[0],S[1]),S[2],S[3],S[4]); cv2.polylines(im,[np.round(P*4).astype(np.int32)],True,(0,0,255),1,cv2.LINE_AA,shift=2)
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s04-fix2-cmp/measure/plfit.jpg',cv2.resize(im[280:400,1520:1680],None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC))
np.save('/Users/computer/rootline/apprentice-film/snapshots/s04-fix2-cmp/measure/plq.npy',q)
