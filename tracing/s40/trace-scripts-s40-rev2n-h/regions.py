import cv2, numpy as np, sys
def S(n): return cv2.imread(f'src/f{n}.png').astype(np.float32)
def R(n): return cv2.imread(f'all/r-{n/25:.3f}.png').astype(np.float32)
REG={'owl':(1490,190,1700,470),'word':(480,290,1490,640),'tag':(540,640,1630,720),'ribL':(0,0,430,780),'ribR':(1760,0,2206,850),
     'cldL':(0,600,900,946),'cldR':(1350,600,2206,946),'sky':(450,0,1750,280),'full':(0,0,2206,946)}
def bl(x): return cv2.GaussianBlur(x,(0,0),3)
ns=[int(a) for a in sys.argv[1].split(',')] if len(sys.argv)>1 else range(3400,3520,4)
print('t      '+' '.join(f'{k:>6}' for k in REG))
for n in ns:
    s=bl(S(n)); r=bl(R(n))
    out=[]
    for k,(x0,y0,x1,y1) in REG.items():
        out.append(np.abs(s[y0:y1,x0:x1]-r[y0:y1,x0:x1]).mean())
    print(f'{n/25:.2f} '+' '.join(f'{v:6.2f}' for v in out))
