from fr import frame
import numpy as np
def runs(v, thr=110):
    b=v>thr; out=[]; i=0
    while i<len(b):
        if b[i]:
            j=i
            while j<len(b) and b[j]: j+=1
            out.append((i,j)); i=j
        else: i+=1
    return out
def dashes(v, lo=11, hi=18):
    return [(a,b) for a,b in runs(v) if lo<=b-a<=hi]
for k in range(int(74.52*25), int(80.0*25)+1):
    t=k/25; f=frame(t).astype(float)
    top=dashes(f[183:188,:].max(0)); right=dashes(f[:,1971:1978].max(1)); bot=dashes(f[359:364,:].max(0)); left=dashes(f[:,191:197].max(1))
    right=[r for r in right if 180<r[0]<365]; left=[r for r in left if 180<r[0]<365]; top=[r for r in top if 185<r[0]<1980]; bot=[r for r in bot if 185<r[0]<1980]
    s=f"{t:6.2f} top n={len(top):3d} max={max([b for a,b in top],default=0):5d} | right n={len(right):2d} maxy={max([b for a,b in right],default=0):4d} | bot n={len(bot):3d} minx={min([a for a,b in bot],default=0):5d} | left n={len(left):2d} miny={min([a for a,b in left],default=0):4d}"
    print(s)
