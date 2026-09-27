import numpy as np
W,H=2206,946
def grade(c,x,y,halo=0.5):
    c=np.asarray(c,float)
    hl=np.clip((c-120/255)/(135/255),0,1)*c
    f=1-(1-c)*(1-halo*hl)
    f=f*0.65+0.35*(f*f*(3-2*f))
    qx=(x/W-0.5)*2; qy=(y/H-0.5)*2; r=min(1,(qx*qx+qy*qy)/2)
    return f*(1-0.38*r**1.15)
def ungrade(rgb255,x,y):
    out=[]
    for k in range(3):
        tgt=rgb255[k]/255; lo,hi=0.0,1.0
        for _ in range(40):
            mid=(lo+hi)/2; v=grade([mid]*3,x,y)[0]
            if v<tgt: lo=mid
            else: hi=mid
        out.append(round((lo+hi)/2*255))
    return out
def hexc(c): return '#%02x%02x%02x'%tuple(int(max(0,min(255,v))) for v in c)
if __name__=='__main__':
    import sys, cv2
    from common import load
    t=float(sys.argv[1]); f=load(t)
    for a in sys.argv[2:]:
        nm,x,y=a.split(':'); x=int(x); y=int(y)
        p=f[max(0,y-4):y+5,max(0,x-4):x+5].reshape(-1,3).mean(0)[::-1]
        print(f"{nm:12s} ({x},{y}) src={hexc(p)} pre={hexc(ungrade(p,x,y))}")
