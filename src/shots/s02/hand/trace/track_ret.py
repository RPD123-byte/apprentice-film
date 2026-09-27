import cv2, numpy as np, json, re
S='../s02-r3-src'
txt=open('../../src/shots/s02.js' if False else '../s02-r3-orig/s02.js.orig').read()
rows=re.findall(r'\[(1[6-9]\.\d\d), ([\d.]+), ([\d.]+), ([\d.]+), (-?[\d.]+)\]', txt)
ROOT={int(round(float(r[0])*25)):[float(v) for v in r[1:]] for r in rows}
def g(f): return cv2.imread(f'{S}/{f:04d}.png',0).astype(np.float32)
def mask(f):
    m=np.ones((946,2206),np.float32)
    if f in ROOT:
        x,y,s,_=ROOT[f]; m[max(0,int(y-500*s)):int(y+420*s), max(0,int(x-640*s)):int(x+640*s)]=0
    return m
win=cv2.createHanningWindow((2206,946),cv2.CV_32F)
old=json.load(open('oldcam.json'))
acc=np.array(old['412'],float); res={412:acc.tolist()}
for f in range(413,478):
    a=g(f-1); b=g(f); m=mask(f-1)*mask(f)
    mu_a=(a*m).sum()/m.sum(); mu_b=(b*m).sum()/m.sum()
    A=a*m+mu_a*(1-m); B=b*m+mu_b*(1-m)
    (dx,dy),r=cv2.phaseCorrelate(A,B,win)
    acc=acc+[dx,dy]; res[f]=acc.tolist()
    print(f, np.round(acc,1), 'step',round(dx,1),round(dy,1),'r',round(r,3),' old',np.round(old[str(f)],1))
json.dump(res,open('ret_pc.json','w'))
