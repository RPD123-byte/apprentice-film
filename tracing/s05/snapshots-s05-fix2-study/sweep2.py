#!/usr/bin/env python3
# sweep2.py DIR...: sigma-1/2/4 blurred MAE of every kNNN.png vs source frame NNN, whole / outside screen / screen,
# summarised by part of the shot, plus region sigma-2 at 25.00
import sys, glob, re, cv2, numpy as np
rows=[]
for D in sys.argv[1:]:
    for p in glob.glob(D+'/k*.png'):
        k=int(re.search(r'k(\d+)\.png',p).group(1)); r=cv2.imread(p).astype(np.float32).mean(2); s=cv2.imread(f'src/{k}.png').astype(np.float32).mean(2)
        ns=np.ones(r.shape,bool); ns[160:660,300:910]=False
        out=[k]
        for sg in (1,2,4):
            e=np.abs(cv2.GaussianBlur(r,(0,0),sg)-cv2.GaussianBlur(s,(0,0),sg)); out+= [e.mean()]
            if sg==2: out+=[e[ns].mean(), e[~ns].mean()]
        rows.append(out)
rows.sort()
A=np.array(rows)
def part(n,a,b):
    m=(A[:,0]>=a)&(A[:,0]<=b)
    if m.any(): print(f'{n:28s} n{m.sum():3d}  s1 {A[m,1].mean():5.2f} s2 {A[m,2].mean():5.2f} s4 {A[m,5].mean():5.2f} | outside screen s2 {A[m,3].mean():5.2f} | screen s2 {A[m,4].mean():5.2f} | s2 range {A[m,2].min():.1f}-{A[m,2].max():.1f}')
part('all 90',578,667); part('23.12-23.48 settle',578,587); part('23.52-23.96 first clip',588,599); part('24.00-24.12 dissolve',600,603); part('24.16-26.68 second clip',604,667)
for r in rows:
    if r[0] in (578,579,587,588,590,601,625,640,650,667): print(f'k{r[0]} t{r[0]/25:.2f} s2 {r[2]:.2f} outside {r[3]:.2f} screen {r[4]:.2f}')
