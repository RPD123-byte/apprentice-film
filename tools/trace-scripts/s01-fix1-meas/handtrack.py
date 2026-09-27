import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
X0,Y0,X1,Y1=1000,380,1300,600
ref=cv2.cvtColor(plate_frame(0.0,X0,Y0,X1,Y1,1),cv2.COLOR_BGR2GRAY)
tx0,ty0,tx1,ty1=1070,445,1215,515   # template: fingers + back of hand
tpl=ref[ty0-Y0:ty1-Y0, tx0-X0:tx1-X0]
for n in range(0,152):
    g=cv2.cvtColor(plate_frame(n/25,X0,Y0,X1,Y1,1),cv2.COLOR_BGR2GRAY)
    r=cv2.matchTemplate(g,tpl,cv2.TM_CCOEFF_NORMED)
    _,mx,_,loc=cv2.minMaxLoc(r)
    print(f"{n/25:.2f} dx={loc[0]+X0-tx0:+4d} dy={loc[1]+Y0-ty0:+4d} score={mx:.2f}")
