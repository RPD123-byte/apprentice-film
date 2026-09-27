# find source frames whose foreground is the same drawing as the previous frame (on twos / held poses)
import cv2, numpy as np, json, sys
from multiprocessing import Pool
import fgx
def feat(k):
    F=fgx.load(k); P,cov=fgx.predict(k); m,d=fgx.fgmask(F,P,cov,G=fgx.GL[k])
    Y=F.mean(-1)
    return k, (m>0), Y
def main(a,b,thr):
    ks=list(range(a,b+1))
    with Pool(10) as p: res=p.map(feat,ks)
    out={}; ref={}
    for i in range(1,len(res)):
        k,m,Y=res[i]; kp,mp,Yp=res[i-1]
        u=m|mp
        if u.sum()==0: continue
        inter=(m&mp).sum()/u.sum()
        d=np.abs(cv2.GaussianBlur(Y,(0,0),1)-cv2.GaussianBlur(Yp,(0,0),1))[u]
        e=float(d.mean()); p99=float(np.percentile(d,99))
        out[k]=(round(inter,3),round(e,4),round(p99,3))
    json.dump(out,open('holdstats.json','w'))
    for k,v in out.items(): print(k,v)
if __name__=='__main__': main(int(sys.argv[1]),int(sys.argv[2]),0)
