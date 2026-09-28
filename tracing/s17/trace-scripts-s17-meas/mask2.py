import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
bg=cv2.cvtColor(cv2.imread('snapshots/s17-meas/bg.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
bgb=cv2.GaussianBlur(bg,(0,0),1.5)
f0=int(round(48.64*fps)); f1=int(round(53.20*fps))
c.set(cv2.CAP_PROP_POS_FRAMES,f0)
X0,Y0,X1,Y1=300,250,1000,640
res={}
for k in range(f0,f1+1):
    ok,f=c.read(); t=k/fps
    g=cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    d=np.abs(g-bgb)
    m=((d>35)&(g>110)).astype(np.uint8)
    m[:, :X0]=0; m[:, X1:]=0; m[:Y0]=0; m[Y1:]=0
    m[280:470, 800:880]=0 # steam
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    keep=[i for i in range(1,n) if st[i,4]>150]
    mm=np.isin(lab,keep)
    ys,xs=np.nonzero(mm)
    if len(xs)==0: continue
    res[f"{t:.2f}"]=dict(x0=int(xs.min()),x1=int(xs.max()),y0=int(ys.min()),y1=int(ys.max()),cx=float(xs.mean()),cy=float(ys.mean()),area=int(len(xs)))
    print(f"{t:.2f} x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()} c {xs.mean():.0f},{ys.mean():.0f} A {len(xs)}")
    cv2.imwrite(f'snapshots/s17-meas/mk_{t:.2f}.png',(mm[Y0:Y1,X0:X1]*255).astype(np.uint8))
json.dump(res,open('snapshots/s17-meas/owlmask.json','w'))
