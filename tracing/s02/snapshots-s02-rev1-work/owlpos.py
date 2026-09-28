import cv2, numpy as np, glob, re, math
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(SRC)
R={}
for d in ['m3','m4']:
    for p in glob.glob(f'/Users/computer/rootline/apprentice-film/snapshots/s02-rev1-{d}/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); R[math.floor(t*25+0.5)]=p
def owl(im,f):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    m=(cv2.GaussianBlur(g,(0,0),2)>150).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<3000: continue
        cx,cy=cen[i]
        if f>=440 and cx<1250: continue  # skip designer
        if best is None or a>best[4]: best=(x,y,w,h,a,cx,cy)
    return best
print('f   render bbox (x0,y0,x1,y1) area | source bbox area | dcx dcy dw dh')
for f in sorted(R):
    if f<396: continue
    r=cv2.imread(R[f]); cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,s=cap.read()
    a=owl(r,f); b=owl(s,f)
    if a is None or b is None: print(f,a,b); continue
    fmt=lambda o:f'({o[0]:4d},{o[1]:4d},{o[0]+o[2]:4d},{o[1]+o[3]:4d}) {o[4]:6d}'
    print(f, fmt(a),'|',fmt(b), f'{a[5]-b[5]:+6.0f} {a[6]-b[6]:+6.0f} {a[2]-b[2]:+5d} {a[3]-b[3]:+5d}')
