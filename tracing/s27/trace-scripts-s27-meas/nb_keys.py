import cv2, numpy as np, json
from scipy.optimize import least_squares
from chamfer import edge_dt, rrect, sample
K={119.6:[[1666,718],[1933,713],[2151,789],[1809,799]],
 121.0:[[1732,732],[2020,726],[2162,820],[1773,826]],
 121.8:[[1764,738],[2141,752],[2126,843],[1708,829]],
 122.4:[[1662,829],[1926,759],[2300,840],[2015,912]],
 123.0:[[1623,829],[1976,776],[2264,876],[1911,929]],
 123.6:[[1591,833],[2020,792],[2250,886],[1821,927]],
 124.4:[[1564,833],[2023,797],[2194,891],[1735,927]],
 125.0:[[1562,830],[2020,807],[2267,913],[1809,936]],
 127.8:[[1546,830],[2023,807],[2211,913],[1734,936]]}
SRC=np.float32([[0,0],[100,0],[100,60],[0,60]]); P=rrect(0,100,0,60,2,n=40)
out={}
for t,c in K.items():
    c0=np.array(c,float).ravel(); dt=edge_dt(t)
    def res(p):
        H=cv2.getPerspectiveTransform(SRC,np.float32(p).reshape(4,2)); q=cv2.perspectiveTransform(np.float32(P)[None],H)[0]
        ins=(q[:,0]>2)&(q[:,0]<2203)&(q[:,1]>2)&(q[:,1]<943)
        return np.r_[np.where(ins,sample(dt,q),0),0.05*(p-c0)]
    s=least_squares(res,c0,loss='soft_l1',f_scale=2,diff_step=1e-3)
    out[t]=s.x.round(1).tolist(); print(t,np.round(s.x).astype(int).tolist(),'mean %.2f'%np.mean(res(s.x)[:-8]))
json.dump(out,open('nb_keys.json','w'))
