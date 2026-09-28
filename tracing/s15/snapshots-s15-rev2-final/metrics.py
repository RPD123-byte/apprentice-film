import cv2,numpy as np,glob,re,sys,json
d=sys.argv[1]; frames=[int(x) for x in open(sys.argv[2]).read().split()]
fs=sorted(glob.glob(d+'/frame-*.png'), key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1)))
S='s15-rev2-work/src/f%04d.png'
def g(p): return cv2.imread(p,0).astype(np.float32)
res={}
for p,n in zip(fs,frames):
    r=g(p); s=g(S%n)
    e12=np.abs(cv2.GaussianBlur(r,(0,0),12)-cv2.GaussianBlur(s,(0,0),12)).mean()
    e4=np.abs(cv2.GaussianBlur(r,(0,0),4)-cv2.GaussianBlur(s,(0,0),4)).mean()
    def gm(a):
        a=cv2.GaussianBlur(a,(0,0),2); gx=cv2.Sobel(a,cv2.CV_32F,1,0); gy=cv2.Sobel(a,cv2.CV_32F,0,1); return np.hypot(gx,gy).ravel()
    gc=np.corrcoef(gm(r),gm(s))[0,1]
    # best matching frame
    rb=cv2.GaussianBlur(r,(0,0),8)
    best=min(range(n-2,n+3),key=lambda m: np.abs(rb-cv2.GaussianBlur(g(S%m),(0,0),8)).mean())
    hp=lambda a: (a-cv2.GaussianBlur(a,(0,0),3)).std()
    res[n]=dict(e12=round(float(e12),1),e4=round(float(e4),1),gc=round(float(gc),3),mr=round(float(r.mean()),1),ms=round(float(s.mean()),1),best=best,hpr=round(float(hp(r)),1),hps=round(float(hp(s)),1),
                dark_r=round(float((r<20).mean()),3),dark_s=round(float((s<20).mean()),3))
    print(n,res[n],flush=True)
json.dump(res,open(d.rstrip('/')+'-metrics.json','w'))
