from fit_base_h import *
import sys
K0=json.load(open('base_k.json'))['corners']
anchors={float(k):np.array(v) for k,v in K0.items() if k!='120.4'}
def top_only(c,dt):
    H=Hof(c); P=rrect(-W/2,W/2,0,D,1.2,n=40); return sample(dt,ph(H,P))
def interp_anchor(t):
    ks=sorted(anchors)
    if t<=ks[0]: return anchors[ks[0]]
    if t>=ks[-1]: return anchors[ks[-1]]
    for a,b in zip(ks,ks[1:]):
        if a<=t<=b: u=(t-a)/(b-a); return anchors[a]*(1-u)+anchors[b]*u
t0,t1,st=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3])
ts=[round(t0+i*st,2) for i in range(int(round((t1-t0)/st))+1)]
out={}; prev=None; prev2=None
for t in ts:
    if prev is not None and prev2 is not None: c0=prev+(prev-prev2)*0.8
    elif prev is not None: c0=prev
    else: c0=interp_anchor(t)
    dt=edge_dt(t)
    best=None
    lid=ph(Hs[t],[[2259,1163],[-91.5,1163]]).ravel()   # hinge ends: BR, BL
    for init in [c0, interp_anchor(t)]:
        init=np.array(init,float); init[4:8]=lid
        sol=least_squares(lambda p: np.r_[top_only(p,dt),0.01*(p-init),0.15*(p[4:8]-lid)],init,loss="soft_l1",f_scale=2.0,diff_step=1e-3)
        m=np.mean(top_only(sol.x,dt))
        if best is None or m<best[1]: best=(sol.x,m)
    prev2=prev; prev=best[0]; out[t]=best[0].tolist()
    print(t,'mean %.2f'%best[1],np.round(best[0]).astype(int).tolist(),flush=True)
json.dump({'layout':L0,'W':W,'D':D,'corners':{str(k):v for k,v in out.items()}},open(sys.argv[4],'w'))
