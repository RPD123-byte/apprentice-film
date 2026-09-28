import numpy as np,sys,cv2
a=np.load(sys.argv[1]).mean(2)
a2=sys.argv[2]
boxes=[l.split() for l in sys.stdin.read().strip().split('\n')]
for b in boxes:
    k=b[0]; x0,y0,x1,y1=map(int,b[1:5]); c=a[y0:y1,x0:x1]
    # dominant period along x and along y via FFT of detrended mean rows
    def per(sig):
        sig=sig-sig.mean(); n=len(sig)
        if n<16: return 0
        F=np.abs(np.fft.rfft(sig*np.hanning(n))); fr=np.fft.rfftfreq(n)
        m=(fr>1/12)&(fr<1/2.5); 
        if not m.any(): return 0
        i=np.argmax(F*m); return 1/fr[i]
    px=np.median([per(c[j]) for j in range(0,c.shape[0],2)]) if c.shape[1]>16 else 0
    py=np.median([per(c[:,i]) for i in range(0,c.shape[1],2)]) if c.shape[0]>16 else 0
    print(f'{k:10s} mean {c.mean():5.1f} p10 {np.percentile(c,10):4.0f} p50 {np.percentile(c,50):4.0f} p75 {np.percentile(c,75):4.0f} p90 {np.percentile(c,90):4.0f} p98 {np.percentile(c,98):4.0f}  perX {px:4.1f} perY {py:4.1f}')
