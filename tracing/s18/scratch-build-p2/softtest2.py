import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s18/trace'); sys.path.insert(0,'.')
import numpy as np, cv2
from trace_plate import build
from vec4 import raster as raster1
exec(open('softtest.py').read().split("for n in [int(v)")[0].split("Z=np.load('owlB_frames.npz')")[1])
Z=np.load('owlB_frames.npz')
n=int(sys.argv[1])
P=Z[f'P{n}']; E=Z[f'E{n}']
d=np.abs(cv2.GaussianBlur(P,(0,0),1.5)-cv2.GaussianBlur(E,(0,0),1.5))
r=((d>0.1)*255).astype(np.uint8); r=cv2.morphologyEx(r,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); r=cv2.morphologyEx(r,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
r=comps(fillholes(r),minA=250); r=cv2.dilate(r,np.ones((5,5),np.uint8)); m=r>0
for lev,eps,pre,s in [([-1,0.22,0.5,0.78],0.7,0.9,2),([-1,.15,.3,.45,.6,.72,.84,.93],1.0,1.5,2.5),([-1,.15,.3,.45,.6,.72,.84,.93],1.4,2.0,3),([-1,.2,.4,.6,.8,.92],1.2,1.5,2.5)]:
    Pn=cv2.GaussianBlur(P,(0,0),pre)
    L=build(Pn,lev,eps=eps,bigA=300,mask=m.astype(np.uint8),minarea=1.5)
    npts=sum(len(rr) for lay in L for v,g in lay for rr in g)
    H,W=P.shape; c=np.zeros((H,W),np.float32)
    for lay in L:
        gs=[g for v,g in lay]; vals=[(v/255,0.,0.) if not isinstance(v,list) else ((v[2]+v[5])/510,0.,0.) for v,g in lay]
        c=raster1(gs,vals,H=H,W=W,canvas=c)
    al=m.astype(np.float32); cb=cv2.GaussianBlur(c*al,(0,0),s); ab=cv2.GaussianBlur(al,(0,0),s); comp=cb+E*(1-ab)
    print(len(lev),eps,pre,s,'pts',npts,'mae %.2f'%(np.abs(comp-P).mean()*255))
    cv2.imwrite(f'st2_{len(lev)}_{eps}.jpg',cv2.resize((np.clip(comp,0,1)*255).astype(np.uint8),None,fx=0.4,fy=0.4))
