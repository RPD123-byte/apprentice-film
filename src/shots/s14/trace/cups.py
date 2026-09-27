# cups.py T0 T1 [dir] : centroid of cup-grey pixels either side of the head (units from headX, top) per frame
import cv2, numpy as np, sys, re, glob
sys.argv += []
t0,t1=float(sys.argv[1]),float(sys.argv[2]); src=sys.argv[3] if len(sys.argv)>3 else None
rows={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),',l): rows[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
for n in range(int(round(t0*25)),int(round(t1*25))+1):
    t=round(n/25,2)
    if t not in rows: continue
    hx,top,s=rows[t]
    if src:
        fs=glob.glob(src+f'/frame-*-at-{t:g}s.png')
        if not fs: continue
        f=cv2.imread(fs[0])
    else:
        c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read()
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(float)
    out=[]
    for side in (-1,1):
        xa=int(hx+side*45*s); xb=int(hx+side*105*s); x0,x1=min(xa,xb),max(xa,xb)
        y0=int(top); y1=int(top+140*s)
        R=g[y0:y1,x0:x1]
        # cup = mid grey, next to bright head; exclude black bg (<35) and white (>160)
        m=(R>35)&(R<150)
        # also require being within 50 units of a bright pixel (head) horizontally: skip
        ys,xs=np.where(m)
        if len(xs)<30: out.append('   none   '); continue
        cx=(xs.mean()+x0-hx)/s; cy=(ys.mean()+y0-top)/s; w=(np.percentile(xs,95)-np.percentile(xs,5))/s; h=(np.percentile(ys,95)-np.percentile(ys,5))/s
        out.append(f'({cx:5.0f},{cy:4.0f} w{w:3.0f} h{h:3.0f})')
    print(t,*out)
