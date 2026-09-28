import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22')
from common import *
import trace as TR, json, glob, re
d=sys.argv[1]
LATE=[(79.8,'f79.80'),(79.84,'f79.84'),(79.88,'f79.88'),(79.92,'f79.92'),(79.96,'f79.96'),(80.0,'f80.00'),(80.04,'f80.04'),(80.08,'brand'),(80.56,'f80.56'),(80.6,'f80.60'),(80.64,'f80.64'),(80.68,'f80.68'),(80.72,'f80.72'),(80.76,'f80.76'),(80.8,'f80.80'),(80.88,'f80.88'),(80.96,'f80.96'),(81.04,'f81.04'),(81.12,'f81.12'),(81.2,'f81.20'),(81.28,'f81.28'),(81.44,'f81.44'),(81.52,'f81.52'),(81.6,'f81.60'),(81.72,'walk'),(83.96,'f83.96')]
cache={}
def drawing(t):
    name=[n for tt,n in LATE if tt<=t+0.005][-1]
    if name not in cache:
        T=json.load(open(S+('/tr_%s.json'%name)))
        img,a=TR.render(T,blur=0.7); cache[name]=(T,img,a)
    return name,cache[name]
WW=json.load(open(S+'/tr_walk.json'))['meta']['warp']
WT=sorted((float(k),v) for k,v in WW.items())
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<79.79: continue
    B0=cv2.imread(f.replace('frame-','ref-'))
    if B0 is None: continue
    fa=cv2.imread(f).astype(np.float32).mean(2); fb=B0.astype(np.float32).mean(2)
    name,(T,img,a)=drawing(t)
    o=np.array(T['origin'],np.float32)
    if name=='walk':
        w=[v for tt,v in WT if tt<=t+0.005][-1]; A,B_,C,D,E,F=w
        M=np.array([[A,C,E+A*o[0]+C*o[1]],[B_,D,F+B_*o[0]+D*o[1]]],np.float32)
    else:
        M=np.array([[1,0,o[0]],[0,1,o[1]]],np.float32)
    af=cv2.warpAffine(a.astype(np.float32),M,(2206,946)); vf=cv2.warpAffine(img.astype(np.float32),M,(2206,946))
    m0=cv2.erode((af>0.98).astype(np.uint8),np.ones((5,5)))>0
    m=m0&(vf>0.5)&(vf<0.95)
    v=np.clip(vf[m],0,1); ga=fa[m]; gb=fb[m]
    slope=255*VIG[m]*flick(t)*(0.65+0.35*6*v*(1-v))
    target=v+(gb-ga)/slope
    q=v*(1-v); alpha=((v-target)*q).sum()/max((q*q).sum(),1e-6)
    wm=m0&(vf>0.97)
    print('%.2f %-7s alpha %+.2f  mids src-ren %+.1f  whites src %.0f ren %.0f'%(t,name,alpha,(gb-ga).mean(),fb[wm].mean() if wm.sum() else 0,fa[wm].mean() if wm.sum() else 0))
