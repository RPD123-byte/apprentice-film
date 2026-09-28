#!/usr/bin/env python3
# prop.py F0 F1 [--force] : predict frame F1's quads from F0's with dense flow (DIS) between the two source frames:
# per face an affine fit (RANSAC) of the flow over its visible pixels, applied to its corners. Writes roto/F1.txt.
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(_k,'1')
import sys, os, cv2, numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))+'/h'); from common import *
import common; common.RD='/Users/computer/rootline/apprentice-film/snapshots/s15-fix1/roto'; RD=common.RD
F0,F1=int(sys.argv[1]),int(sys.argv[2]); force='--force' in sys.argv
if os.path.exists(f'{RD}/{F1}.txt') and not force: sys.exit(f'{F1}.txt exists (use --force)')
faces=load(F0)
sc=0.5
a=cv2.resize(gray(frame(F0)),None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(gray(frame(F1)),None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); fl=dis.calc(a,b,None)
ids=idmap(faces,(a.shape[0],a.shape[1]),sc); om=cv2.resize(owlmask(F0),(a.shape[1],a.shape[0]))>0
gx=cv2.Sobel(a,cv2.CV_32F,1,0); gy=cv2.Sobel(a,cv2.CV_32F,0,1); gm=np.hypot(gx,gy)
out=[]
for i,(fid,q,opt) in enumerate(faces):
    m=(ids==i)&~om
    # the face's own pixels near image structure (edges carry the motion; flat lit faces do not)
    er=cv2.dilate(m.astype(np.uint8),np.ones((9,9),np.uint8))>0
    ys,xs=np.nonzero(er&(gm>np.percentile(gm[er],60) if er.sum()>50 else er))
    if len(xs)<20:
        out.append((fid,q.copy(),opt)); print(fid,'kept (no pixels)'); continue
    k=np.linspace(0,len(xs)-1,min(len(xs),4000)).astype(int); xs,ys=xs[k],ys[k]
    P=np.float32(np.stack([xs,ys],1)); Q=P+fl[ys,xs]
    M,inl=cv2.estimateAffine2D(P/sc,Q/sc,ransacReprojThreshold=4.0)
    if M is None or inl.sum()<10:
        d=np.median(Q-P,0)/sc; q2=q+d; print(fid,'translate',d.round(1))
    else:
        q2=np.hstack([q,np.ones((4,1))])@M.T; print(fid,'affine inl',int(inl.sum()),'/',len(xs),'shift',(q2-q).mean(0).round(1))
    out.append((fid,q2,opt))
save(F1,out); print('wrote',F1)
