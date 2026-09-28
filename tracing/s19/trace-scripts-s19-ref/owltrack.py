import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.int16)
ref=grab(57.36)
t0,t1,st=[float(x) for x in sys.argv[1:4]]
t=t0
while t<=t1+1e-6:
    g=grab(t); d=np.abs(g-ref)
    d=cv2.GaussianBlur(d.astype(np.float32),(0,0),3)
    m=(d>25).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,sts,cen=cv2.connectedComponentsWithStats(m)
    if n>1:
        big=[i for i in range(1,n) if sts[i,4]>1500]
        if big:
            xs=[sts[i,0] for i in big]; ys=[sts[i,1] for i in big]; xe=[sts[i,0]+sts[i,2] for i in big]; ye=[sts[i,1]+sts[i,3] for i in big]
            area=sum(sts[i,4] for i in big)
            M=np.isin(lab,big); yy,xx=np.nonzero(M)
            print(f'{t:.2f} bbox=({min(xs)},{min(ys)})-({max(xe)},{max(ye)}) c=({xx.mean():.0f},{yy.mean():.0f}) area={area}')
        else: print(f'{t:.2f} none')
    t+=st
