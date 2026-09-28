# owlerr.py DIR f,f -- error inside the owl hull only (sigma 2 / sigma 8), and the mean signed difference
import cv2,numpy as np,json,sys
from tojs3 import cam
S=json.load(open('../s25-meas/sched.json'))
def hull(f):
    i=f-S['SCHED_F0']; r=S['SCHED'][min(i,len(S['SCHED'])-1)]
    d=json.load(open(f'../s25-meas/pose-{r[0]}.json'))
    a,b,c,dd,e,ff=r[1:7]; A=np.array([[a,c,e],[b,dd,ff],[0,0,1]])
    C=cam(f); K=np.linalg.inv(cam(d['frame']))
    M=C@A@K
    m=np.zeros((946,2206),np.uint8)
    for q in d['hull']:
        q=np.array(q).reshape(-1,2); p=(M[:2,:2]@q.T).T+M[:2,2]
        cv2.fillPoly(m,[np.round(p).astype(np.int32)],1)
    return cv2.erode(m,np.ones((9,9),np.uint8))>0
for f in [int(v) for v in sys.argv[2].split(',')]:
    r=cv2.imread(f'{sys.argv[1]}/r{f:05d}.png',0).astype(np.float32); s=cv2.imread(f'../s25-src/f{f:05d}.png',0).astype(np.float32)
    m=hull(f)
    e2=np.abs(cv2.GaussianBlur(r,(0,0),2)-cv2.GaussianBlur(s,(0,0),2))[m].mean()
    e8=np.abs(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8))[m].mean()
    sg=(cv2.GaussianBlur(r,(0,0),8)-cv2.GaussianBlur(s,(0,0),8))[m].mean()
    print(f,'owl px',m.sum(),'s2 %.2f s8 %.2f signed %.2f'%(e2,e8,sg))
