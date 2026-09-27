import numpy as np
from pose import *
Hs=load_H()
R,tv,_=pose_from_H(Hs[119.6])
S=30.4/2206
def s2c(x,y,z=0): return R@np.array([x*S,y*S,z])+tv
hl=s2c(-91.5,1163); hr=s2c(2259,1163); hc=(hl+hr)/2
Kinv=np.linalg.inv(K)
up=R@np.array([0,-1,0.]); xax=R@np.array([1,0,0.]); nrm=R@np.array([0,0,-1.])
a=np.radians(91.6)
bd=np.cos(a)*up+np.sin(a)*nrm; n=np.cross(xax,bd)
def back(u,v,off=0):
    r=Kinv@np.array([u,v,1.]); s=(np.dot(hc,n)+off)/np.dot(r,n); P=r*s
    return np.dot(P-hc,xax), np.dot(P-hc,bd)
for nm,(u,v) in {'FL':(545,774),'FR':(1622,774),'kbBL':(686,678),'kbBR':(1490,678),'kbFL':(671,729),'kbFR':(1493,729),
    'tpTL':(923,735),'tpTR':(1247,735),'tpBL':(908,773),'tpBR':(1259,773),'notchL':(1011,777),'notchR':(1157,777)}.items():
    x,z=back(u,v); print(nm,'X=%.2f Z=%.2f'%(x,z))
# thickness: front bottom edge at y=801 lies below the front edge: find offset T so the point at (556,801) is on plane shifted by -T along normal ... approx using vertical offset in image
