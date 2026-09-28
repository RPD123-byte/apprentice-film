import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def srcf(n):
    cap.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
print('t    | s12  s4  | lumR lumS | p10R p10S p90R p90S | gcorr | best-src-frame(off)')
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
    rp=p.replace('frame-','ref-')
    s=cv2.cvtColor(cv2.imread(rp),cv2.COLOR_BGR2GRAY).astype(np.float32)
    if r.shape!=s.shape: r=cv2.resize(r,(s.shape[1],s.shape[0]))
    b12=np.abs(cv2.GaussianBlur(r,(0,0),12)-cv2.GaussianBlur(s,(0,0),12)).mean()
    b4=np.abs(cv2.GaussianBlur(r,(0,0),4)-cv2.GaussianBlur(s,(0,0),4)).mean()
    def gm(a):
        a=cv2.GaussianBlur(a,(0,0),2); gx=cv2.Sobel(a,cv2.CV_32F,1,0); gy=cv2.Sobel(a,cv2.CV_32F,0,1); return np.hypot(gx,gy)
    g1,g2=gm(r),gm(s); gc=np.corrcoef(g1.ravel(),g2.ravel())[0,1]
    # timing: compare blurred render against source frames n-3..n+3
    n=int(round(t*25)); rs=cv2.resize(cv2.GaussianBlur(r,(0,0),6),(441,189))
    best=[]
    for k in range(n-3,n+4):
        sf=cv2.resize(cv2.GaussianBlur(srcf(k),(0,0),6),(441,189)); best.append((np.abs(rs-sf).mean(),k))
    best.sort()
    print(f'{t:5.2f} | {b12:4.1f} {b4:4.1f} | {r.mean():5.1f} {s.mean():5.1f} | {np.percentile(r,10):4.0f} {np.percentile(s,10):4.0f} {np.percentile(r,90):4.0f} {np.percentile(s,90):4.0f} | {gc:.2f} | {best[0][1]}({best[0][1]-n:+d}) {best[0][0]:.1f} vs own {[b for b in best if b[1]==n][0][0]:.1f}')
