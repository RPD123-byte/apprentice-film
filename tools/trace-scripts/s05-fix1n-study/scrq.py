import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d=sys.argv[1]; U=len(sys.argv)>2 and sys.argv[2]=='u'
scr=np.zeros((946,2206),np.uint8); cv2.fillPoly(scr,[np.array([[315,246],[834,168],[898,519],[409,648]])],1); scr=cv2.erode(scr,np.ones((15,15)))>0
for f in sorted(glob.glob(d+'/frame-*.png')):
    k=578+math.floor((float(re.search(r'at-([\d.]+)s',f).group(1))-(10 if U else 0))*30+1e-6)
    a=cv2.imread(f).astype(np.float32); b=(frames.pre(k) if U else frames.frame(k))*255
    qs=[0.02,0.05,0.25,0.5,0.75,0.95,0.98]
    for c,n in ((0,'B'),(1,'G'),(2,'R')):
        print(k,n,'render',np.round(np.quantile(a[...,c][scr],qs)).astype(int).tolist(),' src',np.round(np.quantile(b[...,c][scr],qs)).astype(int).tolist())
    L=a.mean(2)[scr]; M=b.mean(2)[scr]; print(k,'L render',np.round(np.quantile(L,qs)).astype(int).tolist(),' src',np.round(np.quantile(M,qs)).astype(int).tolist())
