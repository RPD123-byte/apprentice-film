# blurfit.py refk k0 k1 step : fit gaussian sigma + line-blur length that turns the (shifted) sharp source frame refk
# into source frame k (camera from s02/cam.js); region = overlap, owl region excluded crudely by big diffs
import sys, re, cv2, numpy as np
refk,k0,k1,st=map(int,sys.argv[1:5])
s=open('/Users/computer/rootline/apprentice-film/src/shots/s02/cam.js').read()
C0=int(re.search(r'CAM0 = (\d+)',s).group(1)); arr=list(map(float,re.search(r'CAM = \[(.*?)\]',s,re.S).group(1).split(',')))
def cam(k):
    i=min(len(arr)//2-1,max(0,k-C0)); return (arr[2*i],arr[2*i+1]) if k>=C0 else (0,0)
def gray(k): return cv2.cvtColor(cv2.imread(f'src/f{k:03d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
R=gray(refk); rc=cam(refk)
def lineblur(im,dx,dy,L):
    if L<1: return im
    n=int(L)+1; acc=np.zeros_like(im)
    for i in range(n):
        u=(i/(n-1)-0.5)*L if n>1 else 0
        M=np.float32([[1,0,dx*u],[0,1,dy*u]]); acc+=cv2.warpAffine(im,M,(im.shape[1],im.shape[0]),borderMode=cv2.BORDER_REFLECT)
    return acc/n
for k in range(k0,k1+1,st):
    c=cam(k); d=(c[0]-rc[0],c[1]-rc[1])
    M=np.float32([[1,0,d[0]],[0,1,d[1]]]); Sh=cv2.warpAffine(R,M,(R.shape[1],R.shape[0]),borderValue=-1)
    T=gray(k)
    valid=(Sh>=0)
    valid=cv2.erode(valid.astype(np.uint8),np.ones((41,41),np.uint8))>0
    if valid.sum()<20000: print(k,'no overlap'); continue
    p=cam(k-1); q=cam(k); step=(q[0]-p[0],q[1]-p[1]); 
    if abs(step[0])+abs(step[1])<0.5:
        p=cam(k-2); step=(q[0]-p[0],q[1]-p[1])
    h=np.hypot(*step) or 1; ux,uy=step[0]/h,step[1]/h
    best=None
    Shc=np.where(Sh<0,0,Sh)
    for L in [0,4,8,12,16,24]:
        LB=lineblur(Shc,ux,uy,L)
        for sg in [0,0.6,1,1.5,2,2.5,3,3.5,4,5,6]:
            B=cv2.GaussianBlur(LB,(0,0),sg) if sg>0 else LB
            e=np.abs(B-T)[valid]
            # robust: ignore the largest 8% (owl / changed parts)
            e=np.sort(e)[:int(len(e)*0.92)].mean()
            if best is None or e<best[0]: best=(e,L,sg)
    e0=np.sort(np.abs(Shc-T)[valid])[:int(valid.sum()*0.92)].mean()
    print(f'{k} {k/25:.2f} step {h:5.1f} best L={best[1]:2d} sigma={best[2]:.1f} err {best[0]:.2f} (sharp err {e0:.2f}) n={valid.sum()}')
