import cv2, glob, re, numpy as np, math, os, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
fs=sorted(glob.glob('snapshots/s06-rev1-f1/frame-*.png')+glob.glob('snapshots/s06-rev1-f2/frame-*.png'))
items=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    items.append((t,p))
items.sort()
c=cv2.VideoCapture(V)
c.set(cv2.CAP_PROP_POS_FRAMES,667)
src={}
for n in range(667,727):
    ok,f=c.read(); src[n]=f
os.makedirs(S+'/src',exist_ok=True)
for n,f in src.items(): cv2.imwrite(f'{S}/src/{n}.png',f)
out=[]
for i,(t,p) in enumerate(items):
    n=667+i
    r=cv2.imread(p)
    if r.shape[:2]!=(946,2206): r=cv2.resize(r,(2206,946))
    s=src[n]
    rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32)
    m5=np.abs(cv2.GaussianBlur(rg,(0,0),5)-cv2.GaussianBlur(sg,(0,0),5)).mean()
    m15=np.abs(cv2.GaussianBlur(rg,(0,0),1.5)-cv2.GaussianBlur(sg,(0,0),1.5)).mean()
    print(n, f'{n/25:.2f}', t, r.shape, 'mean r/s', round(rg.mean(),1), round(sg.mean(),1), 'mae5', round(m5,2), 'mae1.5', round(m15,2))
