import cv2, glob, sys, re, numpy as np
d=sys.argv[1]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for mm in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),', l): BK[round(float(mm.group(1)), 2)] = (float(mm.group(2)), int(mm.group(3)), float(mm.group(4)))
import math
for f in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t>=40: continue
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    bb=cv2.GaussianBlur(b,(0,0),12); ab=cv2.GaussianBlur(a,(0,0),12)
    m=(np.maximum(bb,ab)>10)
    m[:, :900 if t<39.5 else 0]=False   # the owl sits left in the side view
    # mask the owl roughly: very bright compact blob -> exclude where render or source > 200 in a dilated sense near the owl
    if t>=38.5:
        k=round(math.ceil(t*25-1e-6)/25,2); k=max([x for x in BK if x<=k+1e-6]); hx,top,sc=BK[k]
        m[max(0,int(top-50*sc)):int(top+340*sc), max(0,int(hx-230*sc)):int(hx+230*sc)]=False
    if m.sum()<100: continue
    pa=np.percentile(a[m],[50,90,95,99]); pb=np.percentile(b[m],[50,90,95,99])
    print(f'{t:6.2f} n={m.sum():7d} p50/90/95/99 render {pa.round()} source {pb.round()}  blurMAE {np.abs(ab-bb)[m].mean():5.1f}')
