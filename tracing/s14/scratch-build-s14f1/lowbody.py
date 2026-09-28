import cv2, numpy as np, re, sys, glob, math
d=sys.argv[1]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),', l): BK[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
for fp in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(p.split('-at-')[1][:-5])):
    t=float(fp.split('-at-')[1][:-5])
    if t<38.5: continue
    k=round(math.ceil(t*25-1e-6)/25,2); hx,top,s=BK[k]
    out=[]
    for f in [fp, fp.replace('frame-','ref-')]:
        im=cv2.imread(f,0)
        y0=int(top+200*s); y1=int(top+320*s); x0=int(hx-200*s); x1=int(hx+200*s)
        reg=im[y0:y1,x0:x1]; thr=200 if t>=39.98 else 140
        m=reg>thr; ys,xs=np.nonzero(m)
        out.append(xs.mean()+x0 if len(xs) else float('nan'))
        # full owl bbox lower point
    print(f'{t:6.2f} lower-body x centroid render {out[0]:7.1f} source {out[1]:7.1f}  diff {out[0]-out[1]:+6.1f}')
