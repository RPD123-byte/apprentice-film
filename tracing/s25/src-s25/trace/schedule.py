# per-frame choice of traced drawing + its affine (trace frame -> frame f, both in the ref (drift-corrected) space)
import cv2,numpy as np,json
from segm import L
KEYS=['pop','c308','crouch','c308B','crouchB','r44B','r48B','r52B','r56B','h372B','r44','r48','r52','r56','hips1','h372','t548','t552','t556','open1','open2','closed','t676','t684','t688','w692','w696','w700','raise','t852','hips2']
TR={k:json.load(open(f't_{k}.json')) for k in KEYS}
FR={k:TR[k]['frame'] for k in KEYS}
def gray(f): return cv2.GaussianBlur(cv2.cvtColor(L(f).astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
G={}
def g(f):
    if f not in G: G[f]=gray(f)
    return G[f]
MASK={}
def mask(k):
    if k not in MASK:
        m=np.zeros((946,2206),np.uint8)
        for r in TR[k]['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
        MASK[k]=m
    return MASK[k]
def align(k,f,mode=cv2.MOTION_AFFINE):
    fk=FR[k]; m=mask(k)
    x0,y0,x1,y1=TR[k]['box']; x0-=30;y0-=30;x1+=30;y1+=30
    x0=max(0,x0);y0=max(0,y0);x1=min(2206,x1);y1=min(946,y1)
    T=g(fk)[y0:y1,x0:x1]; I=g(f)[y0:y1,x0:x1]; mm=cv2.dilate(m,np.ones((9,9),np.uint8))[y0:y1,x0:x1]
    w=np.eye(2,3,dtype=np.float32)
    if f!=fk:
        try: cc,w=cv2.findTransformECC(T,I,w,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,150,1e-6),mm,3)
        except cv2.error: return 1e9,np.eye(2,3,dtype=np.float32)
    # residual: warp trace-frame crop by w and compare inside mask
    Wt=cv2.warpAffine(T,w,(T.shape[1],T.shape[0]),flags=cv2.INTER_LINEAR)
    Mw=cv2.warpAffine(m[y0:y1,x0:x1].astype(np.float32),w,(T.shape[1],T.shape[0]))>0.5
    err=float(np.abs(Wt-I)[Mw].mean()) if Mw.any() else 1e9
    # w maps crop coords of the trace frame to crop coords of f: convert to full-frame (translate)
    A=np.vstack([w,[0,0,1]]); Tc=np.array([[1,0,x0],[0,1,y0],[0,0,1]],float); A=Tc@A@np.linalg.inv(Tc)
    return err,A[:2]
CAND={}
order=[(2576,2576,['pop']),(2577,2577,['c308B']),(2578,2585,['crouchB']),(2586,2586,['r44B']),(2587,2587,['r48B']),(2588,2588,['r52B']),(2589,2589,['r56B']),
       (2590,2598,['h372B']),(2599,2636,['hips1']),(2637,2637,['t548']),(2638,2638,['t552']),(2639,2639,['t556']),(2640,2646,['open1','open2']),(2647,2667,['closed','t676']),
       (2668,2670,['t676','closed','t684']),(2671,2671,['t684']),(2672,2672,['t688']),(2673,2673,['w692']),(2674,2674,['w696']),(2675,2675,['w700']),
       (2676,2712,['raise','w700']),(2713,2714,['t852','hips2']),(2715,2762,['hips2'])]
rows={}
for a,b,cands in order:
    for f in range(a,b+1):
        best=None
        for k in cands:
            e,A=align(k,f)
            if best is None or e<best[0]: best=(e,k,A)
        e,k,A=best
        rows[f]=[k]+[round(float(v),5) for v in A.reshape(-1)]+[round(e,2)]
        print(f'{f/25:.2f} {k:7s} err {e:5.2f}  A {A[0,0]:.4f} {A[0,1]:.4f} {A[0,2]:7.2f} | {A[1,0]:.4f} {A[1,1]:.4f} {A[1,2]:7.2f}')
json.dump(rows,open('schedule.json','w'))
