# least-squares bilinear correction grid: per-pixel graded diff on sky pixels, through the local slope, + smoothness
import numpy as np, cv2, sys
import scipy.sparse as sp, scipy.sparse.linalg as spl
from grade import hb_map
W,H=2206,946; CS=60
s=np.load('smean138.npy')[:,:,::-1]; r=np.load(sys.argv[1])[:,:,::-1]
prev=None
if len(sys.argv)>2:  # current grid (already applied in r): fit the residual and add
    import json,re
    txt=open(sys.argv[2]).read(); arrs=re.findall(r'\[([-0-9, ]+)\]',txt)
    prev=np.array([[int(v) for v in a.split(',')] for a in arrs[-3:]],float)
raw=cv2.imread('raw/r-138.000.png')[:,:,::-1].astype(np.float32)/255
hb=hb_map(raw)
m=cv2.imread('../s40-fix1c-h/mask.png'); sky=(m[:,:,1]<10).astype(np.uint8); sky=cv2.erode(sky,np.ones((9,9),np.uint8))>0
sky[290:640,480:1720]=False
yy,xx=np.mgrid[0:H,0:W]; u=(xx+0.5)/W; v=1-(yy+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2
vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
hh=1-(1-raw)*(1-0.5*hb); gain=(0.65+2.1*hh*(1-hh))*(1-0.5*hb)*vig[...,None]
nx,ny=(W+CS-1)//CS+1,(H+CS-1)//CS+1   # grid nodes at cell centres (i+0.5)*CS, one extra to cover the far edge
# sample sky pixels on a 3 px lattice
sel=np.zeros_like(sky); sel[::3,::3]=True; sel&=sky
ys,xs=np.nonzero(sel); n=len(ys); print('samples',n)
fx=(xs+0.5)/CS-0.5; fy=(ys+0.5)/CS-0.5
ix=np.clip(np.floor(fx).astype(int),0,nx-2); iy=np.clip(np.floor(fy).astype(int),0,ny-2)
ax=np.clip(fx-ix,0,1); ay=np.clip(fy-iy,0,1)
rows=np.repeat(np.arange(n),4); cols=np.stack([iy*nx+ix,iy*nx+ix+1,(iy+1)*nx+ix,(iy+1)*nx+ix+1],1).ravel()
out=np.zeros((3,ny*nx))
lam=6.0
# smoothness (first differences) on the grid
Dr=[];Dc=[];Dv=[];k=0
for j in range(ny):
  for i in range(nx):
    for (dj,di) in ((0,1),(1,0)):
      if j+dj<ny and i+di<nx:
        Dr+= [k,k]; Dc+=[j*nx+i,(j+dj)*nx+i+di]; Dv+=[1,-1]; k+=1
Dm=sp.csr_matrix((Dv,(Dr,Dc)),shape=(k,nx*ny))
for c in range(3):
    g=gain[ys,xs,c]
    vals=np.stack([(1-ax)*(1-ay),ax*(1-ay),(1-ax)*ay,ax*ay],1)*g[:,None]
    A=sp.csr_matrix((vals.ravel(),(rows,cols)),shape=(n,nx*ny))
    b=-(r[ys,xs,c]-s[ys,xs,c])
    M=sp.vstack([A,lam*Dm]); rhs=np.concatenate([b,np.zeros(k)])
    x=spl.lsqr(M,rhs,atol=1e-7,btol=1e-7,iter_lim=5000)[0]
    out[c]=x
    res=A@x-b; print('ch',c,'rms before',np.sqrt((b**2).mean()).round(2),'after',np.sqrt((res**2).mean()).round(2))
G=np.clip(np.round(out),-45,45).astype(int)
if prev is not None and prev.shape==G.shape: G=np.clip(np.round(prev+out),-45,45).astype(int)
js='export const SKY_CORR = { cs: %d, nx: %d, ny: %d, rgb: [\n'%(CS,nx,ny)
for c in range(3): js+='  ['+', '.join(str(v) for v in G[c])+'],\n'
js+='] };\n'; open('skycorr.js','w').write(js); print('range',G.min(),G.max())
print(G[1].reshape(ny,nx))
