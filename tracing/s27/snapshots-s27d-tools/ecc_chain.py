# ECC chained frame to frame from a seed homography: H(t) = D(t) H(t-dt), D by ECC between consecutive frames inside
# the region warped by the running estimate. Seeds from an existing track json at t_seed.
# usage: ecc_chain.py name seedjson tseed tend quad [--ignore=...]
import cv2, numpy as np, sys, json
from src import frame
name=sys.argv[1]; seed=json.load(open(sys.argv[2])); tseed=float(sys.argv[3]); tend=float(sys.argv[4])
poly=np.float32([float(v) for v in sys.argv[5].split(',')]).reshape(-1,2)
opts={a.split('=')[0]:a.split('=',1)[1] for a in sys.argv[6:] if a.startswith('--')}
ign=[]
if '--ignore' in opts:
    for s in opts['--ignore'].split(';'):
        r,tr=s.split('@'); x0,y0,x1,y1=[float(v) for v in r.split(',')]; ta,tb=[float(v) for v in tr.split('-')]
        ign.append((x0,y0,x1,y1,ta,tb))
rows={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in seed['H']}
Hc=rows[round(tseed,2)]
Wd,Hd=2206,946
def prep(g): return cv2.GaussianBlur(g.astype(np.float32)/255,(0,0),1.2)
step=0.04 if tend>tseed else -0.04
ts=[round(tseed+i*step,2) for i in range(int(round(abs(tend-tseed)/0.04))+1)]
prev=prep(frame(ts[0],True)); out={ts[0]:Hc}
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-6)
for t in ts[1:]:
    g=prep(frame(t,True))
    q=cv2.perspectiveTransform(poly[None],Hc)[0]
    m=np.zeros((Hd,Wd),np.uint8); cv2.fillPoly(m,[np.int32(q)],255); m=cv2.erode(m,np.ones((7,7),np.uint8))
    for x0,y0,x1,y1,ta,tb in ign:
        if ta<=t<=tb: m[int(y0):int(y1),int(x0):int(x1)]=0
    E=np.eye(3,dtype=np.float32)
    try:
        # template = previous frame (region m), input = current frame: E maps prev-frame coords -> current coords
        cc,E=cv2.findTransformECC(prev,g,E,cv2.MOTION_HOMOGRAPHY,crit,m,5)
    except cv2.error:
        print(name,t,'fail'); cc=0
    Hc=E.astype(np.float64)@Hc; Hc/=Hc[2,2]; out[t]=Hc; prev=g
    c=cv2.perspectiveTransform(poly[None],Hc)[0]
    print(f"{name} {t:.2f} cc={cc:.4f} "+" ".join(f"({x:.1f},{y:.1f})" for x,y in c),flush=True)
json.dump({'name':name,'poly':poly.tolist(),'H':[[k]+[round(float(x),9) for x in out[k].flatten()] for k in sorted(out)]},open(f'../s27d-meas/eccc_{name}.json','w'))
