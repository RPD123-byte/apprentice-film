import numpy as np
def S(p): return 0.65*p+0.35*p*p*(3-2*p)
def vig(x,y):
    qx=(x/2206-0.5)*2; qy=(0.5-y/946)*2; r=min(1,(qx*qx+qy*qy)/2); return 1-0.38*r**1.15
def inv(v,x,y):
    t=v/255/vig(x,y)
    lo,hi=0.0,1.0
    for _ in range(40):
        m=(lo+hi)/2
        if S(m)<t: lo=m
        else: hi=m
    return lo if t<1 else 1.0
