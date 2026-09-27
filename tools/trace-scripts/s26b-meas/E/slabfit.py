# slabfit.py: the out-of-focus slab per frame (2843..2853): mask = differs from the clean colour page (arrival warp),
# low saturation, blurred (low high-frequency energy), minus the owl; fit a rotated rectangle (cx, cy, w, h, angle) by IoU
import cv2, numpy as np, json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def grab(F): cap.set(1,F); ok,f=cap.read(); return f
PA=[[112.7,0.8219,166.7,100.5],[112.9,0.8288,165.8,101.5],[113.1,0.8505,147.1,91.6],[113.3,0.8869,110.1,72.4],[113.45,0.9211,70.6,52.0],[113.6,0.9385,55.2,39.3],[113.8,0.9616,35.8,25.7],[114.05,0.9792,18.9,13.7],[114.3,0.9912,9.0,6.7]]
def arr(t):
    for i in range(1,len(PA)):
        if t<=PA[i][0]:
            a,b=PA[i-1],PA[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return PA[-1][1:]
cc=grab(2937).astype(np.float32)
prev=json.load(open('prevslab.json')) if False else None
K={2843:(-140,1560,-28),2844:(-64,1445,-28),2845:(-5,1332,-22),2846:(246,1185,-28),2847:(393,957,-24),2848:(620,480,-30),2849:(972,60,-32),2850:(1130,-81,-28),2851:(1367,-214,-28),2852:(1515,-335,-28),2853:(1876,-532,-22)}
def rectmask(cx,cy,w,h,a):
    box=cv2.boxPoints(((cx,cy),(w,h),a)); m=np.zeros((946,2206),np.uint8); cv2.fillPoly(m,[box.astype(np.int32)],1); return m>0
res={}
for F in range(2843,2854):
    f=grab(F).astype(np.float32); s,tx,ty=arr(F/25)
    Wc=cv2.warpAffine(cc,np.float32([[s,0,tx],[0,s,ty]]),(2206,946))
    d=cv2.GaussianBlur(np.abs(f-Wc).sum(2),(0,0),5)
    hsv=cv2.cvtColor(cv2.GaussianBlur(f.astype(np.uint8),(0,0),3),cv2.COLOR_BGR2HSV)
    g=cv2.cvtColor(f.astype(np.uint8),cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf=cv2.GaussianBlur(np.abs(g-cv2.GaussianBlur(g,(0,0),1.5)),(0,0),8)
    m=(d>70)&(hsv[...,1]<70)&(hf<5.5)
    m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,np.ones((11,11),np.uint8))>0
    # search: start from the previous builder's key; the slab is 1250x1500 (w along the rotated x axis)
    cx,cy,a=K[F]; w,h=1250,1500
    best=None
    def score(p):
        R=rectmask(*p); return (R&m).sum()/max(1,(R|m).sum())
    p=[cx,cy,w,h,a]; bs=score(p); steps=[60,60,80,80,4]
    for it in range(60):
        imp=False
        for j in range(5):
            for dd in (steps[j],-steps[j]):
                q=list(p); q[j]+=dd; sc=score(q)
                if sc>bs: p,bs,imp=q,sc,True; break
        if not imp:
            steps=[x/2 for x in steps]
            if steps[0]<2: break
    res[F]=[round(v,1) for v in p]+[round(bs,3)]
    print(F,res[F],'mask px',int(m.sum()))
json.dump(res,open('slabfit.json','w'))
