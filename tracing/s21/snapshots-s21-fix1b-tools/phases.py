import sys,numpy as np
def load(p):
    d={}
    for l in open(p):
        s=l.split()
        if len(s)>5 and s[0].isdigit(): d[int(s[0])]=[float(x) for x in s[1:]]
    return d
A=load(sys.argv[1]); B=load(sys.argv[2])
P=[('walk',1736,1771),('stop/look/crouch',1772,1799),('flight',1800,1824),('landing',1825,1831),('top edge',1832,1862),('all',1736,1862)]
print('phase               IoU a->b        MAE a->b      halo a->b    full a->b')
for n,a,b in P:
    fa=[A[f] for f in range(a,b+1) if f in A and f in B]; fb=[B[f] for f in range(a,b+1) if f in A and f in B]
    x=np.array(fa).mean(0); y=np.array(fb).mean(0)
    print(f'{n:18s} {x[1]:.3f} -> {y[1]:.3f}   {x[2]:5.1f} -> {y[2]:5.1f}   {x[3]:5.1f} -> {y[3]:5.1f}  {x[8]:5.1f} -> {y[8]:5.1f}')
