from fit3d import *
D=float(sys.argv[2]) if len(sys.argv)>2 else 23.0
ts=[float(x) for x in sys.argv[1].split(',')]
prm=np.array([92.0,D,0.0,0.0,0.0]); T=1.5; out={}
for t in ts:
    dt=edge_dt(t); best=None
    for a0 in [prm[0]-8,prm[0]-4,prm[0],prm[0]+4,prm[0]+8]:
        p0=np.array([a0,prm[2],prm[3],prm[4]])
        f=lambda p: np.r_[resid(t,[p[0],D,p[1],p[2],p[3]],L0,dt,T),0.3*p[1],0.3*p[2],0.3*p[3]]
        sol=least_squares(f,p0,loss='soft_l1',f_scale=3.0,x_scale=[1,1,0.5,0.5])
        if best is None or sol.cost<best.cost: best=sol
    x=best.x; prm=np.array([x[0],D,x[1],x[2],x[3]]); out[t]=prm.tolist()
    print(t,'a=%.1f psi=%.1f dx=%.2f dy=%.2f'%(x[0],x[1],x[2],x[3]),'mean %.2f'%np.mean(resid(t,prm,L0,dt,T)),flush=True)
json.dump({'L':L0,'T':T,'prm':out},open(f'fit3d_D{D}.json','w'))
