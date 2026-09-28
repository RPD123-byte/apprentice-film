import cv2, numpy as np, glob, sys
d=sys.argv[1]
def pair(t):
    f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(p.split('-at-')[1][:-5])-t)<1e-3][0]
    return cv2.imread(f,0).astype(np.float32), cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
def m(t,x0,y0,x1,y1):
    a,b=pair(t); return f'{a[y0:y1,x0:x1].mean():.0f}/{b[y0:y1,x0:x1].mean():.0f}'
def lap(t,x0,y0,x1,y1):
    a,b=pair(t); L=lambda z: np.abs(cv2.Laplacian(cv2.GaussianBlur(z,(0,0),1),cv2.CV_32F))[y0:y1,x0:x1].mean(); return f'{L(a):.2f}/{L(b):.2f}'
def ht(t,x0,y0,x1,y1):
    a,b=pair(t); out=[]
    for z in (a,b):
        r=z[y0:y1,x0:x1]; hp=r-cv2.GaussianBlur(r,(0,0),4)
        # dominant period along the 45-degree diagonal via autocorrelation of the high-pass
        F=np.abs(np.fft.fft2(hp-hp.mean()))**2; F[0,0]=0
        h,w=F.shape; fy=np.fft.fftfreq(h)[:,None]; fx=np.fft.fftfreq(w)[None,:]
        fr=np.sqrt(fx**2+fy**2); msk=(fr>1/12)&(fr<1/3)
        i=np.argmax(np.where(msk,F,0)); per=1/fr.flat[i]
        out.append(f'pitch {per:.1f} hpstd {hp.std():.1f}')
    return ' | '.join(out)
print('right column x1420-1600 y0-520:', *(f'{t}: {m(t,1420,0,1600,520)}' for t in (40.48,40.56,40.64)))
print('slab x1320-1400 y0-810 at 40.64:', m(40.64,1320,0,1400,810))
print('below plank x1300-1600 y600-946:', *(f'{t}: {m(t,1300,600,1600,946)}' for t in (40.56,40.64)))
for t in (40.24,40.48,40.64): print('floor halftone', t, ht(t,1150,780,1400,946))
print('under-desk lap x1200-1700 y650-946:', *(f'{t}: {lap(t,1200,650,1700,946)}' for t in (40.08,40.24)))
print('synth x1700-2206 y290-500 at 40.08: mean', m(40.08,1700,290,2206,500), 'lap', lap(40.08,1700,290,2206,500))
print('right desk x1700-2206 y300-946 at 40.56 lap:', lap(40.56,1700,300,2206,946))
print('ceiling x600-1600 y0-60:', *(f'{t}: {m(t,600,0,1600,60)}' for t in (40.0,40.48,40.56,40.64)))
print('bottom-left cell x0-276 y473-946:', *(f'{t}: {m(t,0,473,276,946)}' for t in (40.0,40.08,40.32)))
print('top-left cell 40.64:', m(40.64,0,0,276,237), ' cell x1930-2206 y237-473 40.64:', m(40.64,1930,237,2206,473))
print('left half lap x0-1100:', *(f'{t}: {lap(t,0,0,1100,946)}' for t in (40.0,40.32,40.64)))
print('shadow core 40.32 (1000,855):', m(40.32,975,848,1025,862), ' floor round it', m(40.32,1060,840,1110,870))
print('shadow core 40.64 (1064,838):', m(40.64,1040,832,1090,846), ' floor round it', m(40.64,1130,820,1180,850))
