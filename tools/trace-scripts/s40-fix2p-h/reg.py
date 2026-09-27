# python reg.py rdir [n,n,...] [region ...]  blurred (sigma 3) mean abs diff per region
import cv2, numpy as np, sys, os
rdir=sys.argv[1]
REG={'owl':(1490,190,1700,470),'face':(1525,262,1650,350),'word':(480,290,1490,640),'tag':(540,640,1630,720),'ribL':(0,0,430,780),'ribR':(1760,0,2206,850),
     'cldL':(0,600,900,946),'cldR':(1350,600,2206,946),'sky':(450,0,1750,280),'full':(0,0,2206,946)}
ns=[int(a) for a in sys.argv[2].split(',')] if len(sys.argv)>2 and sys.argv[2] else sorted(int(round(float(f[2:-4])*25)) for f in os.listdir(rdir) if f.startswith('r-'))
bl=lambda x: cv2.GaussianBlur(x,(0,0),3)
print('t      '+' '.join(f'{k:>6}' for k in REG))
acc=[]
for n in ns:
    p=f'{rdir}/r-{n/25:.3f}.png'
    if not os.path.exists(p): continue
    s=bl(cv2.imread(f'src/f{n}.png').astype(np.float32)); r=bl(cv2.imread(p).astype(np.float32))
    out=[np.abs(s[y0:y1,x0:x1]-r[y0:y1,x0:x1]).mean() for (x0,y0,x1,y1) in REG.values()]
    acc.append(out); print(f'{n/25:.2f} '+' '.join(f'{v:6.2f}' for v in out))
print('mean  '+' '.join(f'{v:6.2f}' for v in np.mean(acc,0)))
