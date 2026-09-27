import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
X0,Y0,X1,Y1=990,400,1300,620
Z=2
ref=cv2.cvtColor(plate_frame(0.0,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
def T(x0,y0,x1,y1): return ref[(y0-Y0)*Z:(y1-Y0)*Z,(x0-X0)*Z:(x1-X0)*Z], x0, y0
tips=T(1070,444,1120,482); knk=T(1140,452,1200,500); wr=T(1185,480,1245,540)
for n in range(14,112):
    g=cv2.cvtColor(plate_frame(n/25,X0,Y0,X1,Y1,Z),cv2.COLOR_BGR2GRAY)
    out=[]
    for tp,tx,ty in (tips,knk,wr):
        r=cv2.matchTemplate(g,tp,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(r)
        # subpixel
        x,y=loc; dx=dy=0
        if 0<x<r.shape[1]-1: a,b,c=r[y,x-1],r[y,x],r[y,x+1]; dx=0.5*(a-c)/(a-2*b+c+1e-9)
        if 0<y<r.shape[0]-1: a,b,c=r[y-1,x],r[y,x],r[y+1,x]; dy=0.5*(a-c)/(a-2*b+c+1e-9)
        out.append(f"{(x+dx)/Z+X0-tx:+6.1f},{(y+dy)/Z+Y0-ty:+5.1f} ({mx:.2f})")
    print(f"{n/25:.2f}", '  '.join(out))
