import numpy as np, cv2, re, json, glob, sys
from common import ungrade, src
txt=open('../s02-r3-orig/s02.js.orig').read()
rows=re.findall(r'\[(1[6-9]\.\d\d), ([\d.]+), ([\d.]+), ([\d.]+), (-?[\d.]+)\]', txt)
ROOT={int(round(float(r[0])*25)):[float(v) for v in r[1:]] for r in rows}
cam=json.load(open('oldcam.json'))
fig=np.array([[560,-360],[1500,-360],[1520,300],[2060,946],[0,946],[20,700],[560,420]],np.int32)
SIT=np.array([[930+2203,36-1893],[1250+2203,36-1893],[1250+2203,372-1893],[930+2203,372-1893]],np.int32)
out=[]
for p in sorted(glob.glob(sys.argv[1]+'/r*.png')):
    f=int(p[-8:-4]); R=cv2.imread(p,0).astype(np.float32)
    S=ungrade(src(f).astype(np.float32),f/25)
    m=np.ones_like(S); c=cam.get(str(f),[0,0])
    fm=np.zeros(S.shape,np.uint8); off=np.array([int(c[0]),int(c[1])],np.int32)
    cv2.fillPoly(fm,[fig+off],1)
    if f<405: cv2.fillPoly(fm,[SIT+off],1)
    m[fm>0]=0
    if f in ROOT:
        x,y,s,_=ROOT[f]; m[max(0,int(y-520*s)):int(y+430*s), max(0,int(x-660*s)):int(x+660*s)]=0
    a=(S*m).sum()/m.sum(); b=(R*m).sum()/m.sum()
    out.append((f, round(float(a),1), round(float(b),1), round(float(a/max(b,1)),3)))
for o in out: print(o)
