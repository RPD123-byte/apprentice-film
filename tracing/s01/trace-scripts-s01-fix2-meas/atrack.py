import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
X0,Y0,X1,Y1=1100,440,1500,800
Z=2
ref=cv2.cvtColor(plate_frame(0.0,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
def T(x0,y0,x1,y1): return ref[(y0-Y0)*Z:(y1-Y0)*Z,(x0-X0)*Z:(x1-X0)*Z], x0, y0
tps=[T(1245,525,1305,585),T(1300,560,1370,630),T(1370,610,1440,690),T(1400,690,1460,780)]
for n in [int(a) for a in sys.argv[1:]] or range(14,112,2):
    g=cv2.cvtColor(plate_frame(n/25,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
    out=[]
    for tp,tx,ty in tps:
        r=cv2.matchTemplate(g,tp,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
        out.append(f"{loc[0]/Z+X0-tx:+6.1f},{loc[1]/Z+Y0-ty:+5.1f} ({mx:.2f})")
    print(f"{n/25:.2f}", '  '.join(out))
