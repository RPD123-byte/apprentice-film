# Fit a smooth pre-grade light correction G(x,y) (bilinear over a control grid) for STATIC, from frame 765.
import cv2,numpy as np,sys,json
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
raw=cv2.imread('snapshots/s08-fix1-raw/r765.png').astype(float)
src=(cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float)+cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float))/2
ren=cv2.imread('snapshots/s08-fix1-h1/r765.png').astype(float)
yy,xx=np.mgrid[0:H,0:W]
# needed raw for the source output (halation iterated from the needed raw itself)
f0s=Sinv(np.clip(src/255/(vign(xx,yy)[...,None]*flick(30.6)),0,1))
est=raw
for it in range(4):
  hb=halo_map(est); need=np.clip(1-(1-f0s)/(1-0.5*hb),0,1)*255; est=need
Rl=cv2.GaussianBlur(raw.mean(-1),(0,0),3); Nl=cv2.GaussianBlur(need.mean(-1),(0,0),3)
la=cv2.GaussianBlur(ren.mean(-1),(0,0),2); lb=cv2.GaussianBlur(src.mean(-1),(0,0),2)
sa=cv2.cvtColor(ren.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255; sb=cv2.cvtColor(src.astype(np.uint8),cv2.COLOR_BGR2HSV)[...,1]/255
br=(la>110)&(lb>100)&(sa<0.25)&(sb<0.25)
dk=(la<55)&(lb<55)
excl=np.zeros((H,W),bool)
excl[140:880,1430:1950]=True     # the card (own light)
excl[320:500,0:800]=True         # date text (redrawn)
excl[200:285,590:680]=True       # star
excl[0:150,0:1000]=True          # logo area
br=cv2.erode((br&~excl).astype(np.uint8),np.ones((7,7),np.uint8))==1
dk=cv2.erode((dk&~excl).astype(np.uint8),np.ones((9,9),np.uint8))==1
st=50; samples=[]
for y in range(0,H,st):
  for x in range(0,W,st):
    for m,w in [(br[y:y+st,x:x+st],1.0),(dk[y:y+st,x:x+st],1.0)]:
      if m.sum()>120:
        lv=np.median(la[y:y+st,x:x+st][m])
        k=np.median(Nl[y:y+st,x:x+st][m])/max(1,np.median(Rl[y:y+st,x:x+st][m]))
        samples.append((x+st/2,y+st/2,np.log(k),w*lv/100))
S_=np.array(samples)
KX=np.array(json.loads(sys.argv[1])); KY=np.array(json.loads(sys.argv[2]))
nx,ny=len(KX),len(KY)
def basis(x,y):
  i=np.clip(np.searchsorted(KX,x)-1,0,nx-2); j=np.clip(np.searchsorted(KY,y)-1,0,ny-2)
  u=np.clip((x-KX[i])/(KX[i+1]-KX[i]),0,1); v=np.clip((y-KY[j])/(KY[j+1]-KY[j]),0,1)
  b=np.zeros(nx*ny); b[j*nx+i]+=(1-u)*(1-v); b[j*nx+i+1]+=u*(1-v); b[(j+1)*nx+i]+=(1-u)*v; b[(j+1)*nx+i+1]+=u*v
  return b
A=[];rhs=[]
for x,y,lk,w in S_:
  A.append(basis(x,y)*w); rhs.append(lk*w)
lam=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
# smoothness
for j in range(ny):
  for i in range(nx-1):
    r=np.zeros(nx*ny); r[j*nx+i]=lam; r[j*nx+i+1]=-lam; A.append(r); rhs.append(0)
for j in range(ny-1):
  for i in range(nx):
    r=np.zeros(nx*ny); r[j*nx+i]=lam; r[(j+1)*nx+i]=-lam; A.append(r); rhs.append(0)
# weak prior toward 0 (no change)
for q in range(nx*ny):
  r=np.zeros(nx*ny); r[q]=0.08; A.append(r); rhs.append(0)
sol=np.linalg.lstsq(np.array(A),np.array(rhs),rcond=None)[0]
G=np.exp(sol).reshape(ny,nx)
np.set_printoptions(precision=3,suppress=True,linewidth=200)
print('samples',len(S_)); print(G)
res=[lk-basis(x,y)@sol for x,y,lk,w in S_]
print('resid rms',np.sqrt(np.mean(np.square(res))))
json.dump({'KX':KX.tolist(),'KY':KY.tolist(),'G':np.round(G,3).tolist()},open('snapshots/s08-fix1-tools/gfield.json','w'))
# show residual map of samples
