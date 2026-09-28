# floorprobe.py fills.json renderdir : floor (R40 grid) blurred luma render/source, averaged over the given frames
import json, sys, cv2, numpy as np, glob, re
F=json.load(open(sys.argv[1])); rd=sys.argv[2]
times=[float(x) for x in (sys.argv[3].split(',') if len(sys.argv)>3 else ['40.08','40.16','40.24'])]
C=np.array([1104.5,642.9])
DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549,0.549,0.57]
planes={L['name']:L['plane'] for L in F['layers']}; order=[L['name'] for L in F['layers']]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),',l): BK[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
DCY=[[40.0,626],[40.2,624],[40.32,614],[40.44,614],[40.52,608],[40.6,600],[40.64,597.5],[40.72,596]]
TT=[0]
def cyat(t):
    xs=[a for a,b in DCY]; ys=[b for a,b in DCY]; return float(np.interp(t,xs,ys))
def mapp(pts,pl,d,name=None):
    C0=C if name not in ('deskTop','deskBase','under') else np.array([1105,cyat(TT[0])])
    p=np.array(pts,float); w=pl[0]*p[:,0]+pl[1]*p[:,1]+pl[2]
    kx=pl[3] if len(pl)>3 else 1; ky=pl[4] if len(pl)>4 else 1
    sx=1/np.maximum(0.02,1-d*w*kx); sy=1/np.maximum(0.02,1-d*w*ky)
    return np.stack([C0[0]+(p[:,0]-C0[0])*sx, C0[1]+(p[:,1]-C0[1])*sy],1)
fl=order.index('floor')
xs=list(range(-100,2301,150)); ys=list(range(655,1011,35))
SA=np.zeros((len(ys),len(xs))); SB=np.zeros_like(SA); N=np.zeros_like(SA)
for t in times:
    d=DOLLY[int(round((t-40.0)/0.04))]; TT[0]=t
    f=glob.glob(f'{rd}/frame-*-at-{t:g}s.png')[0]
    A=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float),(0,0),6)
    B=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(float),(0,0),6)
    cov=np.zeros(A.shape,np.uint8)
    for fi in F['fills']:
        if order.index(fi['layer'])<=fl: continue
        polys=[np.round(mapp(s,planes[fi['layer']],d,fi['layer'])*4).astype(np.int32) for s in fi['subs']]
        if polys: cv2.fillPoly(cov,polys,1,shift=2)
    hx,top,s=BK[round(t,2)]
    cov[max(0,int(top-30*s)):int(top+300*s), max(0,int(hx-200*s)):int(hx+200*s)]=1
    for j,y in enumerate(ys):
        for i,x in enumerate(xs):
            q=mapp([[x,y]],planes['floor'],d)[0]; X,Y=int(q[0]),int(q[1])
            if 0<=X<A.shape[1] and 0<=Y<A.shape[0] and not cov[Y,X]:
                SA[j,i]+=A[Y,X]; SB[j,i]+=B[Y,X]; N[j,i]+=1
print('R40 y \\ x '+''.join(f'{x:>9}' for x in xs))
for j,y in enumerate(ys):
    print(f'{y:>9} '+''.join((f'{int(SA[j,i]/N[j,i]):>4}/{int(SB[j,i]/N[j,i]):<4}' if N[j,i] else '    .    ') for i in range(len(xs))))
