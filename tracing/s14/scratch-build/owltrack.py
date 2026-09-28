import cv2,numpy as np,glob,re,math
SP="/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad"
rp={}
for p in glob.glob('snapshots/s18-rev1-f[AB]/frame-*.png'):
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); rp[int(math.floor(25*math.floor(30*t+1e-6)/30+1e-6))]=p
def g(p): return cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),3)
S={n:g(f"{SP}/src/f{n:04d}.png") for n in range(1331,1382)}
R={n:g(rp[n]) for n in range(1331,1382)}
def bg(D):
    L=np.median(np.stack([D[n] for n in range(1331,1336)]),0); Rr=np.median(np.stack([D[n] for n in range(1352,1382)]),0)
    b=Rr.copy(); b[:,:1150]=L[:,:1150]; return b
BS,BR=bg(S),bg(R)
def mask(im,b):
    d=np.abs(im-b); m=(d>40).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    k,lab,st,cen=cv2.connectedComponentsWithStats(m)
    if k<2: return None
    i=1+np.argmax(st[1:,4]); x,y,w,h,a=st[i]; return (x,y,x+w,y+h,a,cen[i])
print("n    src bbox (x0,y0,x1,y1) area  cen      | render bbox area cen | dcen")
for n in range(1331,1382):
    a=mask(S[n],BS); b=mask(R[n],BR)
    if a is None or b is None: print(n,a,b); continue
    print(n, a[:4], a[4], tuple(int(v) for v in a[5]), '|', b[:4], b[4], tuple(int(v) for v in b[5]), '| d', tuple(int(v) for v in (b[5]-a[5])))
