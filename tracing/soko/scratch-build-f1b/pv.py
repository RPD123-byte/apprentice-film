#!/usr/bin/env python3
# pv.py map.npy x,y [x,y ...] [--r R] : mean pre-grade value in a (2R+1)^2 box at each point
import numpy as np, sys
v=np.load(sys.argv[1]); r=3; pts=[]
a=sys.argv[2:]
if '--r' in a: i=a.index('--r'); r=int(a[i+1]); a=a[:i]+a[i+2:]
for p in a:
    x,y=[int(float(t)) for t in p.split(',')]
    print(f'{x},{y}: {v[max(0,y-r):y+r+1,max(0,x-r):x+r+1].mean():.3f}')
