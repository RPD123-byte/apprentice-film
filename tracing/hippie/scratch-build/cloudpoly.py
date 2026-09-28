# Trace cloud layer top edges into polylines (colour-page coords).
# usage: cloudpoly.py img s tx ty xc0 xc1 step yc0 yc1 classes   e.g. classes="outer,C,G,O,M"
import cv2, numpy as np, sys, json
img=cv2.imread(sys.argv[1]).astype(np.float32)/255.0; H,W=img.shape[:2]
s,tx,ty=[float(v) for v in sys.argv[2:5]]; xc0,xc1,st,yc0,yc1=[int(v) for v in sys.argv[5:10]]
want=sys.argv[10].split(',')
yy,xx=np.mgrid[0:H,0:W]; qx=(xx/W-0.5)*2; qy=(yy/H-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1); v=1-0.38*r**1.15
lx=np.linspace(0,1,4096); ly=lx*0.65+0.35*(lx*lx*(3-2*lx))
pre=np.interp(np.clip(img/v[...,None],0,1),ly,lx)[...,::-1]*255
pre=cv2.GaussianBlur(pre.astype(np.float32),(0,0),1.0)
pal={'.':'25252f','K':'e476b9','C':'f6dcc0','G':'f2b866','O':'ec7058','M':'d8288f','k':'1e1519','P':'6a3c92'}
names=list(pal); Pm=np.array([[int(pal[n][i:i+2],16) for i in (0,2,4)] for n in names],np.float32)
def cls(x,y):
    fx=int(round(s*x+tx)); fy=int(round(s*y+ty))
    if not(0<=fx<W and 0<=fy<H): return '?'
    return names[((pre[fy,fx][None]-Pm)**2).sum(-1).argmin()]
out={w:[] for w in want}
for xc in range(xc0,xc1+1,st):
    col=[cls(xc,y) for y in range(yc0,yc1)]
    firsts={}; run=1
    for i in range(1,len(col)):
        run = run+1 if col[i]==col[i-1] else 1
        if run==3 and col[i] not in firsts: firsts[col[i]]=yc0+i-2
    nonsky=[v for k,v in firsts.items() if k not in '.?']
    for w in want:
        y = min(nonsky) if (w=='outer' and nonsky) else firsts.get(w)
        out[w].append([xc, y])
# median-3 smoothing
for w in want:
    pts=out[w]; ys=[p[1] for p in pts]
    sm=[]
    for i in range(len(ys)):
        win=[y for y in ys[max(0,i-1):i+2] if y is not None]
        sm.append(None if ys[i] is None else int(np.median(win)))
    out[w]=[[p[0],y] for p,y in zip(pts,sm)]
print(json.dumps(out))
