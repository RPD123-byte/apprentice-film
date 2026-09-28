import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
# camtrack (rel 38.48): t -> s,tx,ty
CT={38.48:(1,0,0),38.6:(1.0271,-51.0,-10.4),38.8:(1.1682,-316.3,-67.3),39.0:(1.3147,-592.8,-127.6),39.2:(1.5352,-1003.1,-220.7),39.4:(1.7483,-1404.6,-293.2),39.6:(1.8697,-1633.7,-337.8),39.8:(2.0159,-1868.1,-396.0),39.88:(2.1564,-2074.9,-475.9)}
S40=(2.2834,-2263.2,-540.3)
ref=grab(40.0)
refb=cv2.GaussianBlur(ref,(0,0),20)
for t,(s,tx,ty) in CT.items():
    # frame(t) = A * room40, A = C(t) o C40^-1
    a=s/S40[0]; bx=tx-a*S40[1]; by=ty-a*S40[2]
    M=np.float32([[a,0,bx],[0,a,by]])
    w=cv2.warpAffine(refb,M,(2206,946))
    src=cv2.GaussianBlur(grab(t if t!=38.48 else 37.6),(0,0),20)
    ratio=np.clip(src/np.maximum(w,6),0,1.5)
    valid=w>12
    # mask out owl: region near owl rough
    ratio[~valid]=np.nan
    # find extent where ratio>0.5 along row through center and col
    r=np.nan_to_num(ratio,nan=0)
    m=(r>0.5).astype(np.uint8)
    m[600:,:]=m[600:,:] if t>39.7 else 0
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cs=sorted(cs,key=cv2.contourArea)[-1]
    if len(cs)>5:
        (ex,ey),(ew,eh),ang=cv2.fitEllipse(cs)
    x,y,ww,hh=cv2.boundingRect(cs)
    # room40 coords of bbox
    print(f't={t} frame bbox x {x}-{x+ww} y {y}-{y+hh}  ellipse c=({ex:.0f},{ey:.0f}) axes=({ew:.0f},{eh:.0f}) ang={ang:.0f} | scale a={a:.3f}')
    cv2.imwrite(f'ratio-{t}.jpg',(np.clip(r,0,1)*255).astype(np.uint8)[::2,::2])
