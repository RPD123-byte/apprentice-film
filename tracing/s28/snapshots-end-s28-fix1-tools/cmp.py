# cmp.py A B n0 n1 [--reg x0,y0,x1,y1 ...] [--rs] : per-frame sigma4 (whole, regions) for render dirs A and B vs source,
# frames that exist in both; --rs also prints region steps vs source steps. Summary line = means.
import cv2, numpy as np, sys, os
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
a=sys.argv[1:]; A,B=a[0],a[1]; n0,n1=int(a[2]),int(a[3])
regs=[]
if '--reg' in a:
    i=a.index('--reg')+1
    while i<len(a) and not a[i].startswith('--'): regs.append([int(v) for v in a[i].split(',')]); i+=1
rs='--rs' in a; quiet='--quiet' in a
bl=lambda x:cv2.GaussianBlur(x,(0,0),4)
acc=[]; prev=None
for n in range(n0,n1+1):
    pa,pb=f'{A}/{n}.png',f'{B}/{n}.png'
    if not (os.path.exists(pa) and os.path.exists(pb)): prev=None; continue
    S=bl(cv2.imread(f'{SP}/src/{n}.png').astype(np.float32)); Ra=bl(cv2.imread(pa).astype(np.float32)); Rb=bl(cv2.imread(pb).astype(np.float32))
    da,db=np.abs(Ra-S),np.abs(Rb-S)
    row=[da.mean(),db.mean()]+sum([[da[y0:y1,x0:x1].mean(),db[y0:y1,x0:x1].mean()] for x0,y0,x1,y1 in regs],[])
    st=''
    if rs and prev is not None:
        pS,pA,pB=prev
        st=' | rstep '+' '.join(f'{np.abs(Ra-pA)[y0:y1,x0:x1].mean():.2f}/{np.abs(Rb-pB)[y0:y1,x0:x1].mean():.2f}/src {np.abs(S-pS)[y0:y1,x0:x1].mean():.2f}' for x0,y0,x1,y1 in regs)
    prev=(S,Ra,Rb)
    acc.append(row)
    if not quiet: print(n,f'{n/25:.2f}','whole %.2f -> %.2f'%(row[0],row[1]),' '.join('reg %.1f -> %.1f'%(row[2+2*k],row[3+2*k]) for k in range(len(regs))),st,flush=True)
m=np.array(acc).mean(0); print('MEAN',len(acc),'whole %.2f -> %.2f'%(m[0],m[1]),' '.join('reg %.2f -> %.2f'%(m[2+2*k],m[3+2*k]) for k in range(len(regs))))
