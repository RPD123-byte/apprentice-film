# margins.py RDIR [step]: left-margin brightness near the owl (x 10-130, y = owl y +-130) and top margin near the owl
# (y 5-115, x = owl x +-200), render vs source (σ6), plus the owl's y from probe jsonl on stdin (t -> head)
import cv2, numpy as np, sys, json, os
R=sys.argv[1]; step=int(sys.argv[2]) if len(sys.argv)>2 else 2
C={round(json.loads(l)['t'],2):json.loads(l)['head'] for l in sys.stdin if l.startswith('{')}
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
g=lambda p: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
print('   t    ox   oy   L near r/s     L far r/s    T near r/s')
for f in range(1736,1863,step):
    t=f/25; p=f'{R}/r-{t:.2f}.png'
    if not os.path.exists(p) or round(t,2) not in C: continue
    r=g(p); s=g(f'{SRC}/f{f:04d}.png'); ox,oy=map(int,C[round(t,2)])
    ya,yb=max(0,oy-130),min(946,oy+130)
    Ln=(r[ya:yb,10:130].mean(), s[ya:yb,10:130].mean())
    far=np.ones(946,bool); far[max(0,oy-300):oy+300]=False; far[:130]=False
    Lf=(r[far,10:130].mean(), s[far,10:130].mean()) if far.sum()>20 else (0,0)
    xa,xb=max(0,ox-200),ox+200; Tn=(r[5:115,xa:xb].mean(), s[5:115,xa:xb].mean())
    print(f'{t:6.2f} {ox:4d} {oy:4d}   {Ln[0]:5.1f}/{Ln[1]:<5.1f}   {Lf[0]:5.1f}/{Lf[1]:<5.1f}   {Tn[0]:5.1f}/{Tn[1]:<5.1f}')
