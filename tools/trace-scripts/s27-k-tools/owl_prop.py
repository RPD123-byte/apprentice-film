# owl_prop.py T0 T1 : propagate the clean owl mask from T0 forward: per frame an affine of the owl (ECC on the previous
# frame's owl pixels) warps the previous mask; the result (dilated 5 px) is intersected with that frame's GrabCut mask
# om-T.png (which follows occlusion by the lid). Overwrites om-T.png for T0 < T <= T1. Measurement only.
import cv2, numpy as np, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
D='/Users/computer/rootline/apprentice-film/snapshots/s27-k-owl/'
E=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*r+1,2*r+1))
T0=float(sys.argv[1]); T1=float(sys.argv[2])
prev=(cv2.imread(f'{D}om-{T0:.2f}.png')[...,0]>128).astype(np.uint8); pf=cv2.cvtColor(load(T0),cv2.COLOR_BGR2GRAY).astype(np.float32)
n=int(round((T1-T0)/0.04))
base=prev.copy(); Wacc=np.eye(3)
for k in range(1,n+1):
    t=round(T0+0.04*k,2); cf=cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY).astype(np.float32)
    ys,xs=np.nonzero(prev); x0,x1,y0,y1=max(0,xs.min()-60),min(2206,xs.max()+60),max(0,ys.min()-60),min(946,ys.max()+60)
    A=pf[y0:y1,x0:x1]; B=cf[y0:y1,x0:x1]; M=cv2.erode(prev[y0:y1,x0:x1],E(3))*255
    w=np.eye(2,3,dtype=np.float32)
    try: _,w=cv2.findTransformECC(A,B,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),None,5)
    except cv2.error: pass
    # w maps B coords -> A coords (template=A? findTransformECC(template,input): warp input onto template). Here
    # template=A (prev), input=B (cur): w maps prev coords -> cur coords for warpAffine with WARP_INVERSE_MAP on B.
    Wf=np.vstack([w,[0,0,1]]); T=np.array([[1,0,x0],[0,1,y0],[0,0,1]],float); Wg=T@Wf@np.linalg.inv(T)
    warped=cv2.warpAffine(prev,np.linalg.inv(Wg)[:2],(2206,946),flags=cv2.INTER_NEAREST)
    # GrabCut seeded by the warped previous mask: its core is certain owl, a +-12 px band is undecided
    g=np.full(warped.shape,cv2.GC_BGD,np.uint8)
    g[cv2.dilate(warped,E(12))>0]=cv2.GC_PR_BGD; g[warped>0]=cv2.GC_PR_FGD; g[cv2.erode(warped,E(7))>0]=cv2.GC_FGD
    ff=cv2.bilateralFilter(load(t),5,25,4); bgm=np.zeros((1,65)); fgm=np.zeros((1,65))
    cv2.grabCut(ff,g,None,bgm,fgm,4,cv2.GC_INIT_WITH_MASK)
    gc=((g==cv2.GC_FGD)|(g==cv2.GC_PR_FGD)).astype(np.uint8)
    if __import__('os').environ.get('MODE')=='intersect':   # the frame's own GrabCut mask (om-T.png), limited to the warped previous mask
        gc=(cv2.imread(f'{D}om-{t:.2f}.png')[...,0]>128).astype(np.uint8)&cv2.dilate(warped,E(5))
    Wacc=Wg@Wacc
    prior=cv2.warpAffine(base,np.linalg.inv(Wacc)[:2],(2206,946),flags=cv2.INTER_NEAREST)
    cs,_=cv2.findContours(prior,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    hull=np.zeros_like(prior); cv2.fillPoly(hull,[cv2.convexHull(np.vstack(cs))],1)
    HD=int(__import__('os').environ.get('HULLD','0'))
    m=gc&cv2.dilate(hull,E(HD)) if HD>0 else gc
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,E(2))
    nn,cc,st,_=cv2.connectedComponentsWithStats(m)
    if nn>1: kk=1+np.argmax(st[1:,4]); m=(cc==kk).astype(np.uint8)
    o=np.zeros((946,2206,3),np.uint8); o[m>0]=(255,0,255); cv2.imwrite(f'{D}om-{t:.2f}.png',o)
    print(t,'shift',np.round(Wg[:2,2],1),'area',int(m.sum()),'gc',int(gc.sum()),flush=True)
    prev=m; pf=cf
