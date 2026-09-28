# s15 pass-4 measuring helpers (scratch; numbers only ever leave these scripts)
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS','MKL_NUM_THREADS'): os.environ.setdefault(_k,'1')
import cv2, numpy as np, json, os, re, glob
ROOT='/Users/computer/rootline/apprentice-film'
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
RD=ROOT+'/snapshots/s15-p4/roto'
W,H=2206,946
_cap=None
_cache={}
def frame(f):
    if f in _cache: return _cache[f]
    global _cap
    if _cap is None: _cap=cv2.VideoCapture(SRC)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=_cap.read()
    if len(_cache)>40: _cache.clear()
    _cache[f]=im; return im
def gray(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
# ---- quad text files: roto/<f>.txt, one face per line: id x0 y0 x1 y1 x2 y2 x3 y3 [key=val ...]  (bl br tr tl), far first
def load(f):
    p=f'{RD}/{f}.txt'
    if not os.path.exists(p): return None
    out=[]
    for ln in open(p):
        ln=ln.split('#')[0].strip()
        if not ln: continue
        t=ln.split(); q=np.array([float(x) for x in t[1:9]]).reshape(4,2)
        opt=dict(kv.split('=') for kv in t[9:])
        out.append((t[0],q,opt))
    return out
def save(f,faces):
    with open(f'{RD}/{f}.txt','w') as fp:
        for fid,q,opt in faces:
            fp.write(fid+' '+' '.join(f'{v:.0f}' for v in q.reshape(-1))+''.join(f' {k}={v}' for k,v in opt.items())+'\n')
def jsdata(path):
    s=open(path).read(); i=s.index('= {'); j=s.rindex('}')
    s=re.sub(r'([{,]\s*)([A-Za-z_]\w*|\d+)\s*:',r'\1"\2":',s[i+2:j+1])
    s=re.sub(r',\s*([}\]])',r'\1',s)
    return json.loads(s)
# visible id map (later faces on top), -1 = none
def idmap(faces,shape=(H,W),scale=1.0):
    m=np.full(shape,-1,np.int16)
    for i,(fid,q,opt) in enumerate(faces):
        cv2.fillPoly(m,[np.round(q*scale).astype(np.int32)],int(i))
    return m
OWL=None
def owl(f):
    global OWL
    if OWL is None:
        s=open(ROOT+'/src/shots/s15/track.js').read(); a=s.index('= [')+2; b=s.index('];')
        OWL=json.loads(s[a:b+1])
    t=f/25; best=min(OWL,key=lambda r:abs(r[0]-t)); return best
def owlmask(f,shape=(H,W),pad=1.15):
    o=owl(f); m=np.zeros(shape,np.uint8)
    cx,cy,w,h=o[1],o[2],o[3]*pad,o[4]*pad
    cv2.ellipse(m,(int(cx),int(cy-h*0.05)),(int(w/2),int(h*0.62)),0,0,360,255,-1)
    return m
# the global grade (post.js) without halation/grain/flicker: pixel = S(f) * vignette
def vig(shape=(H,W)):
    y,x=np.mgrid[0:shape[0],0:shape[1]].astype(np.float32)
    qx=((x+0.5)/shape[1]-0.5)*2; qy=((y+0.5)/shape[0]-0.5)*2
    r=np.clip((qx*qx+qy*qy)/2,0,1); return 1-0.38*r**1.15
_S=np.linspace(0,1,4097); _SV=_S*0.65+0.35*(_S*_S*(3-2*_S))
def sinv(p): return np.interp(np.clip(p,0,1),_SV,_S)
