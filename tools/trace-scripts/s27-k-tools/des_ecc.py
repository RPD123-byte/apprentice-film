# des_ecc.py track.json Tstart Tend out.json : affine ECC alignment of the 125.0 designer (masked by his silhouette) to
# each frame, stepping from Tstart to Tend, initialised from the mesh track at Tstart (affine fit) and then from the
# previous frame's result extrapolated. Output: {t: [a,b,tx,c,d,ty]} mapping frame@125 -> frame@t. Measurement only.
import cv2, numpy as np, json, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
tr=json.load(open(sys.argv[1])); T0=float(sys.argv[2]); T1=float(sys.argv[3]); OUT=sys.argv[4]
G=np.array(tr['grid'],float); P=np.array(tr['frames'][str(T0)],float)
A0,_=cv2.estimateAffine2D(np.float32(G),np.float32(P))
sil=np.array(json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-meas/sil125.json')),float)
SC=0.5
g125=cv2.cvtColor(load(125.0),cv2.COLOR_BGR2GRAY)
H,W=g125.shape
m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.int32(np.round(sil))],255); m=cv2.erode(m,np.ones((7,7),np.uint8))
inp=cv2.resize(g125,None,fx=SC,fy=SC,interpolation=cv2.INTER_AREA).astype(np.float32)
msk=cv2.resize(m,None,fx=SC,fy=SC,interpolation=cv2.INTER_NEAREST)
def to_small(A):  # full-res affine -> half-res
    S=np.diag([SC,SC,1.0]); Si=np.diag([1/SC,1/SC,1.0]); M=np.vstack([A,[0,0,1]]); return (S@M@Si)[:2]
def to_full(A):
    S=np.diag([SC,SC,1.0]); Si=np.diag([1/SC,1/SC,1.0]); M=np.vstack([A,[0,0,1]]); return (Si@M@S)[:2]
out={}; prev=[A0,A0]
n=int(round(abs(T1-T0)/0.04)); step=0.04 if T1>T0 else -0.04
for k in range(n+1):
    t=round(T0+k*step,2)
    init=prev[-1] if k<2 else prev[-1]+(prev[-1]-prev[-2])*0.8
    tmpl=cv2.resize(cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY),None,fx=SC,fy=SC,interpolation=cv2.INTER_AREA).astype(np.float32)
    # ECC warp maps template (frame t) coords -> input (frame 125) coords: the inverse of 125 -> t
    Mi=np.vstack([init,[0,0,1]]); Wi=np.linalg.inv(Mi)[:2]
    w=to_small(Wi).astype(np.float32)
    try:
        cc,w=cv2.findTransformECC(tmpl,inp,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-5),msk,5)
    except cv2.error as e:
        cc=-1
    Wf=to_full(w); A=np.linalg.inv(np.vstack([Wf,[0,0,1]]))[:2]
    out[str(t)]=A.round(5).flatten().tolist(); prev.append(A)
    print(t,'cc',round(float(cc),3),'scale',round(float(np.sqrt(abs(np.linalg.det(A[:,:2])))),3),'t',A[:,2].round(1),flush=True)
json.dump(out,open(OUT,'w'))
