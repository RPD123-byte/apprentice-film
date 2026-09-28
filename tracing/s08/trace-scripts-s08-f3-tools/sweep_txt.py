import re, subprocess, sys, numpy as np, cv2
p='/Users/computer/rootline/apprentice-film/src/shots/s08.js'
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'
src=open(p).read()
block=src.split('const CAM = [')[1].split('];')[0]
cam=[tuple(map(float,m.split(','))) for m in re.findall(r'\[([-\d., ]+)\]', block)]
frames=[766,778,790,802,814]
def boxerr(k):
    u=(k-764)/25; c=[c for c in cam if abs(c[0]-u)<1e-6][0]; s,tx,ty=c[1],c[2],c[3]
    a=cv2.imread(f'snapshots/s08-f3-txt/r{k}.png').astype(np.float32); b=cv2.imread(S+f'f{k}.png').astype(np.float32)
    fy0,fy1=int(s*362+ty),int(s*414+ty); x0=int(s*1520+tx); x1=min(2205,int(s*1860+tx))
    A=cv2.GaussianBlur(a,(0,0),1.2)[fy0:fy1,x0:x1]; B=cv2.GaussianBlur(b,(0,0),1.2)[fy0:fy1,x0:x1]
    ink=(200-A.mean(-1)).clip(0).sum()/(200-B.mean(-1)).clip(0).sum()
    return np.abs(A-B).mean(), ink
for v in sys.argv[1:]:
    x,y,size,ls,er=v.split()
    s=open(p).read()
    s=re.sub(r'const TXT = \{[^}]*\};',f'const TXT = {{ x: {x}, y: {y}, size: {size}, ls: {ls}, erode: {er}, cx: 1 }};',s); open(p,'w').write(s)
    subprocess.run(['node','snapshots/s08-f3-tools/r.mjs','snapshots/s08-f3-txt',','.join(map(str,frames))],capture_output=True)
    res=[boxerr(k) for k in frames]
    print(v,':',' '.join('%d: mae %.2f ink %.2f'%(k,e,i) for k,(e,i) in zip(frames,res)),flush=True)
