# flow_chain.py T0 T1 track.json out.json : chain the designer mesh frame to frame by dense DIS flow of the SOURCE, using
# only the designer's own pixels (GrabCut silhouettes dk-*.png of the nearest key) around each point; points without
# support follow a robust affine of the supported ones. Starts from the tracked mesh at T0. Measurement only.
import cv2, numpy as np, json, sys, glob, re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
T0=float(sys.argv[1]); T1=float(sys.argv[2]); tr=json.load(open(sys.argv[3])); OUT=sys.argv[4]
G=np.array(tr['grid'],float); P=np.array(tr['frames'][str(T0)],float); GX,GY=12,9
MK={}
for f in glob.glob('/Users/computer/rootline/apprentice-film/snapshots/s27-k-mask/dk-*.png'):
    if '_ov' in f: continue
    t=float(re.search(r'dk-([\d.]+)\.png',f).group(1)); MK[t]=cv2.imread(f)[...,0]>128
kt=np.array(sorted(MK))
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4)
nb=[[k2 for k2 in range(len(G)) if abs(k2%GX-k%GX)+abs(k2//GX-k//GX)==1] for k in range(len(G))]
out={str(T0):P.round(1).tolist()}
n=int(round((T1-T0)/0.04)); prev=cv2.GaussianBlur(cv2.cvtColor(load(T0),cv2.COLOR_BGR2GRAY),(0,0),1.0)
H,W=prev.shape
for s_ in range(1,n+1):
    t=round(T0+s_*0.04,2); cur=cv2.GaussianBlur(cv2.cvtColor(load(t),cv2.COLOR_BGR2GRAY),(0,0),1.0)
    fl=dis.calc(prev,cur,None)
    tp=round(t-0.04,2); M=MK[kt[np.argmin(abs(kt-tp))]]
    M=cv2.erode(M.astype(np.uint8),np.ones((9,9),np.uint8))>0     # stay clear of the outline (wall flow leaks there)
    dP=np.zeros_like(P); ok=np.zeros(len(P),bool)
    for k,(x,y) in enumerate(P):
        x0,x1=int(max(0,x-50)),int(min(W,x+51)); y0,y1=int(max(0,y-50)),int(min(H,y+51))
        if x1<=x0 or y1<=y0: continue
        m=M[y0:y1,x0:x1]
        if m.mean()<0.3: continue
        dP[k]=np.median(fl[y0:y1,x0:x1][m],0); ok[k]=True
    A,_=cv2.estimateAffine2D(np.float32(P[ok]),np.float32(P[ok]+dP[ok]),ransacReprojThreshold=4)
    Pa=(P@A[:,:2].T)+A[:,2]
    R=np.where(ok[:,None],P+dP-Pa,0)
    R2=R.copy()
    for k in range(len(P)): R2[k]=0.6*R[k]+0.4*np.mean(R[nb[k]],0)
    R=np.where(ok[:,None],R2,0.5*R2)
    P=Pa+R; prev=cur; out[str(t)]=P.round(1).tolist()
    print(t,'supported',int(ok.sum()),flush=True)
json.dump({'grid':G.tolist(),'frames':out},open(OUT,'w'))
