# speaker_track.py : the speaker's front face per source frame 22.28-23.08: the quad measured on 23.08 (frame 577) at 2x
# (snapshots/s04-fix1w/g-spk577.jpg), carried back frame by frame by ECC homographies of the face region between
# consecutive frames (the face and its drivers). Prints the quads (frame px) for s04.js SPK_Q. Measurements only.
import cv2, numpy as np, json
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
G=lambda fi: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{SP}/{fi}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
Q=np.array([[980,240],[1166,232],[1168,560],[982,565]],np.float32)
out={577:Q.tolist()}
vel=np.array([15.0,-7.0])   # the measured image motion near the speaker, px per frame (hatchflow means), a first guess
# the measured frame-to-frame motion (s04/hatchflow.js, trace/fix1/hatchflow.py) as the initial guess
import re
_hf=open('/Users/computer/rootline/apprentice-film/src/shots/s04/hatchflow.js').read()
_S,_nx,_ny=[int(v) for v in re.search(r'S: (\d+), nx: (\d+), ny: (\d+)',_hf).groups()]
_F=json.loads(_hf[_hf.index('f: ')+3:_hf.rindex('}')])
ALPHA=[chr(c) for c in range(35,127) if c!=92]; IDX={ch:i for i,ch in enumerate(ALPHA)}
def hf(f):
    s=_F[str(f)]; n=_nx*_ny; out=np.zeros((n,2)); i=0
    for pl in (0,1):
        v=0
        for k in range(n):
            c=IDX[s[i]]
            if c<81: v+=c-40; i+=1
            else: v=IDX[s[i+1]]*91+IDX[s[i+2]]-4000; i+=3
            out[k,pl]=v/4
    return out.reshape(_ny,_nx,2)
def hf_at(f,x,y):
    g=hf(f); i=int(np.clip(round(x/_S),0,_nx-1)); j=int(np.clip(round(y/_S),0,_ny-1)); return g[j,i]
def ecc_pyr(A,B,m,W):
    # coarse-to-fine affine ECC (scales 1/4, 1/2, 1); W: 2x3 initial (A coords -> B coords)
    for sc in (0.25,0.5,1.0):
        a=cv2.resize(A,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(B,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
        mm=cv2.resize(m,(a.shape[1],a.shape[0]),interpolation=cv2.INTER_NEAREST)
        Ws=W.copy(); Ws[:,2]*=sc
        cc,Ws=cv2.findTransformECC(a,b,Ws.astype(np.float32),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mm,3)
        W=Ws.copy(); W[:,2]/=sc
    return cc,W
for f in range(576,556,-1):
    A=G(f+1); B=G(f)
    m=np.zeros(A.shape,np.uint8); cv2.fillPoly(m,[Q.astype(np.int32)],255)
    if m.sum()/255<3000: print('face too small at',f); break
    c=Q.mean(0); d=hf_at(f+1,c[0],c[1])   # where the quad's centre of f+1 is in f
    W=np.array([[1,0,d[0]],[0,1,d[1]]],np.float32)
    try: cc,W=ecc_pyr(A,B,m,W)
    except cv2.error as e: print('fail',f,str(e)[:80]); break
    Qn=cv2.transform(Q[None],W)[0]
    vel=(Q-Qn).mean(0); Q=Qn.astype(np.float32)
    out[f]=np.round(Q,1).tolist(); print(f'{f/25:.2f} cc {cc:.3f} quad {np.round(Q,1).tolist()}', flush=True)
json.dump(out,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/speaker.json','w'))
