import json,cv2,numpy as np,sys
sys.path.insert(0,'.')
from grade import *
D=json.load(open('data.json'))
t=138.0
src=cv2.imread('src/f3450.png')[:,:,::-1].astype(np.float32)/255
raw=cv2.imread('raw/r-138.000.png')[:,:,::-1].astype(np.float32)/255
hb=hb_map(raw)
# inverse grade whole image
yy,xx=np.mgrid[0:H,0:W]
u=(xx+0.5)/W; v=1-(yy+0.5)/H; qx=(u-0.5)*2; qy=(v-0.5)*2; rr=np.minimum(1,(qx*qx+qy*qy)/2); vg=1-0.38*rr**1.15
g=src/(vg[...,None]*flick(t)); h=Sinv(np.clip(g,0,1)); pre=np.clip(1-(1-h)/(1-0.5*hb),0,1)
np.save('pre138.npy',pre.astype(np.float32))
lay=np.full((H,W),-1,np.int16)
layers=D['CLOUDS_BACK']+D['CLOUDS_FRONT']
def paint(L,shrink=2.5):
    m=np.zeros((H,W),np.uint8)
    for x,y,r in L: cv2.circle(m,(int(round(x)),int(round(y))),int(round(r-shrink)),255,-1)
    return m>0
for i in range(3): lay[paint(layers[i])]=i
rib=np.zeros((H,W),np.uint8)
for k in ['leftB','leftA','rightB','rightA']:
    rows=D['RIBBONS'][k]; pts=[(r[1],r[0]) for r in rows]+[(r[8],r[0]) for r in rows[::-1]]
    cv2.fillPoly(rib,[np.array(pts,np.int32)],255)
lay[rib>0]=-2
for i in range(3,len(layers)): lay[paint(layers[i])]=i
# interior: away from keylines (erode each layer region)
L=(src@np.array([0.299,0.587,0.114],np.float32))*255
ok=np.zeros((H,W),bool)
for i in range(len(layers)):
    m=(lay==i).astype(np.uint8)
    ok|=cv2.erode(m,np.ones((9,9),np.uint8))>0
ok&=L>110
np.save('lay.npy',lay); np.save('ok.npy',ok)
P=pre[ok]; Lp=P@np.array([0.299,0.587,0.114])
print('pre L pct',np.percentile(Lp,[1,5,25,50,75,95,99]))
hi=P[Lp>np.percentile(Lp,92)].mean(0); lo=P[Lp<np.percentile(Lp,4)].mean(0)
print('cream',(hi*255).round(),'shade',(lo*255).round())
