import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(n):
    c.set(1,n); ok,f=c.read(); return cv2.GaussianBlur(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(0,0),1.2)
ref=grab(int(round(24.8*25)))
R={'L':(640,660,860,860),'R':(880,615,1170,745)}
tp={k:ref[y0:y1,x0:x1] for k,(x0,y0,x1,y1) in R.items()}
S=90
for n in range(int(round(23.44*25)),int(round(26.72*25))):
    g=grab(n); out=[]
    for k,(x0,y0,x1,y1) in R.items():
        win=g[y0-S:y1+S,x0-S:x1+S]
        m=cv2.matchTemplate(win,tp[k],cv2.TM_CCOEFF_NORMED)
        _,mx,_,loc=cv2.minMaxLoc(m)
        # subpixel
        dx,dy=loc[0]-S,loc[1]-S
        out.append(f"{k} {dx:+3d} {dy:+3d} ({mx:.2f})")
    print(f"{n/25:.2f}  "+"   ".join(out))
