import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(np.float32)
g=cv2.GaussianBlur(f,(0,0),0.8).mean(-1)
# for columns across a letter bottom, find: face bottom edge (bright->dark), then the dark keyline runs below
def col_events(x,y0,y1):
    c=g[y0:y1,x]
    ev=[]; dark=c<70
    # transitions from not-dark to dark (start of dark run)
    for y in range(1,len(c)):
        if dark[y] and not dark[y-1]: ev.append(y0+y)
    return ev
x0,x1,ytop,ybot=[int(v) for v in sys.argv[2:6]]
F={};K1={};K2={}
for x in range(x0-60,x1+60):
    ev=col_events(x,ytop,ybot)
    if len(ev)>=3: F[x]=ev[0]; K1[x]=ev[1]; K2[x]=ev[2]
xs=np.array(sorted(F)); 
def fit(K):
    best=None
    for dx in range(-10,45):
        for dy in range(10,70):
            err=[];
            for x in xs:
                if x in K and (x-dx) in F: err.append(K[x]-(F[x-dx]+dy))
            if len(err)<30: continue
            e=np.median(np.abs(err))
            if best is None or e<best[0]: best=(e,dx,dy,len(err))
    return best
print('face->K1 (bottom of light band):',fit(K1))
print('face->K2 (start of dark bottom):',fit(K2))
