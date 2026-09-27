import numpy as np
from scipy.optimize import least_squares
SP=0.40; BL=1.05; HPL=1.0; DY=0.05; BH=1.3; TILT=0.1; W=5.2
def P(h,az,el,lift=1.0):
    x,y,r,yaw,roll,pitch=h
    nx=np.sin(az)*np.cos(el); ny=-np.sin(el); nz=np.cos(az)*np.cos(el)
    x1=nx*np.cos(yaw)+nz*np.sin(yaw); z1=-nx*np.sin(yaw)+nz*np.cos(yaw)
    y2=ny*np.cos(pitch)-z1*np.sin(pitch)
    px,py=x1*r*lift,y2*r*lift
    cr,sr=np.cos(roll),np.sin(roll)
    return np.array([x+px*cr-py*sr,y+px*sr+py*cr])
def cup(h,sd=-1):
    x,y,r,yaw,roll,pitch=h
    X=sd*HPL; Y=0; Z=0
    x1=X*np.cos(yaw)+Z*np.sin(yaw); z1=-X*np.sin(yaw)+Z*np.cos(yaw)
    y2=Y*np.cos(pitch)-z1*np.sin(pitch)
    px,py=(x1)*r,(y2+DY)*r
    cr,sr=np.cos(roll),np.sin(roll)
    return np.array([x+px*cr-py*sr,y+px*sr+py*cr])
def band(h):
    x,y,r,yaw,roll,pitch=h
    Yv=-BH; X=0; Y=Yv*np.cos(TILT); Z=Yv*np.sin(TILT)
    x1=X*np.cos(yaw)+Z*np.sin(yaw); z1=-X*np.sin(yaw)+Z*np.cos(yaw)
    y2=Y*np.cos(pitch)-z1*np.sin(pitch)
    px,py=x1*r,(y2+DY)*r
    cr,sr=np.cos(roll),np.sin(roll)
    return np.array([x+px*cr-py*sr,y+px*sr+py*cr-W/2])
def fit(eL,eR,bk,cp,bt,r0=40,sp=SP):
    def res(v):
        h=v[:6]; el,bel=v[6],v[7]
        out=[]
        out+=list(P(h,-sp,el)-eL); out+=list(P(h,sp,el)-eR)
        out+=list(P(h,0,bel,BL)-bk); out+=list((cup(h)-cp)*0.7)
        out+=[(band(h)[1]-bt)]
        out+=[(r-r0)*0.2 for r in [v[2]]]
        return out
    v0=[eL[0]-10,eL[1]+5,r0,0.5,-0.3,0,-0.1,-0.45]
    s=least_squares(res,v0)
    v=s.x
    return dict(x=round(v[0],1),y=round(v[1],1),r=round(v[2],1),yaw=round(v[3],3),roll=round(v[4],3),pitch=round(v[5],3),el=round(v[6],3),bel=round(v[7],3),err=round(float(np.sqrt(np.mean(np.array(s.fun)**2))),2))
K={
 'A':((726,460),(744,452),(742,465),(681,470),411,38),
 'B':((725,457),(743,449),(742,465),(682,467),411,38),
 'C':((723,452),(743,443),(742,463),(680,465),408,38.5),
 'D':((720,448),(742,440),(742,457),(677,462),402,39),
 'E':((713,440),(740,430),(737,452),(670,455),390,40),
 'F':((711,432),(739,422),(732,445),(672,447),378,41),
 'G':((708,418),(740,408),(727,432),(668,425),367,44),
}
for k,(eL,eR,bk,cp,bt,r0) in K.items():
    print(k,fit(np.array(eL),np.array(eR),np.array(bk),np.array(cp),bt,r0))
