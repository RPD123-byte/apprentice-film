import cv2, numpy as np, json, time, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s07/trace')
from ridge import trace
from raster import *
from layer import zones_of
T=np.load('../w/T.npy'); g=(T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
R2=cv2.imread(sys.argv[1],0).astype(np.float32)   # a finished render (python mirror)
sf=gblur(cv2.medianBlur(np.clip(g,0,255).astype(np.uint8),11).astype(np.float32),2)
zones,ids=zones_of(sf,1000); nz=len(zones)
mae=lambda A,s=8: np.abs(gblur(A,s)-gblur(g,s)).mean()
print('start %.2f %.2f'%(mae(R2),mae(R2,2)))
R=R2.copy()
for it in range(3):
  r=gblur(g-R,4)
  dc=fit_zone_coeffs(ids,nz,r,np.ones_like(ids,bool))
  zz=[dict(z,c=c) for z,c in zip(zones,dc)]
  R=R+gblur(zone_field(ids,zz,H,W),3)
  print('iter',it,'%.2f %.2f'%(mae(R),mae(R,2)))
