#!/usr/bin/env python3
# met.py DIR [k0 k1 step] [--vs DIR2]: mean abs RGB diff vs source after Gaussian blur s4 and s12 (and optional second dir)
import sys, os, cv2, numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t'
args=[a for a in sys.argv[1:] if not a.startswith('--')]
d=args[0]; k0,k1,st=(int(args[1]),int(args[2]),int(args[3])) if len(args)>3 else (2101,2426,1)
out={}
def B(a,s): return cv2.GaussianBlur(a,(0,0),s)
for k in range(k0,k1+1,st):
    p=f'{d}/{k:05d}.png'
    if not os.path.exists(p): continue
    a=cv2.imread(p).astype(np.float32); b=cv2.imread(f'{SP}/src/{k:05d}.png').astype(np.float32)
    out[k]=(float(np.abs(B(a,4)-B(b,4)).mean()), float(np.abs(B(a,12)-B(b,12)).mean()))
import json; json.dump(out,open(d.rstrip('/')+'.met.json','w'))
v=np.array(list(out.values())); print('%s n=%d s4 %.2f s12 %.2f'%(d,len(v),v[:,0].mean(),v[:,1].mean()))
