import numpy as np, cv2, json
from grade import hb_map
W,H=2206,946; CS=60
s=np.load('smean138.npy')[:,:,::-1]; r=np.load(__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'rmean138_base.npy')[:,:,::-1]
raw=cv2.imread('raw/r-138.000.png')[:,:,::-1].astype(np.float32)/255
hb=hb_map(raw)
m=cv2.imread('../s40-fix1c-h/mask.png'); sky=(m[:,:,1]<10).astype(np.uint8); sky=cv2.erode(sky,np.ones((11,11),np.uint8))>0
yy,xx=np.mgrid[0:H,0:W]; u=(xx+0.5)/W; v=1-(yy+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2
vig=1-0.38*np.minimum(1,(qx*qx+qy*qy)/2)**1.15
nx,ny=(W+CS-1)//CS,(H+CS-1)//CS
D=np.zeros((ny,nx,3)); Wt=np.zeros((ny,nx))
for j in range(ny):
  for i in range(nx):
    sl=(slice(j*CS,(j+1)*CS),slice(i*CS,(i+1)*CS)); mm=sky[sl]
    if mm.sum()<0.25*CS*CS: continue
    cx,cy=(i+0.5)*CS,(j+0.5)*CS
    if 470<cx<1720 and 280<cy<640: continue   # wordmark, owl and tagline: sky slivers between letters, shadows
    d=(r[sl][mm]-s[sl][mm]).mean(0)
    p=raw[sl][mm].mean(0); h=hb[sl][mm].mean(0); vg=vig[sl][mm].mean()
    hh=1-(1-p)*(1-0.5*h); gain=(0.65+2.1*hh*(1-hh))*(1-0.5*h)*vg
    D[j,i]=-d/np.maximum(gain,0.3); Wt[j,i]=1
def gblur(a,sig):
    k=int(3*sig)+1; x=np.arange(-k,k+1); w=np.exp(-0.5*x*x/sig/sig); w/=w.sum()
    a=cv2.filter2D(a,-1,w[None,:],borderType=cv2.BORDER_REPLICATE); return cv2.filter2D(a,-1,w[:,None],borderType=cv2.BORDER_REPLICATE)
num=np.stack([gblur((D[:,:,c]*Wt).astype(np.float32),0.8) for c in range(3)],2); den=gblur(Wt.astype(np.float32),0.8)[:,:,None]
F=num/np.maximum(den,1e-3)
# fill far cells with a wider kernel
num2=np.stack([gblur((D[:,:,c]*Wt).astype(np.float32),2.5) for c in range(3)],2); den2=gblur(Wt.astype(np.float32),2.5)[:,:,None]
F2=num2/np.maximum(den2,1e-3)
F=np.where(den>0.15,F,F2)
# drop outlier cells (a sliver of something that is not sky) and refit
bad=(Wt>0)&(np.abs(D-F).max(2)>12); print('outliers',int(bad.sum())); Wt[bad]=0
num=np.stack([gblur((D[:,:,c]*Wt).astype(np.float32),0.8) for c in range(3)],2); den=gblur(Wt.astype(np.float32),0.8)[:,:,None]
F=num/np.maximum(den,1e-3)
num2=np.stack([gblur((D[:,:,c]*Wt).astype(np.float32),2.5) for c in range(3)],2); den2=gblur(Wt.astype(np.float32),2.5)[:,:,None]
F2=num2/np.maximum(den2,1e-3)
F=np.where(den>0.15,F,F2); F=np.clip(F,-45,45)
G=np.round(F).astype(int)
print('cells',nx,ny,'valid',int(Wt.sum()),'range',G.min(),G.max())
js='export const SKY_CORR = { cs: %d, nx: %d, ny: %d, rgb: [\n'%(CS,nx,ny)
for c in range(3): js+='  ['+', '.join(str(v) for v in G[:,:,c].ravel())+'],\n'
js+='] };\n'; open('skycorr.js','w').write(js); print(G[:,:,1])
json.dump({'cs':CS,'nx':nx,'ny':ny,'g':G.tolist()},open('skycorr.json','w'))
