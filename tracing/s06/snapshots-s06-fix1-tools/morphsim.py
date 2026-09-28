# morphsim.py: would a flow morph of the neutral / smile face beat a plain dissolve mid-transition? (source means as proxies)
import cv2,numpy as np
A='/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-tools/inputs/'
S=lambda n: cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(np.float32)
nm=np.load(A+'nm.npy').astype(np.float32); sm=np.load(A+'sm.npy').astype(np.float32)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(0)
f=dis.calc(nm.astype(np.uint8),sm.astype(np.uint8),None)
g=cv2.GaussianBlur(nm,(0,0),1.2); gy,gx=np.gradient(g); tex=np.clip(np.hypot(gx,gy)/20,0,1)
ok=(np.hypot(f[...,0],f[...,1])<12).astype(np.float32); w=(tex+1e-3)*ok
for sg in (6,10):
    D=np.stack([cv2.GaussianBlur(f[...,c]*w,(0,0),sg)/np.maximum(cv2.GaussianBlur(w,(0,0),sg),1e-6) for c in range(2)],-1)
    yy,xx=np.mgrid[0:946,0:2206].astype(np.float32)
    SM=[(684,0.36),(686,0.44),(688,0.55),(690,0.64),(692,0.7),(696,0.83),(700,0.92)]
    x0,y0,x1,y1=880,380,1360,800
    for n,k in SM:
        src=cv2.GaussianBlur(S(n),(0,0),1.5)
        dis_=(1-k)*nm+k*sm
        # morph: neutral warped forward by k*D, smile warped back by (1-k)*D (backward maps, D evaluated at the target)
        wn=cv2.remap(nm,xx-k*D[...,0],yy-k*D[...,1],cv2.INTER_LINEAR); ws=cv2.remap(sm,xx+(1-k)*D[...,0],yy+(1-k)*D[...,1],cv2.INTER_LINEAR)
        mor=(1-k)*wn+k*ws
        e=lambda im: np.abs(cv2.GaussianBlur(im,(0,0),1.5)-src)[y0:y1,x0:x1].mean()
        print('sig',sg,n,'k',k,'dissolve %.2f morph %.2f'%(e(dis_),e(mor)))
