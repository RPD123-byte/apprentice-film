#!/usr/bin/env python3
# xpair.py OUTDIR k1,k2,...  render exact source frames k (via the 1/30 snapshot grid) and pair with source frame k
import sys, subprocess, math, glob, re, os, cv2, numpy as np
ROOT='/Users/computer/rootline/apprentice-film'
SRC=ROOT+'/snapshots/s23-rev1-src/%05d.jpg'
out=sys.argv[1]; ks=[int(x) for x in sys.argv[2].split(',')]
os.makedirs(out,exist_ok=True)
times=[math.ceil(k*1.2-1e-9)/30+0.0005 for k in ks]
for i in range(0,len(ks),60):
    tt=','.join('%.4f'%t for t in times[i:i+60]); sub=out+'/raw%d'%i
    r=subprocess.run(['npx','--yes','hyperframes@0.8.69','snapshot','--at',tt,'--no-end','--describe','false','--timeout','30000','-o',sub],cwd=ROOT,capture_output=True,text=True)
    txt=re.sub(r'\x1b\[[0-9;]*m','',r.stdout+r.stderr)
    for l in txt.splitlines():
        if re.search('error|fail|warn',l,re.I): print(l)
    fs=sorted(glob.glob(sub+'/frame-*.png'),key=lambda p:int(re.search(r'frame-(\d+)',p).group(1)))
    for k,f in zip(ks[i:i+60],fs):
        im=cv2.imread(f)
        if os.environ.get('KEEPPNG'): os.rename(f,out+'/r%05d.png'%k)
        cv2.imwrite(out+'/r%05d.jpg'%k,im,[cv2.IMWRITE_JPEG_QUALITY,93])
    subprocess.run(['rm','-rf',sub])
for k in ks:
    a=cv2.imread(out+'/r%05d.jpg'%k); b=cv2.imread(SRC%k)
    if a is None or b is None: print('missing',k); continue
    ga=cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    gb=cv2.GaussianBlur(cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    print('k=%d t=%.2f MAE=%.1f meanR=%.1f meanS=%.1f'%(k,k/25,np.abs(ga-gb).mean(),ga.mean(),gb.mean()))
