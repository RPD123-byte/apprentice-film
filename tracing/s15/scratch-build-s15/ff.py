# floor speed from vertical flow of the floor band (u/s), assuming cam height 0.33, K=819, horizon row = VP y guess
import cv2,numpy as np,sys,json,re
SRC='src'
ROOT='/Users/computer/rootline/apprentice-film'
OWL=json.loads(re.search(r'export const OWL = (\[.*?\]\]);',open(ROOT+'/src/shots/s15/track.js').read(),re.S).group(1))
owl=lambda t: min(OWL,key=lambda r:abs(r[0]-t))
K=819.0; h=0.33
t0,t1=float(sys.argv[1]),float(sys.argv[2]); yh=float(sys.argv[3]) if len(sys.argv)>3 else 500
t=t0
while t<t1-1e-6:
    a=cv2.imread(SRC+'/f%04d.png'%round(t*25),0); b=cv2.imread(SRC+'/f%04d.png'%round((t+0.04)*25),0)
    fl=cv2.calcOpticalFlowFarneback(a,b,None,0.5,5,31,5,7,1.5,0)
    o=owl(t); out=[]
    for y0,y1 in [(780,850),(850,930)]:
        m=np.zeros(a.shape,bool); m[y0:y1,:]=True; m[:,int(o[1]-o[3]*0.7):int(o[1]+o[3]*0.7)]=False
        # floor only: textured, not black
        fy=fl[...,1][m]; y=(y0+y1)/2
        dy=np.median(fy); v=dy*K*h/(y-yh)**2/0.04
        out.append(f'y{y0}-{y1} dy {dy:5.1f} v {v:4.2f}')
    print(f'{t:.2f}', ' | '.join(out))
    t+=0.04
