# stripe.py RDIR frames : amplitude of the horizontal scan striation (sine fit at the zoomed period) on flat ground
# and on the card paper, output px, render vs source
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import cam
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]
L=lambda im: im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114
def amp(I,x0,y0,x1,y1,P):
    p=I[y0:y1,x0:x1].mean(1); tr=np.convolve(p,np.ones(9)/9,'same'); d=(p-tr)[5:-5]; y=np.arange(len(d))
    A=np.stack([np.sin(2*np.pi*y/P),np.cos(2*np.pi*y/P)],1); c,_,_,_=np.linalg.lstsq(A,d,rcond=None); return np.hypot(*c)
for k in fr:
    s=cam((k-764)/25)[1]; P=2.09*s
    S=L(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32)); R=L(cv2.imread(f'{rd}/r{k}.png').astype(np.float32))
    out=[]
    for nm,b in (('ground',(300,120,560,300)),('ground2',(40,470,300,600)),('paper',None)):
        if b is None:
            # card paper: F0 (1520,560)-(1860,700) mapped to output
            _,sc,tx,ty,_=cam((k-764)/25); b=(int(1520*sc+tx),int(470*sc+ty),int(1850*sc+tx),int(520*sc+ty))
        out.append(f'{nm} {amp(R,*b,P):.2f}/{amp(S,*b,P):.2f} (mean {R[b[1]:b[3],b[0]:b[2]].mean():.0f}/{S[b[1]:b[3],b[0]:b[2]].mean():.0f})')
    print(k,'P %.2f'%P,' | '.join(out))
