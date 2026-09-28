# wingov.py x0 y0 x1 y1 scale out [extra.json] : source C hold (median 891-898) with the existing WINGLINES / TAILLINES in red
import cv2, numpy as np, sys, re, json
S='/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
x0,y0,x1,y1,sc=map(int,sys.argv[1:6]); out=sys.argv[6]
im=np.median(np.stack([cv2.imread(f'{S}/f{f}.png',0) for f in range(891,899)]),0).astype(np.uint8)
c=cv2.cvtColor(cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_LINEAR),cv2.COLOR_GRAY2BGR)
s=open('/Users/computer/rootline/apprentice-film/src/shots/s13/wingC.js').read()
def draw(txt,col):
    for a in re.findall(r'\[\[([\d.]+), ([\d.]+)\], \[([\d.]+), ([\d.]+)\], \[([\d.]+), ([\d.]+)\], ([\d.]+), ([\d.]+)\]', txt):
        v=list(map(float,a)); t=np.linspace(0,1,30)[:,None]; p0,p1,p2=np.array(v[0:2]),np.array(v[2:4]),np.array(v[4:6])
        B=(1-t)**2*p0+2*t*(1-t)*p1+t*t*p2; B=((B-[x0,y0])*sc).astype(np.int32)
        cv2.polylines(c,[B.reshape(-1,1,2)],False,col,1)
draw(s[s.index('WINGLINES'):s.index('HEADLINES')],(0,0,255))
if len(sys.argv)>7:
    for L in json.load(open(sys.argv[7])):
        B=((np.array(L,np.float32)-[x0,y0])*sc).astype(np.int32); cv2.polylines(c,[B.reshape(-1,1,2)],False,(0,200,0),1)
for x in range((x0//20+1)*20,x1,20):
    X=(x-x0)*sc; cv2.line(c,(X,0),(X,c.shape[0]),(200,120,0) if x%100 else (255,0,0),1); cv2.putText(c,str(x),(X+2,12),0,0.35,(0,255,255),1)
for y in range((y0//20+1)*20,y1,20):
    Y=(y-y0)*sc; cv2.line(c,(0,Y),(c.shape[1],Y),(200,120,0) if y%100 else (255,0,0),1); cv2.putText(c,str(y),(2,Y-2),0,0.35,(0,255,255),1)
cv2.imwrite(out,c); print(out)
