import numpy as np, cv2, json
from scipy.optimize import least_squares
cx,cy=1103.,473.
def proj(params,f,ka,U):
    rv=params[:3]; T=params[3:6]
    R,_=cv2.Rodrigues(np.array(rv,float))
    X=np.stack([U[:,0],U[:,1]*ka,np.zeros(len(U))],1)
    P=(R@X.T).T+T
    return np.stack([f*P[:,0]/P[:,2]+cx, f*P[:,1]/P[:,2]+cy],1)
# static fit
Us=np.array([[51,160],[423,160],[423,600.5],[51,600.5],[196,80],[92,201],[373,201]],float)
Ss=np.array([[1124,206],[1550,188],[1612,725],[1065,708],[1283,133],[1165,244],[1500,236]],float)
def rs(p):
    return (proj(p[:6],p[6],p[7],Us)-Ss).ravel()
p0=np.array([0.3,0,0, -200,-300,1500, 1270,0.92])
r=least_squares(rs,p0)
f,ka=r.x[6],r.x[7]; print('static f=%.0f ka=%.3f'%(f,ka),'res',np.abs(r.fun).max().round(1), 'pose',r.x[:6].round(3))
static=r.x[:6]
print('outer corners', proj(static,f,ka,np.array([[0,0],[465,0],[465,648],[0,648]],float)).round(0).tolist())
obs={
 61.52:dict(TL=(1108,150),TR=(1558,120),T=(1150,183),d=(1520,167),edge=((1067,0),(1040,500))),
 61.60:dict(TL=(1075,122),TR=(1558,80),T=(1113,163),d=(1500,130),edge=((1005,0),(1000,500))),
 61.68:dict(TL=(975,110),TR=(1483,60),T=(1020,143),d=(1433,93),edge=((908,0),(925,500))),
 61.76:dict(TL=(820,107),TR=(1333,32),T=(870,148),d=(1292,82),edge=((717,0),(933,520))),
 61.84:dict(TL=(758,117),T=(813,167),d=(1225,58),edge=((650,0),(908,500))),
 61.92:dict(TL=(742,122),T=(783,163),d=(1192,47),edge=((608,0),(867,483))),
 62.00:dict(TL=(725,110),T=(775,160),d=(1183,43),edge=((567,0),(833,500))),
 62.08:dict(TL=(700,107),T=(750,157),d=(1158,23),edge=((533,0),(800,483))),
 62.16:dict(TL=(713,100),T=(767,142),ang=-21,edge=((575,0),(900,483))),
 62.24:dict(TL=(775,97),T=(825,138),ang=-24,edge=((633,0),(983,500))),
 62.32:dict(TL=(850,60),T=(900,110),ang=-25,edge=((717,0),(1033,500))),
 62.40:dict(TL=(925,82),T=(975,123),ang=-30,edge=((792,0),(1083,500))),
 62.48:dict(TL=(1033,75),T=(1083,117),ang=-29,edge=((858,0),(1200,500))),
 62.56:dict(TL=(1083,72),T=(1133,122),ang=-29,edge=((917,0),(1267,497))),
 62.64:dict(TL=(1175,60),T=(1233,110),ang=-29,edge=((1000,0),(1350,500))),
 62.72:dict(TL=(1275,82),T=(1333,132),ang=-29,edge=((1117,0),(1392,520))),
 62.80:dict(TL=(1383,75),T=(1442,117),ang=-29,edge=((1292,0),(1508,417))),
 62.88:dict(TL=(1500,63),T=(1558,122),ang=-29,edge=((1367,0),(1667,500))),
 62.96:dict(TL=(1608,68),T=(1667,127),ang=-29,edge=((1450,0),(1767,500))),
 63.04:dict(TL=(1708,73),T=(1767,123),ang=-29,edge=((1517,0),(1850,500))),
}
UV={'TL':(51,160),'TR':(423,160),'T':(92,201),'d':(373,201)}
prev=static.copy(); out={57.32:static.tolist()}
for t in sorted(obs):
    o=obs[t]
    def res(p):
        rr=[]
        for k in ['TL','TR','T','d']:
            if k in o: rr+=list((proj(p,f,ka,np.array([UV[k]],float))[0]-np.array(o[k]))/1.0)
        a,b=np.array(o['edge'][0],float),np.array(o['edge'][1],float); n=np.array([-(b-a)[1],(b-a)[0]]); n/=np.linalg.norm(n)
        E=proj(p,f,ka,np.array([[0,100],[0,600]],float))
        rr+=list(((E-a)@n)*0.7)
        if 'ang' in o:
            q=proj(p,f,ka,np.array([[92,201],[373,201]],float)); ang=np.degrees(np.arctan2(q[1,1]-q[0,1],q[1,0]-q[0,0]))
            rr.append((ang-o['ang'])*6)
        # weak prior toward previous pose (smoothness)
        rr+=list((p-prev)*np.array([30,30,30,0.02,0.02,0.02]))
        return np.array(rr)
    r=least_squares(res,prev)
    prev=r.x; out[t]=r.x.tolist()
    C=proj(r.x,f,ka,np.array([[0,0],[465,0],[465,648],[0,648]],float))
    print(t,'maxres %.1f'%np.abs(r.fun[:-6]).max(),'corners',C.round(0).astype(int).tolist())
json.dump({'f':f,'ka':ka,'poses':out},open('card3d.json','w'))
