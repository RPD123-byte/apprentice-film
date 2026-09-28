# owlpose2.py T0 T1 thr [dir|-] [k] : robust head centre (contiguous runs), wing tips, bottom, low body centre. units = px / s,
# s = sqrt(A/40486) * k (k converts a thr-215 area to the thr-150 scale: 1/0.905)
import cv2, numpy as np, sys, glob, re
t0,t1=float(sys.argv[1]),float(sys.argv[2]); thr=int(sys.argv[3])
src=sys.argv[4] if len(sys.argv)>4 and sys.argv[4]!='-' else None
k=float(sys.argv[5]) if len(sys.argv)>5 else 1.0
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def frames():
    if src:
        fs=sorted(glob.glob(src+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
        for f in fs:
            t=float(re.search(r'at-([\d.]+)s',f).group(1))
            if t0-1e-6<=t<=t1+1e-6: yield t,cv2.imread(f)
    else:
        c=cv2.VideoCapture(V); n0,n1=int(round(t0*25)),int(round(t1*25)); c.set(cv2.CAP_PROP_POS_FRAMES,n0)
        for n in range(n0,n1+1):
            ok,f=c.read(); yield n/25,f
def run_at(row,x):
    x=int(round(x))
    if not row[x]:
        idx=np.where(row)[0]
        if len(idx)==0: return None
        x=idx[np.argmin(abs(idx-x))]
    a=x
    while a>0 and row[a-1]: a-=1
    b=x
    while b<len(row)-1 and row[b+1]: b+=1
    return a,b
for t,f in frames():
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); m=(g>thr).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    best=max(range(1,n),key=lambda i:st[i][4]); x,y,w,h,a=st[best]
    M=(lab==best); ys,xs=np.where(M); s=np.sqrt(a/40486)*k
    top=y; bot=y+h
    # seed: mean x of the top rows
    ty=np.where(M[top:top+int(10*s)])[1]; x0=ty.mean()
    cs=[];ws=[]
    for yy in range(int(top+20*s),int(top+70*s)):
        r=run_at(M[yy],x0)
        if r: cs.append((r[0]+r[1])/2); ws.append(r[1]-r[0])
    hx=np.median(cs); hw=np.median(ws)/s
    lr=[]
    for yy in range(int(bot-90*s),int(bot-60*s)):
        r=run_at(M[yy],hx)
        if r: lr.append((r[0]+r[1])/2)
    lowX=(np.median(lr)-hx)/s
    il=np.argmin(xs); ir=np.argmax(xs); ib=np.argmax(ys)
    u=lambda v,c0:(v-c0)/s
    print(f"[{t:.2f}, {hx:.1f}, {top}, {s:.3f}, {u(xs[il],hx):.0f}, {u(ys[il],top):.0f}, {u(xs[ir],hx):.0f}, {u(ys[ir],top):.0f}, {u(xs[ib],hx):.0f}, {u(ys[ib],top):.0f}, {lowX:.0f}, {hw:.0f}],")
