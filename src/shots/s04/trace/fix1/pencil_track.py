# pencil_track.py : the pencil in his teeth, per source frame 478-577: its outline measured on the hold frame 20.56 at
# 4x (snapshots/s04-fix1w/penL.jpg, penR.jpg: tip (706, 729), the shaft's edges y 710.5 / 744 from x 800 to the ferrule
# at 1312, the ferrule to 1392), carried to every frame by coarse-to-fine ECC affines of the pencil region between
# consecutive frames (chained out from 514 both ways; initialised by the measured image motion, s04/hatchflow.js).
# Writes snapshots/s04-fix1w/pencil.json {frame: [a, b, tx, c, d, ty]} (20.56 coords -> frame) and a debug sheet.
# Measurements only.
import cv2, numpy as np, json, re
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
G=lambda fi: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{SP}/{fi}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
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
def ecc_pyr(A,B,m,W,scales=(0.25,0.5,1.0)):
    for sc in scales:
        a=cv2.resize(A,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(B,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
        mm=cv2.resize(m,(a.shape[1],a.shape[0]),interpolation=cv2.INTER_NEAREST)
        Ws=W.copy(); Ws[:,2]*=sc
        cc,Ws=cv2.findTransformECC(a,b,Ws.astype(np.float32),cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mm,3)
        W=Ws.copy(); W[:,2]/=sc
    return cc,W
PEN=np.array([[696,708],[1400,700],[1400,756],[696,752]],np.float64)   # the pencil region at 20.56 (+ a margin)
res={514:[1,0,0,0,1,0]}
def run(order):
    A=np.array([[1,0,0],[0,1,0]],np.float64)
    for f,g in order:   # from frame f (known) to g
        Pf=PEN@A[:,:2].T+A[:,2]
        a=G(f); b=G(g)
        m=np.zeros(a.shape,np.uint8); cv2.fillPoly(m,[Pf.astype(np.int32)],255)
        if m.sum()/255<2000: print('pencil too small', g); break
        c=Pf.mean(0)
        # the flow file gives, for a pixel of the frame nearer 514's far side, where it is in its neighbour; we need where
        # f's pencil centre is in g: for g further from 514 than f, HF[g] maps g -> f, so invert approximately
        d=-hf_at(g,c[0],c[1])
        W=np.array([[1,0,d[0]],[0,1,d[1]]],np.float32)
        W0=W.copy(); ok=False
        for sc in ((0.25,0.5,1.0),(0.5,1.0),(1.0,)):
            try: cc,W=ecc_pyr(a,b,m,W0.copy(),sc); ok=True; break
            except cv2.error: pass
        if not ok: print('fail',g); break
        A=np.vstack([W.astype(np.float64),[0,0,1]])@np.vstack([A,[0,0,1]]); A=A[:2]
        res[g]=[round(float(v),4) for v in A.ravel()]
        print(f'{g/25:.2f} cc {cc:.3f} tip {np.round(A[:,:2]@[706,729]+A[:,2],1)} end {np.round(A[:,:2]@[1392,729]+A[:,2],1)}', flush=True)
import sys
if sys.argv[1:] == ['B']:
    # the tip half seen from behind (22.36-23.08): measured on 23.08 at 4x (snapshots/s04-fix1w/pen577.jpg): tip
    # (1136, 519), the shaft's edges from the cone at x ~1178 to the lips at (1345-1352, 440-462); carried back to 22.32
    PEN=np.array([[1128,512],[1340,433],[1356,466],[1140,532]],np.float64)
    res={577:[1,0,0,0,1,0]}
    def runB():
        A=np.array([[1,0,0],[0,1,0]],np.float64)
        for f in range(577,558,-1):
            g=f-1; Pf=PEN@A[:,:2].T+A[:,2]; a=G(f); b=G(g)
            m=np.zeros(a.shape,np.uint8); cv2.fillPoly(m,[Pf.astype(np.int32)],255)
            c=Pf.mean(0); d=hf_at(f,c[0],c[1])   # HF[f]: where f's pixels are in f-1
            ok=False
            for W0 in (np.array([[1,0,d[0]],[0,1,d[1]]],np.float32), np.array([[1,0,0.5*d[0]],[0,1,0.5*d[1]]],np.float32), np.array([[1,0,0],[0,1,0]],np.float32)):
                for sc in ((0.25,0.5,1.0),(0.5,1.0),(1.0,)):
                    try: cc,W=ecc_pyr(a,b,cv2.dilate(m,np.ones((9,9),np.uint8)),W0.copy(),sc); ok=cc>0.8; break
                    except cv2.error: pass
                if ok: break
            if not ok: print('fail',g); break
            A=(np.vstack([W.astype(np.float64),[0,0,1]])@np.vstack([A,[0,0,1]]))[:2]
            res[g]=[round(float(v),4) for v in A.ravel()]
            print(f'{g/25:.2f} cc {cc:.3f} tip {np.round(A[:,:2]@[1136,519]+A[:,2],1)} lips {np.round(A[:,:2]@[1348,451]+A[:,2],1)}', flush=True)
    runB()
    json.dump(res,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/pencilB.json','w'))
else:
    run([(f,f+1) for f in range(514,577)])
    run([(f,f-1) for f in range(514,478,-1)])
    json.dump(res,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/pencil.json','w'))
# (fix: the landing's camera pan, 478-488. The pencil's own region is motion-blurred there and the chained affine
# drifted; the figure holds still while the camera pans, so the face region's affine from 514 straight to each frame
# (coarse-to-fine ECC, the owl excluded) places the pencil instead.)
if sys.argv[1:] == ['pan']:
    res=json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/pencil.json'))
    a=G(514); m=np.zeros(a.shape,np.uint8); cv2.rectangle(m,(650,150),(1450,800),255,-1)
    W=np.array([[1,0,0],[0,1,0]],np.float32)
    for f in range(489,477,-1):
        b=G(f); ok=False
        for sc in ((0.125,0.25,0.5,1.0),(0.25,0.5,1.0)):
            try: cc,Wn=ecc_pyr(a,b,m,W.copy(),sc); ok=True; break
            except cv2.error: pass
        if not ok: print('fail',f); continue
        W=Wn; res[str(f)]=[round(float(v),4) for v in W.ravel()]
        print(f'{f/25:.2f} cc {cc:.3f} tip {np.round(W[:,:2]@[706,729]+W[:,2],1)}', flush=True)
    json.dump(res,open('/Users/computer/rootline/apprentice-film/snapshots/s04-fix1w/pencil.json','w'))
