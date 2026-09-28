import cv2,numpy as np,glob,re,sys,math
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); K=math.ceil(t*25-1e-6)-2420
    r=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
    s=cv2.cvtColor(cv2.imread('snapshots/s24-study/fr/f%03d.png'%K),cv2.COLOR_BGR2GRAY).astype(np.float32)
    r=cv2.resize(r,(552,237),interpolation=cv2.INTER_AREA); s=cv2.resize(s,(552,237),interpolation=cv2.INTER_AREA)
    e2=np.abs(cv2.GaussianBlur(r,(0,0),2)-cv2.GaussianBlur(s,(0,0),2)).mean()
    e8=np.abs(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8)).mean()
    tot.append(e8)
    print('%.4f k%02d  mean r %.0f s %.0f  err σ2(¼) %.1f  σ8(¼) %.1f'%(t,K,r.mean(),s.mean(),e2,e8))
print('mean σ8 err',np.mean(tot))
