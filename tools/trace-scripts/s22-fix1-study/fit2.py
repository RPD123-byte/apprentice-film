# fit2.py '{json}' out.jpg — overlay the rig's geometry on a source frame. json: n (frame), box [x0,y0,x1,y1], K,
# head centre hc [x,y], s, head{}, phones{}, eye{}, beak{}, body{}, tail{}, sc{x,y,ang,L,rings:[...]}, rot (deg, clockwise, about hc), flip
import cv2, numpy as np, math, json, sys
sys.path.insert(0,'.')
from rig import *
cfg=json.loads(sys.argv[1]); out=sys.argv[2]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,cfg['n']); ok,F=c.read()
X0,Y0,X1,Y1=cfg['box']; K=cfg.get('K',3)
img=cv2.resize(F[Y0:Y1,X0:X1],None,fx=K,fy=K,interpolation=cv2.INTER_CUBIC)
def T(p): return (int((p[0]-X0)*K),int((p[1]-Y0)*K))
s=cfg['s']; hx,hy=cfg['hc']; ra=math.radians(cfg.get('rot',0)); fl=-1 if cfg.get('flip') else 1
def toF(p):
    x,y=p[0]*s*fl,p[1]*s
    return np.array([hx+x*math.cos(ra)-y*math.sin(ra), hy+x*math.sin(ra)+y*math.cos(ra)])
H=Head(cfg['head'],0,0)
ol=H.outline(cfg.get('beak',{}).get('el',-0.4))
cv2.polylines(img,[np.array([T(toF(p)) for p in ol])],True,(0,0,255),1)
if 'body' in cfg:
    b=body(cfg['body']); cv2.polylines(img,[np.array([T(toF(p)) for p in b])],True,(255,0,255),1)
hp=cfg.get('phones',{}); cp,cz=cup(H,hp); cv2.circle(img,T(toF(cp)),int(hp.get('r',44)*s*K),(0,255,255),1)
for (p,z) in band(H,hp): cv2.circle(img,T(toF(p)),2,(0,255,0) if z>=-0.02 else (0,110,0),-1)
e=cfg.get('eye',{})
for sd in (-1,1):
    q,nz=H.P(sd*e.get('az',0.5),e.get('el',-0.2)); cv2.circle(img,T(toF(q)),4,(255,0,0) if nz>0.08 else (90,0,0),-1)
bk=cfg.get('beak',{}); q,nz=H.P(0,bk.get('el',-0.4),bk.get('lift',1.12)); cv2.drawMarker(img,T(toF(q)),(0,128,255),cv2.MARKER_CROSS,12,2)
if 'tail' in cfg:
    tl=cfg['tail']; cv2.line(img,T(toF(tl['base'])),T(toF(tl['tip'])),(255,255,0),2)
for L in cfg.get('legs',[]):
    cv2.line(img,T(toF(L['hip'])),T(toF(L['foot'])),(0,200,255),2)
if 'sc' in cfg:
    sc=cfg['sc']; P=np.array([sc['x'],sc['y']]); d=np.array([math.cos(sc['ang']),math.sin(sc['ang'])])
    cv2.line(img,T(P),T(P+d*sc['L']),(255,128,0),2)
    h=-d; e2=np.array([-h[1],h[0]])
    for r in sc.get('rings',[]):
        rc=P+(h*r['u']+e2*r['v'])*sc['L']
        ang=math.degrees(math.atan2(h[1],h[0])+r['rot'])
        cv2.ellipse(img,T(rc),(int(r['rx']*sc['L']*K),int(r['ry']*sc['L']*K)),ang,0,360,(255,128,0),1)
print('cup',toF(cp))
cv2.imwrite(out,img)
