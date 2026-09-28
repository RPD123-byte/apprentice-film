from fit_base_h import *
INIT={119.6:[[545,776],[1622,776],[1484,671],[683,669]],
      120.4:[[535,765],[1585,785],[1490,685],[730,670]],
      121.6:[[585,724],[1360,815],[1620,700],[950,655]],
      122.8:[[815,683],[1170,803],[1665,743],[1225,658]],
      124.0:[[1005,667],[1080,777],[1670,747],[1410,652]],
      125.0:[[1044,666],[1075,750],[1667,752],[1430,662]]}
def top_only(c,dt):
    H=Hof(c); P=rrect(-W/2,W/2,0,D,1.2,n=40); return sample(dt,ph(H,P))
out={}
for t,c0 in INIT.items():
    dt=edge_dt(t); c0=np.float32(c0).ravel()
    sol=least_squares(lambda p: np.r_[top_only(p,dt),0.02*(p-c0)],c0,loss="soft_l1",f_scale=2.0,diff_step=1e-3)
    out[t]=sol.x.tolist(); print(t,'mean %.2f'%np.mean(top_only(sol.x,dt)),np.round(sol.x).astype(int).tolist())
json.dump({'layout':L0,'W':W,'D':D,'corners':{str(k):v for k,v in out.items()}},open('base_k.json','w'))
