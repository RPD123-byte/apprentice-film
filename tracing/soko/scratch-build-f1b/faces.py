#!/usr/bin/env python3
# faces.py map.npy spec.txt : each line "name dir x,y x,y x,y x,y [inset]" (TL TR BR BL) -> corner values (tl tr br bl)
import numpy as np, sys
v=np.load(sys.argv[1])
for line in open(sys.argv[2]):
    line=line.strip()
    if not line or line.startswith('#'): continue
    p=line.split(); name,d=p[0],p[1]; q=[[float(t) for t in s.split(',')] for s in p[2:6]]; ins=float(p[6]) if len(p)>6 else 0.12
    def bil(u,w):
        a=[q[0][k]+(q[1][k]-q[0][k])*u for k in (0,1)]; b=[q[3][k]+(q[2][k]-q[3][k])*u for k in (0,1)]
        return [a[k]+(b[k]-a[k])*w for k in (0,1)]
    def s(u,w,r=3):
        x,y=bil(u,w); x=int(x); y=int(y); return v[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean()
    i=ins; j=1-ins
    c=[s(i,i),s(j,i),s(j,j),s(i,j)]; m=s(.5,.5)
    print(f'  // {name}: centre {m:.2f}')
    print(f'  face(g, [{", ".join("[%g, %g]"%tuple(t) for t in q)}], [{", ".join("%.2f"%x for x in c)}], "{d}", {{ seed: {abs(hash(name))%9000+100} }});')
