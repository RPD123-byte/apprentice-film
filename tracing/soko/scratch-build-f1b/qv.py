#!/usr/bin/env python3
# qv.py map.npy "x,y x,y x,y x,y" [inset] : values at a quad's (TL TR BR BL) inset corners, edge mids and centre
import numpy as np, sys
v=np.load(sys.argv[1]); q=[[float(t) for t in p.split(',')] for p in sys.argv[2].split()]
ins=float(sys.argv[3]) if len(sys.argv)>3 else 0.12
def bil(u,w):
    a=[q[0][k]+(q[1][k]-q[0][k])*u for k in (0,1)]; b=[q[3][k]+(q[2][k]-q[3][k])*u for k in (0,1)]
    return [a[k]+(b[k]-a[k])*w for k in (0,1)]
def s(u,w,r=4):
    x,y=bil(u,w); x=int(x); y=int(y); return v[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean()
i=ins; j=1-ins
print('corners TL %.2f TR %.2f BR %.2f BL %.2f | centre %.2f'%(s(i,i),s(j,i),s(j,j),s(i,j),s(.5,.5)))
print('grid (rows v=0.1..0.9, cols u=0.1..0.9):')
for w in np.linspace(0.1,0.9,5): print('  '+' '.join('%.2f'%s(u,w) for u in np.linspace(0.1,0.9,5)))
