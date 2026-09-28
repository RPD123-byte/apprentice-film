import cv2, numpy as np, glob, re, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
d=sys.argv[1]
def srcn(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
def nearest(t):
    n=int(round(t*25))
    if abs(t*25-n)>0.49: n=int(t*25)
    return n
files={float(re.search(r'at-([\d.]+)s',p).group(1)):p for p in glob.glob(d+'/frame-*.png')}
rd=lambda t: cv2.cvtColor(cv2.imread(files[t]),cv2.COLOR_BGR2GRAY).astype(np.float32)
# backgrounds: render frames from snapshots/s21-rev1-a at 70.0 (owl low-left) and 74.4 (owl top)
A='snapshots/s21-rev1-a/'
rbgLow=cv2.cvtColor(cv2.imread(A+'frame-26-at-74.4s.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
rbgTop=cv2.cvtColor(cv2.imread(A+'frame-04-at-70s.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
sbgLow=srcn(1860); sbgTop=srcn(1750)
TH=float(sys.argv[2]) if len(sys.argv)>2 else 40
k=np.ones((3,3),np.uint8)
print(' t      | render bbox (x0,y0,x1,y1) cx,cy area mean | source bbox cx,cy area mean | IoU')
for t in sorted(files):
    if t<69.44 or t>74.52: continue
    r=rd(t); s=srcn(nearest(t))
    out=[]
    ms=[]
    for img,bl,bt in [(r,rbgLow,rbgTop),(s,sbgLow,sbgTop)]:
        # choose bg by which half: owl low if t<72.3
        bg=bl if t<72.5 else bt
        # normalise global flicker by ratio of medians in page
        g=np.median(img[300:700,800:1400])/max(1,np.median(bg[300:700,800:1400]))
        m=(np.abs(img-bg*g)>TH).astype(np.uint8)
        m=cv2.morphologyEx(m,cv2.MORPH_OPEN,k)
        n,lab,st,cen=cv2.connectedComponentsWithStats(m)
        # keep components > 30 px within owl zone (x<700)
        keep=np.zeros_like(m)
        for i in range(1,n):
            if st[i,4]>30 and st[i,0]<760: keep[lab==i]=1
        ms.append(keep)
        ys,xs=np.nonzero(keep)
        if len(xs)==0: out.append('none'); continue
        out.append(f'({xs.min():4d},{ys.min():4d},{xs.max():4d},{ys.max():4d}) {xs.mean():6.1f},{ys.mean():6.1f} {len(xs):6d} {img[keep>0].mean():5.1f}')
    iou=(ms[0]&ms[1]).sum()/max(1,(ms[0]|ms[1]).sum())
    print(f'{t:.3f} | '+' | '.join(out)+f' | {iou:.2f}')
