import cv2, glob, re, sys, numpy as np
dirs=sys.argv[1:]
rows=[]
def mask(im):
    hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>185)&(hsv[...,1]<45)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
    n,l,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        cx,cy=cen[i]
        if 500<cx<1800 and a>4000:
            if best is None or a>best[4]: best=(x,y,w,h,a,cx,cy,i)
    if best is None: return None,None
    return best,(l==best[7])
for d in dirs:
    for f in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',f).group(1))
        if not (110.5<t<114.0): continue
        r=f.replace('/frame-','/ref-')
        A=cv2.imread(f); B=cv2.imread(r)
        a,ma=mask(A); b,mb=mask(B)
        if a is None or b is None: print(t,'nomask'); continue
        iou=(ma&mb).sum()/max(1,(ma|mb).sum())
        rows.append((t,a,b,iou))
for t,a,b,iou in sorted(rows):
    print(f"t={t:6.2f} R bbox x{a[0]}-{a[0]+a[2]} y{a[1]}-{a[1]+a[3]} area{a[4]:6d} c({a[5]:.0f},{a[6]:.0f}) | S bbox x{b[0]}-{b[0]+b[2]} y{b[1]}-{b[1]+b[3]} area{b[4]:6d} c({b[5]:.0f},{b[6]:.0f}) IoU {iou:.2f}")
