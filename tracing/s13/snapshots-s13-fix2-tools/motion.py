# motion.py DIR : per part region, frame-to-frame shift (phase correlation) in the source vs the render
import cv2, numpy as np, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'; d=sys.argv[1]
REG={'head':(900,150,1350,420),'wing':(1650,300,2050,620),'feet':(1160,850,1600,946),'body':(1000,520,1400,760),'tail':(1600,650,1850,940)}
def sh(a,b,box):
    x0,y0,x1,y1=box; A=a[y0:y1,x0:x1].astype(np.float32); B=b[y0:y1,x0:x1].astype(np.float32)
    w=cv2.createHanningWindow(A.shape[::-1],cv2.CV_32F); (dx,dy),r=cv2.phaseCorrelate(A,B,w); return dx,dy
print('frame  '+'  '.join(f'{k:>16s}' for k in REG))
for f in range(884,923):
    s0=cv2.imread(f'{S}/f{f-1}.png',0); s1=cv2.imread(f'{S}/f{f}.png',0); r0=cv2.imread(f'{d}/r{f-1}.png',0); r1=cv2.imread(f'{d}/r{f}.png',0)
    out=[]
    for k,b in REG.items():
        a=sh(s0,s1,b); c=sh(r0,r1,b); ma=np.hypot(*a); mc=np.hypot(*c)
        flag='*' if (ma<0.2 and mc>0.35) else ' '
        out.append(f'{ma:5.2f}/{mc:5.2f}{flag}      ')
    print(f, '  '.join(out))
