#!/usr/bin/env python3
# vsrev.py DIR: MAE8 of every DIR/rNNNNN.png against the source, next to the review-2 value for that frame
import re,glob,sys,os,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s23-fix2x-tools'); from m import src
rev={int(m.group(1)):float(m.group(2)) for m in re.finditer(r'k=(\d+) t=[\d.]+ MAE8=([\d.]+)',open('/Users/computer/rootline/apprentice-film/snapshots/s23-rev2-ex/mae.log').read())}
rows=[]
for f in sorted(glob.glob(sys.argv[1]+'/r0*.png')):
    k=int(re.search(r'^r(\d+)',os.path.basename(f)).group(1))
    a=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8); b=cv2.GaussianBlur(cv2.cvtColor(src(k),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    e=float(np.abs(a-b).mean()); rows.append((k,rev.get(k),e))
for k,r,e in rows: print(k,'rev %s now %.2f %s'%('%.2f'%r if r else '  - ',e,'%+.2f'%(e-r) if r else ''))
m=[(r,e) for _,r,e in rows if r]
print('matched %d: mean rev %.3f now %.3f'%(len(m),np.mean([r for r,_ in m]),np.mean([e for _,e in m])))
