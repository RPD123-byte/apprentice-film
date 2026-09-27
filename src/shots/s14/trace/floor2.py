# floor2.py renderdir : R40 floor grid, blurred luma render/source averaged over frames where the point is visible
import cv2, numpy as np, glob, re, sys
rd=sys.argv[1]; times=[40.08,40.16,40.24,40.32,40.40]
C=np.array([1104.5,642.9]); DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549,0.549,0.57]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),',l): BK[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
xs=list(range(500,1700,80)); ys=list(range(670,1010,30))
SA=np.zeros((len(ys),len(xs))); SB=np.zeros_like(SA); N=np.zeros_like(SA)
for t in times:
    d=DOLLY[int(round((t-40)/0.04))]
    f=glob.glob(f'{rd}/frame-*-at-{t:g}s.png')
    if not f: continue
    f=f[0]
    A=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float),(0,0),6)
    B=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(float),(0,0),6)
    hx,top,s=BK[round(t,2)]
    for j,y in enumerate(ys):
        for i,x in enumerate(xs):
            w=y/100-6.43; m=1/max(0.02,1-d*w)
            X=C[0]+(x-C[0])*m; Y=C[1]+(y-C[1])*m
            if not (0<=X<2206 and 0<=Y<946): continue
            if abs(X-hx)<210*s and top-20<Y<top+320*s: continue
            SA[j,i]+=A[int(Y),int(X)]; SB[j,i]+=B[int(Y),int(X)]; N[j,i]+=1
print('R40 y\\x '+''.join(f'{x:>9}' for x in xs))
for j,y in enumerate(ys):
    print(f'{y:>7} '+''.join((f'{int(SA[j,i]/N[j,i]):>4}/{int(SB[j,i]/N[j,i]):<4}' if N[j,i] else '    .    ') for i in range(len(xs))))
