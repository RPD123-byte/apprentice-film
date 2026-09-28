import cv2, glob, re, sys, math, numpy as np, os
# usage: pairs.py snapdir outdir [crop x0 y0 x1 y1] [--w W]
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23rev1/src/'
a=sys.argv[1:]; W=None; FL=None
if '--frames' in a: i=a.index('--frames'); FL=[int(x) for x in open(a[i+1]).read().strip().split(',')]; del a[i:i+2]
if '--w' in a: i=a.index('--w'); W=int(a[i+1]); del a[i:i+2]
d,out=a[0],a[1]; crop=[int(v) for v in a[2:6]] if len(a)>=6 else None
os.makedirs(out,exist_ok=True)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1)))
rows=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    k=math.floor(t*30+1e-9); n=math.floor(k/30*25+1e-3)
    if FL: n=FL[int(re.search(r'frame-(\d+)-',p).group(1))]
    r=cv2.imread(p); s=cv2.imread(SP+'n%05d.png'%n)
    if s is None: print('missing',n); continue
    rb=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
    sb=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
    mae=np.abs(rb-sb).mean(); mr=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).mean(); ms=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).mean()
    rows.append((n,n/25,mae,mr,ms))
    if crop: r=r[crop[1]:crop[3],crop[0]:crop[2]]; s=s[crop[1]:crop[3],crop[0]:crop[2]]
    pair=np.hstack([r,np.full((r.shape[0],6,3),80,np.uint8),s])
    if W: pair=cv2.resize(pair,(W,int(pair.shape[0]*W/pair.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(pair,'R f%d %.2f'%(n,n/25),(8,28),0,0.9,(0,255,255),2)
    cv2.putText(pair,'S f%d %.2f'%(n,n/25),(pair.shape[1]//2+8,28),0,0.9,(0,255,255),2)
    cv2.imwrite(out+'/p%05d.jpg'%n,pair,[cv2.IMWRITE_JPEG_QUALITY,88])
for n,t,m,a1,b1 in rows: print('f%d t=%.2f blurMAE=%.1f meanR=%.1f meanS=%.1f'%(n,t,m,a1,b1))
