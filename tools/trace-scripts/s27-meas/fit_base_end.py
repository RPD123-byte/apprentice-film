from fit_base_h import *
L=json.load(open('lid_end.json')); B=json.load(open('base_seq2.json'))['corners']
def lid_hinge(t):
    if t<=128.44: return ph(Hs[t],[[2259,1163],[-91.5,1163]]).ravel()
    if t>=128.8: c=np.array(L[str(round(t,2))]).reshape(4,2); return np.r_[c[2],c[3]]
    a=lid_hinge(128.44); b=lid_hinge(128.8); u=(t-128.44)/0.36; return a+(b-a)*u
def top_only(c,dt):
    H=Hof(c); P=rrect(-W/2,W/2,0,D,1.2,n=40); q=ph(H,P)
    ins=(q[:,0]>2)&(q[:,0]<2203)&(q[:,1]>2)&(q[:,1]<943); return np.where(ins,sample(dt,q),0)
prev=np.array(B['128.36']); prev2=np.array(B['128.24']); out={}
for t in times(128.4,129.28,0.04):
    c0=prev+(prev-prev2)*0.33; hin=lid_hinge(t); c0[4:8]=hin
    dt=edge_dt(t)
    sol=least_squares(lambda p: np.r_[top_only(p,dt),0.01*(p-c0),0.3*(p[4:8]-hin)],c0,loss="soft_l1",f_scale=2.0,diff_step=1e-3)
    prev2=prev; prev=sol.x; out[str(t)]=sol.x.tolist()
    print(t,'mean %.2f'%np.mean(top_only(sol.x,dt)),np.round(sol.x).astype(int).tolist(),flush=True)
json.dump(out,open('base_end.json','w'))
