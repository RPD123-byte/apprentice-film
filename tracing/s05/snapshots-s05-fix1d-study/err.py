#!/usr/bin/env python3
# err.py RENDER.png [REF] [--raw]: blurred MAE (sigma 2 and 6) of the render vs the reference, by region; --raw compares
# against the ungraded reference (render must be ungraded)
import sys, cv2, numpy as np
a=sys.argv; r=cv2.imread(a[1]).astype(np.float32); ref=a[2] if len(a)>2 and not a[2].startswith('--') else 'TB'
if '--raw' in a: s=np.load(f'{ref}_u.npy')*255
else: s=cv2.imread(f'{ref}.png').astype(np.float32) if not ref.isdigit() else cv2.imread(f'src/{ref}.png').astype(np.float32)
rl=r.mean(2); sl=s.mean(2)
REG={'screen':(300,160,910,660),'roomL':(0,0,300,946),'roomT':(300,0,1150,160),'roomR':(1780,0,2206,946),'beanie':(1270,0,1900,300),'face':(1280,200,1470,520),'owl':(1420,220,1780,700),'hands':(560,600,1250,800),'deskL':(0,560,560,946),'deskR':(900,450,1550,650),'shirt':(1500,500,2100,946),'lsleeve':(780,800,1250,946)}
out=[]
for sg in (2,6):
    e=np.abs(cv2.GaussianBlur(rl,(0,0),sg)-cv2.GaussianBlur(sl,(0,0),sg))
    ns=np.ones_like(e,bool); x0,y0,x1,y1=REG['screen']; ns[y0:y1,x0:x1]=False
    out.append(f's{sg} all {e.mean():5.2f} nonscr {e[ns].mean():5.2f} | '+' '.join(f'{n} {e[y0:y1,x0:x1].mean():5.1f}' for n,(x0,y0,x1,y1) in REG.items()))
    if sg==6:
        bias=cv2.GaussianBlur(rl,(0,0),sg)-cv2.GaussianBlur(sl,(0,0),sg)
        out.append('bias6   '+' '.join(f'{n} {bias[y0:y1,x0:x1].mean():+5.1f}' for n,(x0,y0,x1,y1) in REG.items()))
print('\n'.join(out))
