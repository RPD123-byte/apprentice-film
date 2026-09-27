import numpy as np, cv2, re, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'; R=sys.argv[1]
frames=[int(x) for x in sys.argv[2].split(',')]
src=open('/Users/computer/rootline/apprentice-film/src/shots/s08.js').read()
block=src.split('const CAM = [')[1].split('];')[0]
cam=[tuple(map(float,m.split(','))) for m in re.findall(r'\[([-\d., ]+)\]', block)]
for k in frames:
    u=(k-764)/25; c=[c for c in cam if abs(c[0]-u)<1e-6][0]; s,tx,ty=c[1],c[2],c[3]
    a=cv2.imread(f'{R}/r{k}.png').astype(np.float32).mean(-1); b=cv2.imread(S+f'f{k}.png').astype(np.float32).mean(-1)
    fy0,fy1=int(s*365+ty),int(s*412+ty); x0=int(s*1520+tx); x1=min(2205,int(s*1860+tx))
    A=(200-a[fy0:fy1,x0:x1]).clip(0); B=(200-b[fy0:fy1,x0:x1]).clip(0)
    ha=A.sum(0); hb=B.sum(0); va=A.sum(1); vb=B.sum(1)
    xs=np.arange(len(ha)).astype(float); ys=np.arange(len(va)).astype(float)
    best=(1e18,)
    for sc in np.arange(0.97,1.031,0.005):
        for sh in np.arange(-8,8.01,0.25):
            q=np.interp(sc*xs+sh,xs,ha)   # render sampled at source position mapping
            e=np.abs(q-hb).sum()
            if e<best[0]: best=(e,sc,sh)
    bv=(1e18,)
    for sc in np.arange(0.94,1.061,0.01):
        for sh in np.arange(-6,6.01,0.25):
            q=np.interp(sc*(ys-len(ys)/2)+len(ys)/2+sh,ys,va); e=np.abs(q-vb).sum()
            if e<bv[0]: bv=(e,sc,sh)
    # src(x) ~ ren(sc*x+sh): render position of a source feature at x is sc*x+sh
    print(k,'x: ren = %.3f*src %+.2f (frame px, box origin %d)  y: scale %.2f shift %+.2f  ink ren/src %.2f'%(best[1],best[2],x0,bv[1],bv[2],A.sum()/B.sum()))
