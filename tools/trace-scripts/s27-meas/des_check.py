import json, numpy as np, cv2, sys
from scipy.interpolate import RBFInterpolator
from common import *
d=json.load(open('des_ctrl.json')); G=np.array(d['grid'])
ref=load(125.0)
tiles=[]
for ts in sys.argv[2].split(','):
    Pt=np.array(d['frames'][ts])
    rbf=RBFInterpolator(Pt,G,kernel='thin_plate_spline',smoothing=1.0)
    yy,xx=np.mgrid[0:946:4,0:2206:4]
    q=np.c_[xx.ravel(),yy.ravel()].astype(float)
    m=rbf(q).reshape(yy.shape[0],yy.shape[1],2).astype(np.float32)
    m=cv2.resize(m,(2206,946),interpolation=cv2.INTER_LINEAR)
    w=cv2.remap(ref,m[...,0],m[...,1],cv2.INTER_LINEAR)
    src=load(float(ts))
    mix=np.hstack([cv2.resize(w,(700,300)),cv2.resize(src,(700,300))])
    cv2.putText(mix,ts,(5,20),0,0.6,(0,255,255),2); tiles.append(mix)
cv2.imwrite(sys.argv[1],np.vstack(tiles))
