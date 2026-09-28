import cv2,numpy as np,json
from pc import P
from segm import camW
sched=json.load(open('schedule.json')); ch=json.load(open('chtrack.json'))
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
FR=[2600,2615,2630,2650,2660,2690,2700,2725,2740,2755,2540,2542,2544]
sig=40
NUM=np.zeros((946,2206)); DEN=np.zeros_like(NUM)
for f in FR:
    R=cv2.imread(f'r/pre7/r-{f:05d}.png',0).astype(np.float32)/255
    S=P(f)
    if f>=2577:
        R=cv2.warpAffine(R,camW(f),(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REPLICATE)
        r=sched[str(f)]; A=np.array(r[1:7]).reshape(2,3); m=cv2.warpAffine(tmask(r[0]),A,(2206,946),flags=cv2.INTER_NEAREST)
        for k in ['fscL','fscR']: m|=tmask(k)
    else:
        S=cv2.imread(f'src/f{f:05d}.png')  # chaos frames: no camera drift measured (page locked)
        S=P(f)
        k='vs2' if f<=2541 else 'vs3'; A=np.array(ch[k][str(f)][:6]).reshape(2,3); m=cv2.warpAffine(tmask(k),A,(2206,946),flags=cv2.INTER_NEAREST)
        m[:, :]|=0
        # chips & slashes & smoke: mask bright small things and use only the centre region
        sel=np.zeros_like(m); sel[380:900,700:1500]=1; m|=(1-sel)
    valid=(cv2.dilate(m,np.ones((31,31),np.uint8))==0).astype(np.float32)
    valid[:130]=0; valid[912:]=0; valid[:,:150]=0; valid[:,2020:]=0
    wgt=3.0 if f<2577 else 1.0
    NUM+=wgt*cv2.GaussianBlur(S*valid,(0,0),sig); DEN+=wgt*cv2.GaussianBlur(R*valid,(0,0),sig)
C=np.where(DEN>0.02*len(FR)*0.1, NUM/np.maximum(DEN,1e-5), 1.0)
C=np.clip(C,0.6,1.5)
g8=np.load('gain8.npy')
c8=cv2.resize(C.astype(np.float32),(276,118),interpolation=cv2.INTER_AREA)
g8n=np.clip(cv2.GaussianBlur(g8*c8,(0,0),1.5),0.6,1.8)
np.save('gain8.npy',g8n.astype(np.float32))
print('correction pct', np.percentile(c8[17:113,20:252],[5,25,50,75,95]))
print('centre legs corr', c8[70:100,112:150].mean())
