# eyes.py T [x0 y0 x1 y1] [img]: find the owl's eye rings (dark closed rings round a white disc) by ellipse fits
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); box=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>5 else [600,330,820,500]
if len(sys.argv)>6: f=cv2.imread(sys.argv[6])
else:
    c=cv2.VideoCapture(V); c.set(1,round(t*25)); ok,f=c.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
x0,y0,x1,y1=box; cr=g[y0:y1,x0:x1]
up=cv2.resize(cr,None,fx=4,fy=4,interpolation=cv2.INTER_CUBIC)
# white discs: bright regions enclosed by dark
TH=int(__import__("os").environ.get("TH","200")); bw=(up>TH).astype(np.uint8); bw=cv2.erode(bw,np.ones((int(__import__("os").environ.get("ER","1")),)*2,np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(bw)
out=[]
for i in range(1,n):
    a=st[i,4]/16
    if a<120 or a>1400: continue
    m=(lab==i).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=len)
    if len(c)<20: continue
    (cx,cy),(w,h),ang=cv2.fitEllipse(c)
    area=cv2.contourArea(c); ell=np.pi*w*h/4
    if ell<=0 or area/ell<0.85: continue
    # ring darkness just outside
    out.append((x0+cx/4,y0+cy/4,w/8,h/8,ang,area/ell,a))
for o in sorted(out): print('eye? c=(%.1f,%.1f) r=(%.1f,%.1f) ang=%.0f fill=%.2f area=%.0f'%o)
