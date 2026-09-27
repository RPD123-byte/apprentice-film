import numpy as np, cv2, sys
rd=sys.argv[1]
def load(p): return cv2.imread(p).astype(np.float32).mean(-1)
for a,b in [(785,786),(810,811)]:
    s1,s2=load(f'snapshots/s08-f3-src/f{a}.png'),load(f'snapshots/s08-f3-src/f{b}.png')
    r1,r2=load(f'{rd}/r{a}.png'),load(f'{rd}/r{b}.png')
    bl=cv2.GaussianBlur(s1,(0,0),3); gx=cv2.Sobel(bl,cv2.CV_32F,1,0); gy=cv2.Sobel(bl,cv2.CV_32F,0,1)
    flat=(np.hypot(gx,gy)<6); flat[:20]=False
    for lo,hi,lab in [(0,50,'dark'),(150,255,'bright')]:
        m=cv2.erode((flat&(bl>=lo)&(bl<hi)).astype(np.uint8),np.ones((9,9),np.uint8))>0
        ds=s2-s1; dr=r2-r1; out=[]
        for sig in [0,1,2]:
            f=(lambda x: x) if sig==0 else (lambda x,s=sig: cv2.GaussianBlur(x,(0,0),s))
            out.append(f'{sig}:S{f(ds)[m].std():.2f}/R{f(dr)[m].std():.2f}')
        hs=(s1-cv2.GaussianBlur(s1,(0,0),3))[m].std(); hr=(r1-cv2.GaussianBlur(r1,(0,0),3))[m].std()
        h1s=(s1-cv2.GaussianBlur(s1,(0,0),1))[m].std(); h1r=(r1-cv2.GaussianBlur(r1,(0,0),1))[m].std()
        print(a,lab,'temporal',' '.join(out),'| hp3 S',round(hs,2),'R',round(hr,2),'| hp1 S',round(h1s,2),'R',round(h1r,2))
# striation: row-profile FFT on the card paper at 800/810
for k in [786,800,810]:
    for n,im in [('S',load(f'snapshots/s08-f3-src/f{k}.png')),('R',load(f'{rd}/r{k}.png'))]:
        # card paper region in output: pick x 1500-1900, y 650-900 at late frames (paper below text box?) use high rows
        reg=im[600:900,1200:1600] if k>=800 else im[600:900,1300:1700]
        prof=reg.mean(1); prof=prof-cv2.GaussianBlur(prof.reshape(-1,1),(0,0),6).ravel()
        F=np.abs(np.fft.rfft(prof*np.hanning(len(prof)))); fr=np.fft.rfftfreq(len(prof))
        i=np.argmax(F[20:])+20
        top=sorted([(F[j],1/fr[j]) for j in range(20,len(F))],reverse=True)[:3]
        print(k,n,'stripe peaks (amp, period):',[(round(a,1),round(p,2)) for a,p in top])
