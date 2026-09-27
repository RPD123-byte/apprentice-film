# tone.py fills.json renderdir out.json [times] : per-fill visible-region mean luma, render vs source -> gains
import json, sys, cv2, numpy as np, glob, re
F=json.load(open(sys.argv[1])); rd=sys.argv[2]; outp=sys.argv[3]
times=[float(x) for x in (sys.argv[4].split(',') if len(sys.argv)>4 else ['40.08','40.12','40.16'])]
C=np.array([1104.5,642.9])
DOLLY=[0,0.03,0.06,0.091,0.1221,0.1714,0.2052,0.2395,0.2726,0.3076,0.3413,0.3769,0.4122,0.4495,0.4857,0.5223,0.549,0.549,0.57]
planes={L['name']:L['plane'] for L in F['layers']}
order=[L['name'] for L in F['layers']]
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
fills=sorted(F['fills'],key=lambda f:(order.index(f['layer']),f['idx']))
acc={}
for t in times:
    d=DOLLY[int(round((t-40.0)/0.04))]; TT[0]=t
    fs=glob.glob(f'{rd}/frame-*-at-{t:g}s.png')
    if not fs: print('missing',t); continue
    A=cv2.cvtColor(cv2.imread(fs[0]),cv2.COLOR_BGR2GRAY).astype(float); B=cv2.cvtColor(cv2.imread(fs[0].replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(float)
    idx=np.full(A.shape,-1,np.int32)
    for i,f in enumerate(fills):
        pl=planes[f['layer']]
        polys=[np.round(mapp(s,pl,d,f['layer'])*4).astype(np.int32) for s in f['subs']]
        if not polys: continue
        m=np.zeros(A.shape,np.uint8); cv2.fillPoly(m,polys,1,lineType=cv2.LINE_8,shift=2)
        idx[m>0]=i
    hx,top,s=BK[round(t,2)]
    idx[max(0,int(top-30*s)):int(top+300*s), max(0,int(hx-200*s)):int(hx+200*s)]=-1
    for i in range(len(fills)):
        m=idx==i; n=m.sum()
        if n<300: continue
        a=acc.setdefault(i,[0,0,0]); a[0]+=A[m].sum(); a[1]+=B[m].sum(); a[2]+=n
res=[]
for i,(sa,sb,n) in acc.items():
    f=fills[i]; res.append({'layer':f['layer'],'idx':f['idx'],'n':int(n),'ren':sa/n,'src':sb/n})
res.sort(key=lambda r:-r['n']*abs(r['ren']-r['src']))
json.dump(res,open(outp,'w'))
tot=sum(r['n'] for r in res); err=sum(r['n']*abs(r['ren']-r['src']) for r in res)/max(1,tot)
print('weighted |ren-src| over fills:',round(err,1),'px',tot)
for r in res[:25]: print(f"{r['layer']:>9} {r['idx']:>3} n={r['n']:>7} ren={r['ren']:6.1f} src={r['src']:6.1f}")
