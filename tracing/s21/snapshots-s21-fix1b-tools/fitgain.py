# fitgain.py RDIR [prev.json] -> margin gain knots (source/render median ratio, blurred), multiplied into prev
import numpy as np, cv2, sys, json, os
R=sys.argv[1]; prev=json.load(open(sys.argv[2])) if len(sys.argv)>2 else None
ms=np.load('/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src/median.npy'); mr=np.load(R+'/median.npy')
B=lambda a,s: cv2.GaussianBlur(a,(0,0),s)
XK=[0,40,90,128,300,600,900,1200,1500,1800,1950,2040,2080,2130,2206]
YK=[0,30,70,112,200,350,500,650,800,946]
rb=B(mr,14); sb=B(ms,14)
def at(img,x,y):
    x=min(max(x,0),2205); y=min(max(y,0),945); return img[y,x]
G=[]
for y in YK:
    row=[]
    for x in XK:
        # sample only outside the screen (clamp the probe point into the nearest margin)
        px,py=x,y
        inside = 137<x<2030 and y>121
        if inside: row.append(1.0 if prev is None else prev['G'][YK.index(y)][XK.index(x)]); continue
        # keep the probe >= 8 px outside the screen edge
        if 128<px<=137: px=128
        if 2030<=px<2040: px=2040
        if 112<py<=121 and 137<px<2030: py=112
        r=float(np.clip(at(sb,px,py)/max(1.0,at(rb,px,py)),0.35,1.3))
        g0=1.0 if prev is None else prev['G'][YK.index(y)][XK.index(x)]
        row.append(round(g0*r,3))
    G.append(row)
json.dump({'XK':XK,'YK':YK,'G':G},sys.stdout)
