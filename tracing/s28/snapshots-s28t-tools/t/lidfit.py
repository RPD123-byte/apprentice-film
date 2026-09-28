# Track the laptop lid as a quad (4 corners) per source frame: maximise IoU of the quad (clipped to the frame)
# with the lid's grey mask. Output JSON {t: [[x,y]x4]} (TL, TR, BR, BL).
import cv2,numpy as np,json,sys
from scipy.optimize import minimize
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
S=0.25
def mask_at(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read()
    f=cv2.medianBlur(f,5).astype(np.int16)
    mx=f.max(2); mn=f.min(2)
    m=((mx<125)&(mn>42)&(mx-mn<24)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    n_,lab,st,_=cv2.connectedComponentsWithStats(m)
    i=1+np.argmax(st[1:,4]); m=(lab==i).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
    return cv2.resize(m,(W,H),interpolation=cv2.INTER_AREA).astype(np.float32)
H,W=int(946*S),int(2206*S)
def raster(q):
    im=np.zeros((H+400,W+400),np.uint8)
    cv2.fillPoly(im,[np.int32(np.round((np.array(q).reshape(4,2)*S+200)*4))],1,shift=2)
    return im[200:200+H,200:200+W].astype(np.float32)
def fit(m,q0):
    def cost(p):
        r=raster(p); inter=(r*m).sum(); uni=r.sum()+m.sum()-inter
        return 1-inter/max(uni,1)
    best=None
    p=np.array(q0,float).ravel()
    for scale in (40,15,5):
        res=minimize(cost,p,method='Powell',options={'xtol':0.5,'ftol':1e-5,'maxfev':3000,'direc':np.eye(8)*scale})
        p=res.x
    return p.reshape(4,2),cost(p)
out={}
q=np.array([[1402,420],[1790,426],[1635,826],[1239,898]],float)
n0=int(round(129.28*25)); n1=int(round(131.40*25))
for n in range(n0,n1+1):
    m=mask_at(n)
    q,e=fit(m,q)
    out[f"{n/25:.2f}"]=q.round(1).tolist()
    print(f"{n/25:.2f} iou={1-e:.3f} {q.round(0).tolist()}",flush=True)
json.dump(out,open('snapshots/s28t-tools/t/lidquads.json','w'))
