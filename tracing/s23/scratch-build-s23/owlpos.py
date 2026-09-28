import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return f.astype(np.int16)
mode=sys.argv[1]; t0,t1,st=map(float,sys.argv[2:5])
roi=[int(v) for v in sys.argv[5:9]] if len(sys.argv)>=9 else [0,0,2206,946]
if mode=='hole': plate=grab(86.28)
else:
    top=np.median(np.stack([grab(t) for t in (90.8,91.2,91.6,92.0,92.4)]),0)
    bot=np.median(np.stack([grab(t) for t in (88.8,89.0,89.2,89.4,88.6)]),0)
    plate=bot.copy(); plate[:365]=top[:365]
t=t0
while t<=t1+1e-6:
    f=grab(t); d=np.abs(f-plate).max(2).astype(np.uint8)
    m=(d>45).astype(np.uint8)
    x0,y0,x1,y1=roi; mm=np.zeros_like(m); mm[y0:y1,x0:x1]=m[y0:y1,x0:x1]
    mm=cv2.morphologyEx(mm,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,stats,cent=cv2.connectedComponentsWithStats(mm)
    if n<2: print(f"{t:.2f} none"); t+=st; continue
    i=1+np.argmax(stats[1:,4]); x,y,w,h,a=stats[i]
    ys,xs=np.nonzero(lab==i)
    print(f"{t:.2f} bbox=({x},{y})-({x+w},{y+h}) c=({cent[i][0]:.0f},{cent[i][1]:.0f}) area={a} top={y} ")
    t+=st
