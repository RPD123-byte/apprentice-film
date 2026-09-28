# motion.py DIR frames : per-region displacement of the SOURCE and of the RENDER vs their own neutral mean (668-677)
import cv2,numpy as np,sys
d=sys.argv[1]; fr=[int(x) for x in sys.argv[2].split(',')]
R={'jawR':(1250,430,1440,800),'hairRup':(1290,430,1440,620),'jawRlow':(1250,620,1400,800),'fist':(650,500,760,620),'crease':(1200,610,1290,700),'nose':(1000,480,1120,580),'cheekL':(760,420,900,560)}
if len(sys.argv)>3: R={k:R[k] for k in sys.argv[3].split(',')}
S=lambda n: cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(np.float32)
Rn=lambda n: cv2.imread(f'{d}/f-{n}.png',0).astype(np.float32)
sm=np.mean([S(n) for n in range(668,678)],0); rm=np.mean([Rn(n) for n in range(668,678) if __import__('os').path.exists(f'{d}/f-{n}.png')],0)
def pc(a,b,box):
    x0,y0,x1,y1=box; w=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F)
    A=cv2.GaussianBlur(a,(0,0),1.5)[y0:y1,x0:x1]; B=cv2.GaussianBlur(b,(0,0),1.5)[y0:y1,x0:x1]
    (dx,dy),r=cv2.phaseCorrelate(A,B,w); return dx,dy
print('frame '+' '.join(f'{k:>22s}' for k in R))
for n in fr:
    row=[]
    for k,box in R.items():
        sx,sy=pc(sm,S(n),box); rx,ry=pc(rm,Rn(n),box); row.append(f'S{sx:+.1f},{sy:+.1f} R{rx:+.1f},{ry:+.1f}')
    print(n,' '.join(f'{r:>22s}' for r in row))
