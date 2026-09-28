# Snap hand-placed contour points to the nearest strong edge along the local normal (a measuring aid).
# usage: python3 snap.py T "x,y x,y ..." [radius] [closed]   -> prints refined points
import cv2, numpy as np, sys
from common import load
def edges(t):
    g=cv2.GaussianBlur(load(t,True),(3,3),0).astype(np.float32)
    gx=cv2.Sobel(g,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(g,cv2.CV_32F,0,1,ksize=3)
    return np.hypot(gx,gy), g
def snap(t,pts,rad=10,closed=False,dark=True):
    mag,g=edges(t); P=np.array(pts,float); out=[]
    n=len(P)
    for i in range(n):
        a=P[(i-1)%n] if (closed or i>0) else P[i]; b=P[(i+1)%n] if (closed or i<n-1) else P[i]
        d=b-a; L=np.hypot(*d) or 1; nx,ny=-d[1]/L,d[0]/L
        best=None
        for s in np.arange(-rad,rad+0.5,0.5):
            x,y=P[i][0]+nx*s,P[i][1]+ny*s
            if not(1<=x<g.shape[1]-2 and 1<=y<g.shape[0]-2): continue
            # ink lines are dark: prefer local darkness minima (the line centre) else gradient max
            v=-g[int(round(y)),int(round(x))] if dark else mag[int(round(y)),int(round(x))]
            v-=abs(s)*0.8
            if best is None or v>best[0]: best=(v,x,y)
        out.append((round(best[1],1),round(best[2],1)) if best else tuple(P[i]))
    return out
if __name__=='__main__':
    t=float(sys.argv[1]); pts=[tuple(map(float,p.split(','))) for p in sys.argv[2].split()]
    rad=float(sys.argv[3]) if len(sys.argv)>3 else 10; closed=len(sys.argv)>4 and sys.argv[4]=='1'
    print(' '.join(f'[{x:.0f},{y:.0f}]' for x,y in snap(t,pts,rad,closed)))
