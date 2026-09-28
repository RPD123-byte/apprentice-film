import cv2, glob, re, sys, numpy as np
dirs=sys.argv[1:]
def load(t,kind):
    for d in dirs:
        g=glob.glob(f"{d}/{kind}-*-at-{t}s.png")
        if g: return cv2.imread(g[0])
cleanR=load('117.4','frame').astype(np.float32); cleanS=load('117.4','ref').astype(np.float32)
def m(im,clean):
    d=cv2.GaussianBlur(np.abs(im.astype(np.float32)-clean).max(-1),(0,0),3)
    mk=(d>40).astype(np.uint8)
    mk[:, :]=mk; mk[0:330,1880:2206]=0 if False else mk[0:330,1880:2206]
    mk=cv2.morphologyEx(mk,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    mk=cv2.morphologyEx(mk,cv2.MORPH_CLOSE,np.ones((25,25),np.uint8))
    n,l,st,c=cv2.connectedComponentsWithStats(mk)
    if n<2: return None,None
    i=1+np.argmax(st[1:,4]); return (st[i],c[i]),(l==i)
ts=sorted({float(re.search(r'at-([\d.]+)s',f).group(1)) for d in dirs for f in glob.glob(d+'/frame-*.png')})
for t in ts:
    if t<114.9 or t>117.0: continue
    ts_=('%g'%t)
    A=load(ts_,'frame'); B=load(ts_,'ref')
    a,ma=m(A,cleanR); b,mb=m(B,cleanS)
    if a is None or b is None: print(t,'none'); continue
    iou=(ma&mb).sum()/max(1,(ma|mb).sum())
    (sa,ca),(sb,cb)=a,b
    print(f"t={t:6.2f} R c({ca[0]:.0f},{ca[1]:.0f}) bbox x{sa[0]}-{sa[0]+sa[2]} y{sa[1]}-{sa[1]+sa[3]} A{sa[4]} | S c({cb[0]:.0f},{cb[1]:.0f}) bbox x{sb[0]}-{sb[0]+sb[2]} y{sb[1]}-{sb[1]+sb[3]} A{sb[4]} | dC ({ca[0]-cb[0]:+.0f},{ca[1]-cb[1]:+.0f}) IoU {iou:.2f}")
