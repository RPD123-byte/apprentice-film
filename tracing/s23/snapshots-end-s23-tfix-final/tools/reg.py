#!/usr/bin/env python3
# reg.py DIR1 DIR2 ... --ks k1,k2 --box x0,y0,x1,y1 : region mean abs RGB diff (blur s4) vs source per dir
import sys, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
a=sys.argv[1:]; ks=[int(x) for x in a[a.index('--ks')+1].split(',')]; box=[int(x) for x in a[a.index('--box')+1].split(',')]
dirs=[d for d in a if not d.startswith('--') and d not in (a[a.index('--ks')+1],a[a.index('--box')+1])]
x0,y0,x1,y1=box
B=lambda im,s:cv2.GaussianBlur(im,(0,0),s)
for d in dirs:
    r4=[];r12=[]
    for k in ks:
        p=f'{d}/{k:05d}.png'
        im=cv2.imread(p)
        if im is None: continue
        s=cv2.imread(f'{SP}/src/{k:05d}.png').astype(np.float32); im=im.astype(np.float32)
        r4.append(np.abs(B(im,4)-B(s,4))[y0:y1,x0:x1].mean()); r12.append(np.abs(B(im,12)-B(s,12))[y0:y1,x0:x1].mean())
    print('%-60s n=%d box s4 %.2f s12 %.2f  | %s'%(d[-40:],len(r4),np.mean(r4),np.mean(r12),' '.join('%.1f'%v for v in r4)))
