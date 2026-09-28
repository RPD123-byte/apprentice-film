# silhouette of the white owl in the source vs the owl-only render: rows (y) -> [xmin, xmax] of white pixels connected
# to the owl (threshold), plus bbox
import sys,cv2,numpy as np
sys.path.insert(0,'h'); from common import frame, owl
def mask(g,cx,cy,th):
    m=(g>th).astype(np.uint8)
    n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
    # component containing / nearest the track centre
    best=None;bd=1e9
    for i in range(1,n):
        if st[i,4]<500: continue
        ys,xs=np.nonzero(lab[max(0,cy-40):cy+40,max(0,cx-40):cx+40]==i)
        if len(xs): 
            d=0
        else: continue
        if best is None or st[i,4]>st[best,4]: best=i
    return (lab==best) if best else np.zeros_like(m,bool)
def prof(m):
    ys,xs=np.nonzero(m)
    if not len(xs): return None
    return dict(x0=int(xs.min()),x1=int(xs.max()),y0=int(ys.min()),y1=int(ys.max()))
for f in map(int,sys.argv[1].split(',')):
    o=owl(f); cx,cy=int(o[1]),int(o[2])
    s=cv2.cvtColor(frame(f),cv2.COLOR_BGR2GRAY); s=cv2.GaussianBlur(s,(0,0),1.2)
    r=cv2.cvtColor(cv2.imread(f'owlr/o{f}.png'),cv2.COLOR_BGR2GRAY)
    ms=mask(s,cx,cy,200); mr=mask(r,cx,cy,120)
    a=prof(ms); b=prof(mr)
    rows=[]
    for y in range(min(a['y0'],b['y0']),max(a['y1'],b['y1'])+1,20):
        xs=np.nonzero(ms[y])[0]; xr=np.nonzero(mr[y])[0]
        rows.append(f"{y}:S{(xs.min(),xs.max()) if len(xs) else '-'} R{(xr.min(),xr.max()) if len(xr) else '-'}")
    print(f, 'S',a,'R',b); print('   ','  '.join(rows))
