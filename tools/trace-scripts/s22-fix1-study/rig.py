# Python replica of the s21/owl21 rig geometry (outline, cup, band, eye, beak, body, tail) for fitting on the source.
import numpy as np, math
TAU=2*math.pi
def sph(az,el): return np.array([math.sin(az)*math.cos(el), -math.sin(el), math.cos(az)*math.cos(el)])
class Head:
    def __init__(s,h,x=0,y=0):
        s.r=h.get('r',100); s.yaw=h.get('yaw',0); s.pitch=h.get('pitch',0); s.roll=h.get('roll',0); s.nod=h.get('nod',0)
        s.x=x; s.y=y; s.square=2.0; s.jowl=0.08; s.bump=h.get('bump',9)
    def toFrame(s,px,py):
        cr,sr=math.cos(s.roll),math.sin(s.roll); return np.array([s.x+px*cr-py*sr, s.y+px*sr+py*cr])
    def P3(s,X,Y,Z,lift=1):
        cn,sn=math.cos(s.nod),math.sin(s.nod)
        Y0=Y*cn+Z*sn; Z0=-Y*sn+Z*cn
        x1=X*math.cos(s.yaw)+Z0*math.sin(s.yaw); z1=-X*math.sin(s.yaw)+Z0*math.cos(s.yaw)
        y2=Y0*math.cos(s.pitch)-z1*math.sin(s.pitch); z2=Y0*math.sin(s.pitch)+z1*math.cos(s.pitch)
        p=s.toFrame(x1*s.r*lift,y2*s.r*lift); return p,z2
    def P(s,az,el,lift=1):
        n=sph(az,el); return s.P3(*n,lift)
    def outline(s,beak_el=-0.4):
        out=[]
        for i in range(56):
            t=i/56*TAU-math.pi/2; c,sn=math.cos(t),math.sin(t); n=s.square if sn<0 else 2.15
            px=math.copysign(abs(c)**(2/n),c)*s.r; py=math.copysign(abs(sn)**(2/n),sn)*s.r
            if sn>0: px*=1+s.jowl*math.sin(math.pi*sn)
            out.append(s.toFrame(px,py)-np.array([s.x,s.y]))
        fq,_=s.P(0,beak_el+0.25,1); fq=fq-np.array([s.x,s.y])
        fa=math.atan2(fq[1],fq[0]); amp=s.bump*max(0,math.hypot(*fq)/100)
        res=[]
        for p in out:
            a=math.atan2(p[1],p[0]); d=a-fa; d=math.atan2(math.sin(d),math.cos(d)); k=math.exp(-(d*d)/(2*0.45*0.45)); l=math.hypot(*p)
            res.append(p*(1+amp*k/l)+np.array([s.x,s.y]))
        return np.array(res)
def cup(H,hp):
    az=-math.pi/2+hp.get('cupAz',0.05); el=hp.get('cupEl',0.05)
    return H.P(az,el,hp.get('cupLift',1.0))
def band(H,hp):
    az0=-math.pi/2+hp.get('cupAz',0.05); el=hp.get('cupEl',0.05)
    c0=sph(az0,el); c1=sph(-az0,el); e=(c1-c0)/np.linalg.norm(c1-c0); mid=(c0+c1)/2; half=np.linalg.norm(c1-c0)/2
    tau=hp.get('bandTilt',0.4); u=np.array([0,-math.cos(tau),-math.sin(tau)]); u=u-e*np.dot(u,e); u/=np.linalg.norm(u)
    lift=hp.get('bandLift',1.1); R=hp.get('bandH',1.02); pts=[]
    for i in range(37):
        ph=math.pi*(1-i/36); q=mid+e*half*math.cos(ph)*lift+u*R*math.sin(ph)*lift
        p,z=H.P3(*q); pts.append((p,z))
    return pts
def body(B):
    pts=[]
    for i in range(48):
        t=i/48*TAU; v=math.sin(t)*B['b']*(1-B.get('egg',0)*math.cos(t))
        c,s=math.cos(B['rot']),math.sin(B['rot']); x=math.cos(t)*B['a']
        pts.append([B['x']+x*c-v*s, B['y']+x*s+v*c])
    return np.array(pts)
