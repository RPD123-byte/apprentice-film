import cv2, glob, re, sys, numpy as np
dirs=sys.argv[1:]
def mask(im):
    hsv=cv2.cvtColor(cv2.GaussianBlur(im,(0,0),2),cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>175)&(hsv[...,1]<16)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
    n,l,st,cen=cv2.connectedComponentsWithStats(m)
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]; cx,cy=cen[i]
        if 700<cx<1700 and a>5000 and (best is None or a>best[4]): best=(x,y,w,h,a,cx,cy,i)
    return (best,(l==best[7])) if best else (None,None)
seen=set()
rows=[]
for d in dirs:
    for f in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',f).group(1))
        if not (112.7<t<113.9) or t in seen: continue
        seen.add(t)
        a,ma=mask(cv2.imread(f)); b,mb=mask(cv2.imread(f.replace('/frame-','/ref-')))
        if a is None or b is None: print(t,'none'); continue
        iou=(ma&mb).sum()/max(1,(ma|mb).sum())
        rows.append(f"t={t:6.2f} R bbox x{a[0]}-{a[0]+a[2]} y{a[1]}-{a[1]+a[3]} A{a[4]} c({a[5]:.0f},{a[6]:.0f}) | S bbox x{b[0]}-{b[0]+b[2]} y{b[1]}-{b[1]+b[3]} A{b[4]} c({b[5]:.0f},{b[6]:.0f}) IoU {iou:.2f}")
print('\n'.join(sorted(rows)))
