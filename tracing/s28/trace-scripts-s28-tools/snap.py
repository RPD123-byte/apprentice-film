#!/usr/bin/env python3
# Snap rough polylines onto the nearest ink line of a SOURCE frame (search along normals, smooth offsets).
# Usage: snap.py T rough.json out.json [--R 14] [--step 10] [--img overlay.jpg] [--eps 1.0]
# rough.json: {name: {"pts":[[x,y],...], "closed":false, "R":14, "mode":"dark"|"edge"}}
import cv2,sys,json,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import grab
a=sys.argv[1:]; opts={}; pos=[]
i=0
while i<len(a):
    if a[i].startswith('--'): opts[a[i][2:]]=a[i+1]; i+=2
    else: pos.append(a[i]); i+=1
t=float(pos[0]); rough=json.load(open(pos[1])); outp=pos[2]
Rdef=float(opts.get('R',14)); step=float(opts.get('step',8)); eps=float(opts.get('eps',1.0))
f=grab(t)
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
g=cv2.GaussianBlur(g,(0,0),1.2)
dark=np.clip(255-g,0,255)          # darkness
# edge strength for regions without ink
gx=cv2.Sobel(cv2.GaussianBlur(g,(0,0),2),cv2.CV_32F,1,0); gy=cv2.Sobel(cv2.GaussianBlur(g,(0,0),2),cv2.CV_32F,0,1)
edge=np.hypot(gx,gy)
H,W=g.shape
def bil(img,x,y):
    x=np.clip(x,0,W-1.001); y=np.clip(y,0,H-1.001)
    x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); fx=x-x0; fy=y-y0
    return (img[y0,x0]*(1-fx)*(1-fy)+img[y0,x0+1]*fx*(1-fy)+img[y0+1,x0]*(1-fx)*fy+img[y0+1,x0+1]*fx*fy)
def resample(p,closed,step):
    p=np.array(p,float)
    if closed: p=np.vstack([p,p[:1]])
    d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))]
    n=max(2,int(d[-1]/step)+1); s=np.linspace(0,d[-1],n)
    q=np.stack([np.interp(s,d,p[:,0]),np.interp(s,d,p[:,1])],1)
    return q[:-1] if closed else q
out={}; o=f.copy()
for name,spec in rough.items():
    pts=spec['pts'] if isinstance(spec,dict) else spec
    closed=spec.get('closed',False) if isinstance(spec,dict) else False
    R=spec.get('R',Rdef) if isinstance(spec,dict) else Rdef
    mode=spec.get('mode','dark') if isinstance(spec,dict) else 'dark'
    img=dark if mode=='dark' else edge
    q=resample(pts,closed,step)
    for it in range(3):
        n=len(q)
        tang=np.roll(q,-1,0)-np.roll(q,1,0) if closed else np.gradient(q,axis=0)
        tang/=np.linalg.norm(tang,axis=1,keepdims=True)+1e-9
        nor=np.stack([-tang[:,1],tang[:,0]],1)
        offs=np.arange(-R,R+0.5,0.5)
        X=q[:,None,0]+nor[:,None,0]*offs[None]; Y=q[:,None,1]+nor[:,None,1]*offs[None]
        v=bil(img,X,Y)
        v=v-0.02*np.abs(offs)[None]*v.max()/R   # mild preference for small moves
        best=offs[np.argmax(v,1)]
        # smooth offsets
        k=5
        bp=np.pad(best,(k//2,),mode='wrap' if closed else 'edge')
        best=np.array([np.median(bp[j:j+k]) for j in range(n)])
        q=q+nor*best[:,None]
        R=max(3,R*0.5)
    ap=cv2.approxPolyDP(q.astype(np.float32).reshape(-1,1,2),eps,closed).reshape(-1,2)
    out[name]=[[round(float(x),1),round(float(y),1)] for x,y in ap]
    cv2.polylines(o,[np.round(q).astype(np.int32).reshape(-1,1,2)],closed,(255,0,255),1)
    cv2.polylines(o,[np.round(np.array(pts)).astype(np.int32).reshape(-1,1,2)],closed,(0,255,0),1)
json.dump(out,open(outp,'w'))
if 'img' in opts:
    allp=np.array([p for v in rough.values() for p in (v['pts'] if isinstance(v,dict) else v)])
    x0,y0=np.maximum(allp.min(0).astype(int)-40,0); x1,y1=allp.max(0).astype(int)+40
    c=cv2.resize(o[y0:y1,x0:x1],None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(opts['img'],c)
print(json.dumps(out))
