import cv2, numpy as np, json, re
src=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
g=cv2.GaussianBlur(src,(0,0),0.8).mean(-1)
txt=open('/Users/computer/rootline/apprentice-film/src/shots/s40/glyphs.js').read()
polys=[]
for m in re.finditer(r'\[([\d,]+)\]',txt):
    v=[int(x) for x in m.group(1).split(',')]
    if len(v)>=12: polys.append(np.array(v).reshape(-1,2))
S=4
def raster(dx,dy,steps=None):
    H,W=946,2206
    m=np.zeros((H*1,W*1),np.uint8)
    n=steps or max(2,int(np.hypot(dx,dy)/1.5))
    for s in range(n+1):
        t=s/n
        for p in polys:
            cv2.fillPoly(m,[np.round(p+[dx*t,dy*t]).astype(np.int32)],1)
    stop=(1574,453)
    for s in range(n+1):
        t=s/n; cv2.circle(m,(int(round(stop[0]+dx*t)),int(round(stop[1]+dy*t))),51,1,-1)
    return m
# source bottom profile of the dark band per column
cols=list(range(510,1500,3))
ysrc={}
for x in cols:
    c=g[470:640,x]
    dk=np.where(c<75)[0]
    if len(dk): ysrc[x]=470+dk.max()
def score(dx,dy,extra):
    m=raster(dx,dy)
    err=[]
    for x in cols:
        if x not in ysrc: continue
        ys=np.where(m[:,x])[0]
        if not len(ys): continue
        err.append(ysrc[x]-(ys.max()+extra))
    err=np.array(err); return np.median(np.abs(err)), np.mean(err), len(err)
best=[]
for dx in range(20,56,3):
    for dy in range(46,64,2):
        e=score(dx,dy,2.5)
        best.append((e[0],dx,dy,e[1]))
best.sort(); print(best[:8])
