# blobcmp.py DIR : for each frame/ref pair, owl blob centroid/area/bbox at thr (150 before 40.0, 225 after)
import cv2, sys, glob, re, numpy as np
d=sys.argv[1]
def blob(g,thr):
    m=(cv2.GaussianBlur(g,(3,3),0)>thr).astype(np.uint8)
    n,l,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for i in range(1,n):
        if st[i,4]<1500: continue
        cx,cy=cen[i]
        if not(450<cx<1500 and 400<cy<900): continue
        if best is None or st[i,4]>st[best,4]: best=i
    if best is None: return None
    x,y,w,h,a=st[best]; return (cen[best][0],cen[best][1],a,x,x+w,y,y+h)
for f in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
    i,t=re.search(r'frame-(\d+)-at-([\d.]+)s',f).groups(); t=float(t)
    r=glob.glob(f'{d}/ref-{i}-*.png')[0]
    thr=150 if t<40 else 225
    a=blob(cv2.imread(f,0),thr); b=blob(cv2.imread(r,0),thr)
    fmt=lambda z: 'none' if z is None else f'c=({z[0]:.0f},{z[1]:.0f}) A={z[2]} x{z[3]}-{z[4]} y{z[5]}-{z[6]}'
    extra=''
    if a and b: extra=f'  dA={a[2]/b[2]:.2f} dc=({a[0]-b[0]:+.0f},{a[1]-b[1]:+.0f}) dtop={a[5]-b[5]:+d} dbot={a[6]-b[6]:+d} dw={(a[4]-a[3])-(b[4]-b[3]):+d}'
    print(f'{t:.2f} R {fmt(a)} | S {fmt(b)}{extra}')
