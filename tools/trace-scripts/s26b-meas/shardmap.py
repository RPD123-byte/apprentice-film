# where do the B&W pieces of the C picture come from? For patches of the 112.00 frame (low saturation, textured),
# find the best match in the median A frame over scales 0.80..1.0 (A = C·scale): prints patch centre -> source centre
import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); c.set(1,2800); ok,f=c.read()
A=cv2.cvtColor(cv2.imread('medA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
res=[]
P=40
for y in range(120,900,60):
    for x in range(60,2150,70):
        if 900<x<1350 and 250<y<800: continue   # the owl
        patch=g[y-P:y+P,x-P:x+P]; sat=hsv[y-P:y+P,x-P:x+P,1].mean()
        if sat>60 or patch.std()<25: continue
        best=None
        for s in np.arange(0.84,0.98,0.02):
            ps=cv2.resize(patch,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
            # search window in A around the expected place (zoom about (1071,496))
            ex,ey=1071+(x-1071)*s,496+(y-496)*s
            x0,y0=int(max(0,ex-120)),int(max(0,ey-120)); x1,y1=int(min(2206,ex+120)),int(min(946,ey+120))
            win=A[y0:y1,x0:x1]
            if win.shape[0]<ps.shape[0]+2 or win.shape[1]<ps.shape[1]+2: continue
            m=cv2.matchTemplate(win,ps,cv2.TM_CCOEFF_NORMED); _,mv,_,ml=cv2.minMaxLoc(m)
            if best is None or mv>best[0]: best=(mv,s,x0+ml[0]+ps.shape[1]/2,y0+ml[1]+ps.shape[0]/2)
        if best and best[0]>0.6: res.append((x,y)+best)
for r in res: print('C(%d,%d) score %.2f s %.2f -> A(%.0f,%.0f)'%r)
np.save('shardmap.npy',np.array(res))
