# per-frame metrics vs source: sigma4/sigma12 blurred abs diff (8-bit), deltaE76 at sigma4/12, step vs source step,
# and optional region errors.  usage: m.py RENDERDIR [n0 n1] [--reg x0,y0,x1,y1 ...] [--quiet]
import cv2, numpy as np, sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
args=sys.argv[1:]; R=args[0]; rest=[a for a in args[1:] if not a.startswith('--')]
regs=[]
if '--reg' in args:
    i=args.index('--reg')+1
    while i<len(args) and not args[i].startswith('--'): regs.append([int(v) for v in args[i].split(',')]); i+=1
    rest=[a for a in args[1:args.index('--reg')] if not a.startswith('--')]
n0,n1=(int(rest[0]),int(rest[1])) if len(rest)>=2 else (3233,3399)
quiet='--quiet' in args
def bl(a,s): return cv2.GaussianBlur(a,(0,0),s)
def lab(a): return cv2.cvtColor(np.clip(a,0,255).astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)*[100/255,1,1]-[0,128,128]
acc=[];prevR=prevS=None
for n in range(n0,n1+1):
    S=cv2.imread(f'{SP}/src/{n}.png').astype(np.float32); Rr=cv2.imread(f'{R}/{n}.png')
    if Rr is None: continue
    Rr=Rr.astype(np.float32)
    S4,R4=bl(S,4),bl(Rr,4)
    S12,R12=bl(S,12),bl(Rr,12)
    d4=np.abs(R4-S4); row=[d4.mean(),np.abs(R12-S12).mean(),np.linalg.norm(lab(R4)-lab(S4),axis=2).mean(),np.linalg.norm(lab(R12)-lab(S12),axis=2).mean()]
    st=np.abs(R4-prevR).mean() if prevR is not None else 0; ss=np.abs(S4-prevS).mean() if prevS is not None else 0
    rg=[d4[y0:y1,x0:x1].mean() for x0,y0,x1,y1 in regs]
    acc.append(row+rg)
    if not quiet: print(n,f'{n/25:.2f}',' '.join(f'{v:.2f}' for v in row),'| step %.2f src %.2f'%(st,ss),'| reg '+' '.join(f'{v:.1f}' for v in rg) if regs else '',flush=True)
    prevR,prevS=R4,S4
a=np.array(acc); print('MEAN',len(a),'fr',' '.join(f'{v:.2f}' for v in a.mean(0)))
