import cv2, numpy as np, math, json, sys
sys.path.insert(0,'.')
from rig import *
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,1875); ok,F=c.read()
X0,Y0,X1,Y1=650,25,980,195; K=4
img=cv2.resize(F[Y0:Y1,X0:X1],None,fx=K,fy=K,interpolation=cv2.INTER_CUBIC)
def T(p): return (int((p[0]-X0)*K),int((p[1]-Y0)*K))
cfg=json.loads(sys.argv[1]); out=sys.argv[2]
s=cfg['s']; cupref=np.array([773,80.0]); hd=np.array(cfg['hd'])
hx,hy=cupref+hd
H=Head(cfg['head'],0,0)
toF=lambda p: np.array([hx+p[0]*s, hy+p[1]*s])
ol=H.outline(cfg.get('beak',{}).get('el',-0.4))
cv2.polylines(img,[np.array([T(toF(p)) for p in ol])],True,(0,0,255),1)
b=body(cfg['body']); cv2.polylines(img,[np.array([T(toF(p)) for p in b])],True,(255,0,255),1)
hp=cfg['phones']; cp,cz=cup(H,hp); cv2.circle(img,T(toF(cp)),int(hp.get('r',44)*s*K),(0,255,255),1)
bp=band(H,hp)
for (p,z) in bp: cv2.circle(img,T(toF(p)),2,(0,255,0) if z>=-0.02 else (0,120,0),-1)
e=cfg['eye']
for sd in (-1,1):
    q,nz=H.P(sd*e.get('az',0.5),e.get('el',-0.2)); cv2.circle(img,T(toF(q)),4,(255,0,0) if nz>0 else (100,0,0),-1)
bk=cfg.get('beak',{}); q,nz=H.P(0,bk.get('el',-0.4),bk.get('lift',1.12)); cv2.drawMarker(img,T(toF(q)),(0,128,255),cv2.MARKER_CROSS,12,2)
if 'tail' in cfg:
    tl=cfg['tail']; cv2.line(img,T(toF(tl['base'])),T(toF(tl['tip'])),(255,255,0),2)
for f in cfg.get('feet',[]): cv2.circle(img,T(cupref+np.array(f)),5,(0,200,255),2)
print('cup at',toF(cp),'rel cup_ref',toF(cp)-cupref)
cv2.imwrite(out,img)
