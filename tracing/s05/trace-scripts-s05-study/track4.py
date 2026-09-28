import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(n):
    c.set(1,n); ok,f=c.read(); return cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),1.2)
ref=grab(int(round(float(sys.argv[1])*25)))
R={'R':((880,615,1170,745),90),'owl':((1470,250,1690,470),24),'owlb':((1560,480,1740,690),24),'head':((1280,40,1440,300),24),'lh':((640,660,860,860),24)}
tp={k:ref[y0:y1,x0:x1] for k,((x0,y0,x1,y1),S) in R.items()}
for n in range(int(round(float(sys.argv[2])*25)),int(round(float(sys.argv[3])*25))+1):
    g=cv2.copyMakeBorder(grab(n),100,100,100,100,cv2.BORDER_REPLICATE); out=[]
    for k,((x0,y0,x1,y1),S) in R.items():
        win=g[y0-S+100:y1+S+100,x0-S+100:x1+S+100]
        m=cv2.matchTemplate(win,tp[k],cv2.TM_CCOEFF_NORMED)
        _,mx,_,loc=cv2.minMaxLoc(m)
        # parabolic subpixel
        x,y=loc; sx=sy=0.0
        if 0<x<m.shape[1]-1: a,b,cc=m[y,x-1],m[y,x],m[y,x+1]; d=a-2*b+cc; sx=0.5*(a-cc)/d if d!=0 else 0
        if 0<y<m.shape[0]-1: a,b,cc=m[y-1,x],m[y,x],m[y+1,x]; d=a-2*b+cc; sy=0.5*(a-cc)/d if d!=0 else 0
        out.append(f"{k} {x-S+sx:+6.1f} {y-S+sy:+6.1f} ({mx:.2f})")
    print(f"{n/25:.2f}  "+"  ".join(out))
