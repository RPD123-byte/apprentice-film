# tone.py RDIR [step]: percentiles of grey inside the eroded intersection of both owl masks (render vs source), and
# fine-detail energy (|I - blur σ2|) inside it
import cv2, numpy as np, sys, os
R=sys.argv[1]; step=int(sys.argv[2]) if len(sys.argv)>2 else 4
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
ms=np.load(SRC+'/median.npy'); mr=np.load(R+'/median.npy')
B=lambda a,s: cv2.GaussianBlur(a,(0,0),s); g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
print(' t      p10 r/s     p50 r/s     p90 r/s    detail r/s')
acc=[]
for f in range(1736,1863,step):
    t=f/25; p=f'{R}/r-{t:.2f}.png'
    if not os.path.exists(p): continue
    r=g(p); s=g(f'{SRC}/f{f:04d}.png'); k=np.ones((3,3),np.uint8)
    mS=cv2.morphologyEx((np.abs(B(s,1.5)-B(ms,1.5))>22).astype(np.uint8),cv2.MORPH_OPEN,k)
    mR=cv2.morphologyEx((np.abs(B(r,1.5)-B(mr,1.5))>22).astype(np.uint8),cv2.MORPH_OPEN,k)
    I=cv2.erode(mS&mR,np.ones((7,7),np.uint8))>0
    I[:, :140]=False
    if I.sum()<200: continue
    q=lambda a: np.percentile(a[I],[10,50,90])
    a=q(r); b=q(s); dr=np.abs(r-B(r,2))[I].mean(); ds=np.abs(s-B(s,2))[I].mean()
    acc.append([*a,*b,dr,ds])
    print(f'{t:6.2f}  {a[0]:5.0f}/{b[0]:<5.0f} {a[1]:5.0f}/{b[1]:<5.0f} {a[2]:5.0f}/{b[2]:<5.0f} {dr:5.1f}/{ds:<5.1f}')
A=np.array(acc).mean(0); print('MEAN   %5.0f/%-5.0f %5.0f/%-5.0f %5.0f/%-5.0f %5.1f/%-5.1f'%(A[0],A[3],A[1],A[4],A[2],A[5],A[6],A[7]))
