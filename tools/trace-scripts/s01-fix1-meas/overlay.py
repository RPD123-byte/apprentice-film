import cv2, numpy as np, re, sys
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
src=open('/Users/computer/rootline/apprentice-film/src/shots/s01/figure.js').read()
def arr(name):
    m=re.search(r'export const '+name+r' = \[(.*?)\];', src, re.S); return np.array(eval('['+m.group(1)+']'),float)
def cr(pts,per=5):
    n=len(pts); out=[]
    for i in range(n):
        p0,p1,p2,p3=pts[(i-1)%n],pts[i],pts[(i+1)%n],pts[(i+2)%n]
        for j in range(per):
            t=j/per; out.append(0.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    return np.array(out)
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; Z=float(sys.argv[6]); out=sys.argv[7]; names=sys.argv[8:]
g=plate_frame(t,x0,y0,x1,y1,Z)
for nm in names:
    P=cr(arr(nm)); q=((P-[x0,y0])*Z).astype(np.int32)
    cv2.polylines(g,[q],True,(0,0,255),1)
cv2.imwrite(out,g)
