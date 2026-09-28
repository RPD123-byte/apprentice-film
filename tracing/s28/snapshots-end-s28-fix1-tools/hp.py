# high-pass energy ratio render/source per frame (detail pulsing check), sigma-4 error, and steps
import cv2, numpy as np, sys, os
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad'
dirs=sys.argv[3:]; n0,n1=int(sys.argv[1]),int(sys.argv[2])
def hp(im):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32); return (g-cv2.GaussianBlur(g,(0,0),2)).std()
res={d:[] for d in dirs}
for n in range(n0,n1+1):
    S=cv2.imread(f'{SP}/src/{n}.png'); hs=hp(S); Sb=cv2.GaussianBlur(S.astype(np.float32),(0,0),4)
    line=f'{n} {n/25:.2f}'
    for d in dirs:
        R=cv2.imread(f'{d}/{n}.png'); r=hp(R)/hs; e=np.abs(cv2.GaussianBlur(R.astype(np.float32),(0,0),4)-Sb).mean()
        res[d].append((r,e)); line+=f' | {os.path.basename(d)} hp {r:.3f} e {e:.2f}'
    print(line)
for d in dirs:
    a=np.array(res[d]); print(os.path.basename(d),'hp mean %.3f min %.3f max %.3f std %.3f | err %.3f'%(a[:,0].mean(),a[:,0].min(),a[:,0].max(),a[:,0].std(),a[:,1].mean()))
