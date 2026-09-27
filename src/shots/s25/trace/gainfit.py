import cv2,numpy as np,json
from grade import ungrade
from segm import L, camW
sched=json.load(open('schedule.json'))
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
FR=[2600,2615,2630,2650,2660,2690,2700,2725,2740,2755]
NUM=np.zeros((946,2206),np.float64); DEN=np.zeros_like(NUM)
import sys
sig=float(sys.argv[1]) if len(sys.argv)>1 else 45
for f in FR:
    Sp=ungrade((L(f)[...,::-1]/255.0).astype(np.float32),f/25).mean(2)
    R=cv2.imread(f'r/pre12/r-{f:05d}.png')[...,::-1].astype(np.float32)/255
    R=cv2.warpAffine(R,camW(f),(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE).mean(2)
    r=sched[str(f)]; A=np.array(r[1:7]).reshape(2,3)
    m=cv2.warpAffine(tmask(r[0]),A,(2206,946),flags=cv2.INTER_NEAREST)
    for k in ['fscL','fscR']: m|=tmask(k)
    valid=(cv2.dilate(m,np.ones((31,31),np.uint8))==0).astype(np.float32)
    valid[:130]=0; valid[912:]=0; valid[:,:150]=0; valid[:,2020:]=0
    NUM+=cv2.GaussianBlur(Sp*valid,(0,0),sig); DEN+=cv2.GaussianBlur(R*valid,(0,0),sig)
    W_=cv2.GaussianBlur(valid,(0,0),sig)
G=NUM/np.maximum(DEN,1e-4)
# where the denominator is tiny (dark page) the ratio is noisy: fall back towards 1
cover=cv2.GaussianBlur(np.ones_like(NUM),(0,0),sig)
Rm=DEN/len(FR)
WS=np.zeros_like(NUM)
for f in FR: pass
ok=(Rm>0.03)
G=np.clip(np.where(ok,G,1.0),0.7,1.7)
# fill the owl-covered hole by inpainting at 1/8 res, then smooth once more
g8=cv2.resize(G.astype(np.float32),(276,118),interpolation=cv2.INTER_AREA); m8=cv2.resize((~ok).astype(np.uint8),(276,118),interpolation=cv2.INTER_NEAREST)
g8=cv2.inpaint(((g8-0.7)/1.0*255).clip(0,255).astype(np.uint8),m8,8,cv2.INPAINT_TELEA).astype(np.float32)/255*1.0+0.7
g8=cv2.GaussianBlur(g8,(0,0),2)
G=cv2.resize(g8,(2206,946),interpolation=cv2.INTER_LINEAR)
np.save('gain8.npy',g8)
# fill owl-covered holes: normalized convolution of G over valid weights at larger sigma
np.save('gainmap.npy',G.astype(np.float32))
g8=cv2.resize(G,(2206//8,946//8),interpolation=cv2.INTER_AREA)
print('gain stats in screen', np.percentile(G[140:900,160:2010],[5,25,50,75,95]))
v=np.clip((G-0.6)/1.6*255,0,255).astype(np.uint8)
cv2.imwrite('gainmap.jpg',cv2.resize(v,None,fx=0.5,fy=0.5))
