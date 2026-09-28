from fr import seq
import numpy as np, sys
def lines(col, off, thr=150, maxlen=10):
    idx=np.where(col>thr)[0]; groups=[]
    for i in idx:
        if groups and i-groups[-1][-1]<=1: groups[-1].append(i)
        else: groups.append([i])
    return [round((g[0]+g[-1])/2+off,1) for g in groups if 2<=len(g)<=maxlen]
t0,t1=float(sys.argv[1]),float(sys.argv[2])
for t,f in seq(t0,t1):
    f=f.astype(float); s=f"{t:6.2f}"
    for x in (600,1200,1800):
        col=f[100:420,x-3:x+4].mean(1); s+=f" x{x}:{lines(col,100)}"
    for y in (300,):
        row=f[y-2:y+3,140:260].mean(0); s+=f" L:{lines(row,140)}"
        row=f[y-2:y+3,1930:2030].mean(0); s+=f" R:{lines(row,1930)}"
    print(s)
