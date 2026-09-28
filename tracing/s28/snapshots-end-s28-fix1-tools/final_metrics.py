# per-frame metrics for the final comparison: before (start of this round) and after vs source
import cv2, numpy as np, sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
OUT=sys.argv[1]
def bl(a,s): return cv2.GaussianBlur(a,(0,0),s)
def lab(a): return cv2.cvtColor(np.clip(a,0,255).astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)*[100/255,1,1]-[0,128,128]
rows=[]; prev={}
f=open(OUT,'w')
f.write('# n t | before s4 s12 dE4 dE12 | after s4 s12 dE4 dE12 | step(s4) before after source\n')
for n in range(3232,3406):
    S=cv2.imread(f'{SP}/src/{n}.png').astype(np.float32); S4=bl(S,4); S12=bl(S,12)
    r={}
    for k,d in (('b','before'),('a','w9')):
        R=cv2.imread(f'{SP}/{d}/{n}.png').astype(np.float32); R4=bl(R,4); R12=bl(R,12)
        r[k]=[np.abs(R4-S4).mean(),np.abs(R12-S12).mean(),np.linalg.norm(lab(R4)-lab(S4),axis=2).mean(),np.linalg.norm(lab(R12)-lab(S12),axis=2).mean()]
        r[k+'s']=np.abs(R4-prev[k]).mean() if k in prev else 0; prev[k]=R4
    r['ss']=np.abs(S4-prev['s']).mean() if 's' in prev else 0; prev['s']=S4
    rows.append((n,r))
    f.write(f"{n} {n/25:.2f} | "+' '.join(f'{v:.2f}' for v in r['b'])+' | '+' '.join(f'{v:.2f}' for v in r['a'])+f" | {r['bs']:.2f} {r['as']:.2f} {r['ss']:.2f}\n")
def mean(a,b,k): x=[r[k] for n,r in rows if a<=n<=b]; return np.mean(x,0)
for nm,a,b in (('s27 tail (not this shot) 129.28',3232,3232),('orbit 129.32-131.32',3233,3283),('locked 131.36-135.68',3284,3392),('card dissolve 135.72-135.96',3393,3399),('shot 129.32-135.96',3233,3399),('s40 head 136.00-136.20',3400,3405)):
    B=mean(a,b,'b'); A=mean(a,b,'a')
    f.write(f'# {nm:34s} {b-a+1:3d} fr  before s4 {B[0]:.2f} s12 {B[1]:.2f} dE4 {B[2]:.2f} dE12 {B[3]:.2f} | after s4 {A[0]:.2f} s12 {A[1]:.2f} dE4 {A[2]:.2f} dE12 {A[3]:.2f}\n')
f.close()
print(open(OUT).read().split('\n# s27')[1] if False else ''.join(l+'\n' for l in open(OUT).read().split('\n') if l.startswith('# ')))
