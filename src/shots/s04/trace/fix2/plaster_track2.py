# plaster_track2.py : the owl's plaster per source frame (measurement only; prints JSON of affines).
# Model on 23.04 (576): strip A c (1590.5, 340) 19.5 deg L 93 w 17; strip B c (1588.5, 337.5) -60 deg L 84 w 15.5
# (chamfer fit, plaster_fit.py, then corrected by hand at 4x: snapshots/s04-fix2-cmp/measure/plfit.jpg). Tracked back frame by frame
# with an ECC affine restricted to the plaster itself (the input mask: the plaster at the later frame, grown 5 px, where
# the head is lit), so the headband beside it (which the head turns behind) does not pull the track; initialised by the
# previous step's motion. 23.08 repeats 23.04.
import cv2, numpy as np, json, sys, math
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
STRIPS=[((1590.5,340.0),19.5,93.0,17.0),((1588.5,337.5),-60.0,84.0,15.5)]
def outline(c,a,L,w,n=48):
    th=math.radians(a); ux,uy=math.cos(th),math.sin(th); nx,ny=-uy,ux; r=w/2; h=max(0,L/2-r); pts=[]
    for k in range(n//2):
        t=-math.pi/2+math.pi*k/(n//2-1); pts.append((c[0]+ux*(h+r*math.cos(t))+nx*r*math.sin(t), c[1]+uy*(h+r*math.cos(t))+ny*r*math.sin(t)))
    for k in range(n//2):
        t=math.pi/2+math.pi*k/(n//2-1); pts.append((c[0]+ux*(-h+r*math.cos(t))+nx*r*math.sin(t), c[1]+uy*(-h+r*math.cos(t))+ny*r*math.sin(t)))
    return np.array(pts)
def ld(f): return cv2.GaussianBlur(cv2.imread(f'{SRC}/{f}.png',0).astype(np.float32),(0,0),1.0)
def apply(A,P): return P@A[:,:2].T+A[:,2]
C0=np.array([1590.0,339.0])
A={576:np.array([[1.,0,0],[0,1,0]])}; A[577]=A[576].copy(); cc={576:1.0,577:1.0}
vel=np.zeros(2)
for f in range(575,553,-1):
    I1=ld(f+1); I0=ld(f); An=A[f+1]
    mask=np.zeros(I1.shape,np.uint8)
    for S in STRIPS: cv2.fillPoly(mask,[np.round(apply(An,outline(*S))).astype(np.int32)],255)
    mask=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    mask[cv2.GaussianBlur(I1,(0,0),5)<150]=0
    c1=apply(An,C0[None])[0]; c0=c1+vel                     # predicted crossing at f
    best=None
    # inits: the previous step's motion, and the phase correlation of a 256 px window round the plaster (+- a little)
    X0,Y0=int(max(0,min(I0.shape[1]-256,c1[0]-128))),int(max(0,min(I0.shape[0]-256,c1[1]-128)))
    (pdx,pdy),_=cv2.phaseCorrelate(I0[Y0:Y0+256,X0:X0+256].copy(),I1[Y0:Y0+256,X0:X0+256].copy())
    inits=[c0-c1]; extra=[np.array([-pdx+a,-pdy+b]) for a in (-12,0,12) for b in (-8,0,8)]+[c0-c1+np.array([a,0]) for a in (-40,-20,20,40)]
    k=0
    while k<len(inits):
        sh=inits[k]; k+=1
        if k==len(inits) and extra and (best is None or best[0]<0.9): inits+=extra; extra=None
        cp=c1+sh; x0,y0=int(cp[0]-110),int(cp[1]-90); tpl=I0[max(0,y0):y0+180,max(0,x0):x0+220].copy(); x0,y0=max(0,x0),max(0,y0)
        # W: template px -> frame f+1 px ; init: identity shift so that the predicted crossing cp -> c1
        w=np.array([[1,0,x0-sh[0]],[0,1,y0-sh[1]]],np.float32)
        try:
            v,w=cv2.findTransformECC(tpl,I1,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6),mask,3)
        except cv2.error: continue
        if best is None or v>best[0]: best=(v,w,x0,y0)
    if best is None or best[0]<0.8:
        # no reliable match (the plaster half behind the headband, 22.20-22.32): its motion carried on from the last two
        # measured frames (the translation extrapolated, the linear part held)
        A[f]=An.copy(); A[f][:,2]+=vel; cc[f]=0.0
        c2=apply(A[f],C0[None])[0]; print(f'{f/25:.2f} extrapolated crossing {c2[0]:.1f},{c2[1]:.1f}',file=sys.stderr); continue
    v,w,x0,y0=best
    # frame f px x -> template (x - (x0, y0)) -> f+1 px: W_f = [L | w2 - L (x0, y0)]; A_f = W_f^-1 o A_{f+1}
    Wf=np.vstack([np.hstack([w[:,:2],(w[:,2]-w[:,:2]@np.array([x0,y0]))[:,None]]),[0,0,1]]).astype(np.float64)
    A[f]=(np.linalg.inv(Wf)@np.vstack([An,[0,0,1]]))[:2]
    cc[f]=float(v); c2=apply(A[f],C0[None])[0]; vel=c2-c1
    print(f'{f/25:.2f} cc {v:.3f} crossing {c2[0]:.1f},{c2[1]:.1f}',file=sys.stderr)
out={f'{f/25:.2f}':[round(x,4) for x in A[f].ravel()] for f in sorted(A)}
print(json.dumps({'A':out,'cc':{f'{f/25:.2f}':round(cc[f],3) for f in sorted(cc)},'strips':STRIPS}))
