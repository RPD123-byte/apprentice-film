# Joint fit: camera per time + laptop pose + speaker pose, from hand-measured source points (frame px).
import numpy as np, json
from scipy.optimize import least_squares
W,H=2206,946
import sys
SA=float(sys.argv[1]) if len(sys.argv)>1 else 300.0
SR=float(sys.argv[2]) if len(sys.argv)>2 else 4.0
TIMES=[20.84,20.92,21.00,21.08,21.16,21.24,21.40,21.64,21.84,22.24,22.32,22.40,22.48,22.56,22.64,22.72,22.80,22.88,22.96,23.04,23.12]
OBS={ # (kind, name(s), 2D)
 20.84:[('pt','TopR',(235,818)),('pt','TopL',(1886,815)),('line',('TopR','HingeR'),(222,946))],
 20.92:[('pt','TopL',(1861,820)),('pt','TopR',(214,819))],
 21.00:[('pt','TopL',(1819,819)),('pt','TopR',(183,816))],
 21.08:[('pt','TopL',(1793,820))],
 21.16:[('pt','TopL',(1692,825))],
 21.24:[('pt','TopL',(1599,827))],
 21.40:[('line',('TopR','TopL'),(0,790)),('line',('TopR','TopL'),(1000,833))],
 21.64:[('pt','TopL',(745,822)),('line',('TopR','TopL'),(0,752)),('line',('TopL','HingeL'),(790,946))],
 21.84:[('pt','TopL',(290,795)),('line',('TopR','TopL'),(0,735)),('line',('TopL','HingeL'),(340,946))],
 22.24:[('line',('PostB','PostT'),(197,500))],
 22.32:[('line',('PostB','PostT'),(400,500)),('pt','S_TR',(177,436)),('pt','S_BR',(185,840))],
 22.40:[('line',('PostB','PostT'),(598,500)),('pt','S_TL',(110,412)),('pt','S_TR',(300,392)),('pt','S_BR',(305,840)),('pt','S_BL',(118,852))],
 22.56:[('line',('PostB','PostT'),(1000,500))],
 22.48:[('pt','S_TL',(250,380)),('pt','S_TR',(440,355)),('pt','S_BR',(445,790)),('pt','S_BL',(262,810))],
 22.64:[('pt','S_TL',(520,330)),('pt','S_TR',(735,325)),('pt','S_BR',(735,690)),('pt','S_BL',(525,695))],
 22.72:[('pt','TopR',(315,265)),('line',('TopL','TopR'),(0,335)),('line',('TopR','HingeR'),(445,735)),
        ('pt','S_TL',(630,315)),('pt','S_TR',(845,300)),('pt','S_BR',(850,660)),('pt','S_BL',(635,665))],
 22.80:[('pt','S_TL',(735,305)),('pt','S_TR',(955,300)),('pt','S_BR',(960,600)),('pt','S_BL',(735,610))],
 22.88:[('line',('TopL','TopR'),(100,290)),('pt','TopR',(500,220)),('pt','HingeR',(600,650)),('line',('HingeL','HingeR'),(130,865))],
 22.96:[('pt','S_TL',(900,245)),('pt','S_TR',(1085,240)),('pt','S_BR',(1085,555)),('pt','S_BL',(900,560))],
 23.04:[('pt','TopL',(100,275)),('pt','TopR',(660,185)),('pt','HingeR',(750,590)),('pt','HingeL',(250,795))],
 23.12:[('pt','TopL',(130,265)),('pt','TopR',(690,185)),('pt','HingeR',(790,605)),('pt','HingeL',(280,780)),
        ('pt','S_TL',(1000,215)),('pt','S_TR',(1175,210)),('pt','S_BR',(1175,515)),('pt','S_BL',(1000,525))],
}
HEAD={20.84:(1060,350),20.92:(1062,350),21.00:(1068,350),21.08:(1075,350),21.16:(1090,350),21.24:(1110,350),21.40:(1150,350),21.64:(1330,330),21.84:(1420,320),22.24:(1500,300),22.32:(1510,290),22.40:(1515,285),22.56:(1530,275),22.48:(1520,280),22.64:(1540,270),22.72:(1550,265),22.80:(1560,260),22.88:(1565,255),22.96:(1570,250),23.04:(1575,245),23.12:(1580,240)}
LW,LH=31.0,21.0
def rotY(a): c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def scene(p):
    lx,ly,lz,lyaw,ltilt, sx,sy,sz,syaw,sw,sh,px,pz = p
    R=rotY(lyaw); hinge=np.array([lx,ly,lz])
    # lid leans away from him (+z) by tilt; local x = his left (+x)
    up=np.array([0,np.cos(ltilt),np.sin(ltilt)])*LH
    P={'HingeL':hinge+R@np.array([LW/2,0,0]),'HingeR':hinge+R@np.array([-LW/2,0,0])}
    P['TopL']=hinge+R@(np.array([LW/2,0,0])+up); P['TopR']=hinge+R@(np.array([-LW/2,0,0])+up)
    Rs=rotY(syaw); c=np.array([sx,sy,sz]); d=10.0
    P['S_TL']=c+Rs@np.array([sw/2,sh/2,-d]); P['S_TR']=c+Rs@np.array([-sw/2,sh/2,-d])
    P['S_BR']=c+Rs@np.array([-sw/2,-sh/2,-d]); P['S_BL']=c+Rs@np.array([sw/2,-sh/2,-d])
    P['PostB']=np.array([px,-60.0,pz]); P['PostT']=np.array([px,60.0,pz])
    return P
def cam_axes(yaw,pitch,roll):
    # forward: yaw about y (0 = looking -z), pitch about right
    f=np.array([-np.sin(yaw)*np.cos(pitch),np.sin(pitch),-np.cos(yaw)*np.cos(pitch)])
    r=np.cross(f,[0,1,0]); r/=np.linalg.norm(r); u=np.cross(r,f)
    cr,sr=np.cos(roll),np.sin(roll); r2=cr*r+sr*u; u2=-sr*r+cr*u
    return f,r2,u2
def project(cam,fov,X):
    ex,ey,ez,yaw,pitch,roll=cam; f,r,u=cam_axes(yaw,pitch,roll)
    k=(H/2)/np.tan(np.radians(fov)/2); d=X-np.array([ex,ey,ez]); z=d@f
    return np.array([W/2+(d@r)*k/max(z,1e-3),H/2-(d@u)*k/max(z,1e-3)]),z
def unpack(x):
    fov=x[0]; sc=x[1:14]; cams=x[14:].reshape(-1,6); return fov,sc,cams
def resid(x):
    fov,sc,cams=unpack(x); P=scene(sc); res=[]
    for i,t in enumerate(TIMES):
        c=cams[i]
        for kind,name,q in OBS.get(t,[]):
            if kind=='pt':
                p,z=project(c,fov,P[name]); res+=list((p-np.array(q))/6.0)
                res.append(max(0.0,5-z)*10)
            else:
                a,_=project(c,fov,P[name[0]]); b,_=project(c,fov,P[name[1]])
                n=np.array([-(b-a)[1],(b-a)[0]]); n/=np.linalg.norm(n)+1e-9
                res.append((np.array(q)-a)@n/6.0)
        hp,z=project(c,fov,np.zeros(3)); res+=list((hp-np.array(HEAD[t]))/60.0)
        res.append(c[5]/0.05)  # roll prior
    for i in range(1,len(TIMES)-1):  # smoothness: acceleration
        t0,t1,t2=TIMES[i-1],TIMES[i],TIMES[i+1]
        v1=(cams[i]-cams[i-1])/(t1-t0); v2=(cams[i+1]-cams[i])/(t2-t1); a=(v2-v1)/((t2-t0)/2)
        res+=list(a[:3]/SA)+list(a[3:5]/SR)
    return np.array(res)
# init: orbit around the head
th=np.interp(TIMES,[20.84,21.4,21.84,22.48,23.12],np.radians([0,10,50,100,135]))
cams=[]
for t,a in zip(TIMES,th):
    d=90.0; ex,ez=d*np.sin(a),d*np.cos(a); ey=5+15*(t-20.84)/2.3
    yaw=a  # camera at angle a looking back at origin: forward = -(sin a, 0, cos a) -> yaw=a
    cams.append([ex,ey,ez,yaw,-0.1,0])
x0=np.concatenate([[40.0],[0,-40,35,0,0.35, -35,-30,70,0.3,18,28, -60,120],np.array(cams).ravel()])
r=least_squares(resid,x0,loss='soft_l1',f_scale=2.0,max_nfev=20000)
fov,sc,cams=unpack(r.x)
print('cost',r.cost,'fov',round(fov,2)); print('scene',np.round(sc,2).tolist())
for t,c in zip(TIMES,cams): print(t,np.round(c,3).tolist(),'theta(deg)=',round(np.degrees(np.arctan2(c[0],c[2])),1))
# report residuals per time
P=scene(sc)
for i,t in enumerate(TIMES):
    errs=[]
    for kind,name,q in OBS.get(t,[]):
        if kind=='pt': p,_=project(cams[i],fov,P[name]); errs.append(f"{name}:{np.linalg.norm(p-q):.0f}")
    hp,_=project(cams[i],fov,np.zeros(3))
    print(t,' '.join(errs),'head',np.round(hp).tolist())
json.dump({'fov':fov,'scene':sc.tolist(),'times':TIMES,'cams':cams.tolist()},open('camfit.json','w'))
