import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s18/trace'); sys.path.insert(0,'.')
import numpy as np, cv2
from trace_plate import build
from vec4 import raster as raster1
Z=np.load('owlphase.npz'); P=Z['level_P']; s=Z['level_sil']
m=s>0
print('hist in owl',np.histogram(P[m],bins=10,range=(0,1))[0]/m.sum())
for levels,eps,blur in [([-1,0.2,0.5,0.8],0.45,0),([-1,0.2,0.45,0.65,0.8,0.9],0.45,0),([-1,0.2,0.45,0.65,0.8,0.88,0.94],0.4,0),([-1,0.2,0.45,0.65,0.8,0.88,0.94],0.4,0.7)]:
    L=build(P,levels,eps=eps,bigA=300,mask=m.astype(np.uint8),minarea=1.5)
    H,W=P.shape; c=np.zeros((H,W),np.float32)
    for lay in L:
        gs=[g for v,g in lay]; vals=[(v/255,0.,0.) if not isinstance(v,list) else None for v,g in lay]
        # ramps: approximate by flat mid value for this test
        vals=[(v/255,0.,0.) if not isinstance(v,list) else ((v[2]+v[5])/510,0.,0.) for v,g in lay]
        c=raster1(gs,vals,H=H,W=W,canvas=c)
    if blur: c=cv2.GaussianBlur(c,(0,0),blur)
    n=sum(len(r) for lay in L for v,g in lay for r in g)
    e=np.abs(c-P)[m].mean()*255; e2=np.abs(cv2.GaussianBlur(c,(0,0),1.5)-cv2.GaussianBlur(P,(0,0),1.5))[m].mean()*255
    print(levels,eps,blur,'pts',n,'sharp %.2f b1.5 %.2f'%(e,e2))
    cv2.imwrite('owltest_%d.png'%len(levels),np.hstack([(np.clip(c,0,1)*255).astype(np.uint8),(np.clip(P,0,1)*255).astype(np.uint8)]))
