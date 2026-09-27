import cv2, numpy as np, json, time
from multiprocessing import Pool
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
R=json.load(open('dcells3m.json')); lab=np.load('labD2.npy')
cap=cv2.VideoCapture(V); cap.set(1,2818); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
cap.set(1,2937); ok,cc=cap.read(); Cg=cv2.cvtColor(cc,cv2.COLOR_BGR2GRAY).astype(np.float32)
cands=[r for r in R if r.get('colfrac',0)>0.15 and (r['best'] is None or r['best'][0]<0.85)]
SC=np.arange(0.8,2.01,0.05); RO=list(range(-24,25,3))
def job(r):
    x,y,w,h=r['bbox']; m=(lab[y:y+h,x:x+w]==r['i']); t=g[y:y+h,x:x+w]
    best=(-1,)
    for s in SC:
        ts=cv2.resize(t,None,fx=1/s,fy=1/s,interpolation=cv2.INTER_AREA); ms=cv2.resize(m.astype(np.uint8)*255,(ts.shape[1],ts.shape[0]),interpolation=cv2.INTER_NEAREST)
        for rr in RO:
            hh,ww=ts.shape; D=int(np.hypot(ww,hh))+2; Mr=cv2.getRotationMatrix2D((ww/2,hh/2),rr,1); Mr[0,2]+=(D-ww)/2; Mr[1,2]+=(D-hh)/2
            tr=cv2.warpAffine(ts,Mr,(D,D)); mr=cv2.warpAffine(ms,Mr,(D,D),flags=cv2.INTER_NEAREST)
            if (mr>0).sum()<50 or D>=min(Cg.shape): continue
            res=cv2.matchTemplate(Cg,tr,cv2.TM_CCOEFF_NORMED,mask=mr); res[~np.isfinite(res)]=-1
            _,mv,_,ml=cv2.minMaxLoc(res)
            if mv>best[0]: best=(float(mv),float(s),rr,ml[0]+D/2,ml[1]+D/2)
    return r['i'],best
if __name__=='__main__':
    cv2.setNumThreads(1); t0=time.time()
    with Pool(min(15,len(cands))) as p: out=p.map(job,cands)
    print(len(cands),'cells',time.time()-t0)
    for i,b in out: print(i,'colour',b,'bw',[r['best'][0] for r in R if r['i']==i][0])
    json.dump(out,open('dcol.json','w'))
