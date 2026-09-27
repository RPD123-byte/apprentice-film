# eyes.py F cx cy R rmin rmax : dark round blobs (irises/pupils) inside the circle (cx,cy,R): prints the best candidates
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
def detect(F,cx,cy,R,rmin,rmax,n=4,dbg=None):
    cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    x0,y0=int(cx-R),int(cy-R); r=g[y0:y0+2*R,x0:x0+2*R]
    best=[]
    for rad in np.arange(rmin,rmax+0.1,1.0):
        s=rad/1.414
        L=-cv2.GaussianBlur(r,(0,0),s)+cv2.GaussianBlur(r,(0,0),s*1.8)   # dark centre, brighter surround
        L*=1.0
        best.append((L,rad))
    stack=np.array([b[0] for b in best]); rads=[b[1] for b in best]
    mx=stack.max(0); am=stack.argmax(0)
    loc=(mx==cv2.dilate(mx,np.ones((9,9),np.uint8)))&(mx>12)
    yy,xx=np.nonzero(loc)
    yy0,xx0=np.mgrid[0:2*R,0:2*R]
    cand=[]
    for y,x in zip(yy,xx):
        if (x-R)**2+(y-R)**2>R*R: continue
        dark=r[max(0,y-2):y+3,max(0,x-2):x+3].min()
        cand.append((float(mx[y,x]),x+x0,y+y0,rads[am[y,x]],float(dark)))
    cand.sort(reverse=True)
    if dbg:
        vis=cv2.cvtColor(r.astype(np.uint8),cv2.COLOR_GRAY2BGR)
        for i,(sc,x,y,rad,dk) in enumerate(cand[:n]): cv2.circle(vis,(int(x-x0),int(y-y0)),int(rad),(0,0,255) if i<2 else (0,200,255),1)
        cv2.imwrite(dbg,cv2.resize(vis,None,fx=2,fy=2))
    return cand[:n]
if __name__=='__main__':
    F,cx,cy,R,rmin,rmax=map(int,sys.argv[1:7])
    for c in detect(F,cx,cy,R,rmin,rmax,6,f'eyes-{F}.png'): print(F,'score %.1f  (%d,%d) r=%.0f dark=%.0f'%c)
