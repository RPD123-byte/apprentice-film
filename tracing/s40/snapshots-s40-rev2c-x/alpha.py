import cv2, numpy as np, glob, re, math
d='snapshots/s40-rev2c-dis'
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
T=[float(re.search(r'at-([\d.]+)s',p).group(1)) for p in fr]
ld=lambda p: cv2.GaussianBlur(cv2.imread(p).astype(np.float32),(0,0),2)
R=[ld(p) for p in fr]; S=[ld(p.replace('frame-','ref-')) for p in fr]
i0=T.index(135.68); i1=min(range(len(T)),key=lambda i:abs(T[i]-137.12))
mask=np.ones(R[0].shape[:2],bool); mask[150:500,1440:1720]=False  # owl
def alpha(X,A,B):
    dA=(X-A)[mask]; dB=(B-A)[mask]; return float((dA*dB).sum()/(dB*dB).sum())
# measured curve from card.js (graded target)
CURVE=[[135.72,0],[135.76,0.002],[135.8,0.034],[135.84,0.068],[135.88,0.105],[135.92,0.139],[135.96,0.173],[136.0,0.206],[136.04,0.242],[136.08,0.279],[136.12,0.316],[136.16,0.355],[136.2,0.395],[136.24,0.435],[136.28,0.473],[136.32,0.509],[136.36,0.545],[136.4,0.581],[136.44,0.617],[136.48,0.652],[136.52,0.688],[136.56,0.689],[136.6,0.722],[136.64,0.757],[136.68,0.789],[136.72,0.82],[136.76,0.851],[136.8,0.883],[136.84,0.913],[136.88,0.944],[136.92,0.974],[136.96,1]]
def cv(t):
    if t<=CURVE[0][0]: return 0
    if t>=CURVE[-1][0]: return 1
    for (a,x),(b,y) in zip(CURVE,CURVE[1:]):
        if a<=t<=b: return x+(y-x)*(t-a)/(b-a)
print(' t      src    rend   diff   curve(t) curve(floor30)')
for i,t in enumerate(T):
    ar=alpha(R[i],R[i0],R[i1]); as_=alpha(S[i],S[i0],S[i1]); tf=math.floor(t*30+1e-6)/30
    print(f'{t:.2f}  {as_:.3f}  {ar:.3f}  {ar-as_:+.3f}  {cv(t):.3f}  {cv(tf):.3f}')
