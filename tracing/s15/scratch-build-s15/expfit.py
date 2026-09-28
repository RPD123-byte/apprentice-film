import cv2,numpy as np,json,re,sys
ROOT='/Users/computer/rootline/apprentice-film'
OWL=json.loads(re.search(r'export const OWL = (\[.*?\]\]);',open(ROOT+'/src/shots/s15/track.js').read(),re.S).group(1))
owl=lambda t: min(OWL,key=lambda r:abs(r[0]-t))
name=sys.argv[1]; t0,t1=float(sys.argv[2]),float(sys.argv[3])
res=[]
t=t0
while t<=t1+1e-6:
    r=cv2.imread(f'hr/{name}/r_{t:.2f}.png',0); s=cv2.imread('src/f%04d.png'%round(t*25),0)
    if r is None: t+=0.04; continue
    o=owl(t); m=np.ones(r.shape,bool)
    x0=int(o[1]-o[3]*0.75); x1=int(o[1]+o[3]*0.75); y0=int(o[2]-o[4]*0.9); y1=int(o[2]+o[4]*1.0)
    m[max(0,y0):y1,max(0,x0):x1]=False
    R=r[m].astype(float).mean(); S=s[m].astype(float).mean()
    res.append((t,R,S))
    t+=0.04
for t,R,S in res: print(f'{t:.2f} R {R:6.1f} S {S:6.1f} ratio {S/max(R,1):.2f}')
json.dump(res,open(f'exp_{name}.json','w'))
