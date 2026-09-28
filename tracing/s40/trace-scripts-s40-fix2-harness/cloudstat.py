import numpy as np,cv2,sys
t=float(sys.argv[1]) if len(sys.argv)>1 else 138.0
A=np.load('Amap.npy'); lay=np.load('lay.npy'); ok=np.load('ok.npy')
w=ok.astype(np.float32); Ab=cv2.GaussianBlur(np.where(ok,A,0).astype(np.float32),(0,0),3)/(cv2.GaussianBlur(w,(0,0),3)+1e-6)
s=cv2.imread('src/f3450.png').astype(float); r=cv2.imread('out/r-138.000.png').astype(float)
hx=lambda c:'#%02x%02x%02x'%(int(c[2]),int(c[1]),int(c[0]))
H,W=lay.shape; xx=np.mgrid[0:H,0:W][1]
for bank,bm in [('L',xx<1000),('R',xx>=1000)]:
  for nm,m in [('cream',Ab<0.2),('tan',(Ab>0.35)&(Ab<0.5)),('dark',Ab>0.55)]:
    k=ok&m&bm
    print(bank,nm,k.sum(),'src',hx(s[k].mean(0)),'ren',hx(r[k].mean(0)), 'dL %.1f'%((r[k].mean(0)-s[k].mean(0))@[0.114,0.587,0.299]))
# texture: fine std (image minus blur sigma 2) in cloud interiors
def fine(im):
  L=im@[0.114,0.587,0.299]; return L-cv2.GaussianBlur(L,(0,0),2.0)
fs,fr=fine(s),fine(r)
for nm,m in [('cream',Ab<0.2),('tan',Ab>0.35)]:
  k=ok&m; print('fine std',nm,'src %.2f ren %.2f'%(fs[k].std(),fr[k].std()))
