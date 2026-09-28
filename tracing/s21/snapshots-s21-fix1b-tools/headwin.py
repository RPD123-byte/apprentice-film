# headwin.py RDIR [probe jsonl on stdin]: mean / p25 of the back half (x < head centre) of a 40x40 head window, render vs source
import cv2, numpy as np, sys, json
R=sys.argv[1]; SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
for l in sys.stdin:
    if not l.startswith('{'): continue
    d=json.loads(l); t=d['t']; cx,cy=map(int,map(round,d['head']))
    G=lambda q: cv2.cvtColor(cv2.imread(q),cv2.COLOR_BGR2GRAY).astype(float); r=G(f'{R}/r-{t:.2f}.png'); s=G(f'{SRC}/f{round(t*25):04d}.png')
    a=r[cy-20:cy+10,cx-22:cx]; b=s[cy-20:cy+10,cx-22:cx]
    print(f'{t:.2f} back-half mean {a.mean():5.1f}/{b.mean():5.1f}  p25 {np.percentile(a,25):5.1f}/{np.percentile(b,25):5.1f}')
