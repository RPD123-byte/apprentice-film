#!/usr/bin/env python3
# mae.py dirA [dirB ...] : blurred MAE (σ8) per frame for r*.png in each dir, on the frames all dirs share
import sys,cv2,numpy as np,glob,os,re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src
ds=sys.argv[1:]
ks=None
for d in ds:
    s=set(int(re.search(r'r(\d+)\.png',p).group(1)) for p in glob.glob(d+'/r0*.png'))
    ks=s if ks is None else ks&s
ks=sorted(ks); tot={d:[] for d in ds}
for k in ks:
    gb=cv2.GaussianBlur(cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    row=[]
    for d in ds:
        a=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{d}/r{k:05d}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
        e=np.abs(a-gb).mean(); tot[d].append(e); row.append('%.2f'%e)
    print(k,' '.join(row))
print('mean',' '.join('%.2f'%np.mean(tot[d]) for d in ds),'over',len(ks))
