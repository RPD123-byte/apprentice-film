import sys
from util import *
d=sys.argv[1]; F=[int(v) for v in sys.argv[2].split(',')]
R={'lid':(450,860,1900,946),'room':(0,0,560,560),'owl':(1560,280,1760,560),'full':(0,0,2206,946),'hoodieR':(1300,650,2100,860),'face':(960,300,1250,560)}
acc={k:[] for k in R}
for n in F:
    a=ren(d,n,False); b=src(n,False)
    for k,(x0,y0,x1,y1) in R.items():
        A=a[y0:y1,x0:x1].reshape(-1,3); B=b[y0:y1,x0:x1].reshape(-1,3)
        dark=cv2.cvtColor(b[y0:y1,x0:x1].astype(np.uint8),cv2.COLOR_BGR2GRAY).reshape(-1)<40
        acc[k].append(np.concatenate([A.mean(0)[::-1],B.mean(0)[::-1],A[dark].mean(0)[::-1] if dark.any() else [0,0,0],B[dark].mean(0)[::-1] if dark.any() else [0,0,0]]))
for k in R:
    v=np.mean(acc[k],0)
    print(f'{k:8s} RGB ren {v[0]:6.1f} {v[1]:6.1f} {v[2]:6.1f} src {v[3]:6.1f} {v[4]:6.1f} {v[5]:6.1f}  diff {v[0]-v[3]:+5.2f} {v[1]-v[4]:+5.2f} {v[2]-v[5]:+5.2f} | darks diff {v[6]-v[9]:+5.2f} {v[7]-v[10]:+5.2f} {v[8]-v[11]:+5.2f} (src {v[9]:.1f} {v[10]:.1f} {v[11]:.1f})')
