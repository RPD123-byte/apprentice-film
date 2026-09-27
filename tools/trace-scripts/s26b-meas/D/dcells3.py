# dcells.py: D ring cells (frame 2818 coords) and, per cell, the stage-page similarity by masked template search
import cv2, numpy as np, json, sys, time
from multiprocessing import Pool
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
F=2818
P=np.load('P-D.npy'); segs=json.load(open('segsD.json'))
O=((P>0.3).astype(np.uint8))
for s in segs: cv2.line(O,(int(round(s[0])),int(round(s[1]))),(int(round(s[2])),int(round(s[3]))),1,5)
O=cv2.dilate(O,np.ones((5,5),np.uint8))
lab=np.load('labD2.npy'); n=lab.max()+1
st=np.zeros((n,5),int)
for i in range(1,n):
    ys,xs=np.nonzero(lab==i)
    if len(xs): st[i]=[xs.min(),ys.min(),xs.max()-xs.min()+1,ys.max()-ys.min()+1,len(xs)]
cap=cv2.VideoCapture(V); cap.set(1,F); ok,f=cap.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
A=cv2.cvtColor(cv2.imread('../medA_clean.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
# exclude the colour window, the owl, the scissors
R=json.load(open('ringD.json')); win=np.zeros(g.shape,np.uint8); cv2.fillPoly(win,[np.array(R[str(F)]['window'],np.int32)],1)
om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
bad=(win>0)|cv2.dilate(om.astype(np.uint8),np.ones((15,15),np.uint8)).astype(bool)
hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV); bright=(hsv[...,2]>200)&(hsv[...,1]<50)   # scissors / white
SC=np.arange(1.5,2.36,0.05); RO=list(range(-24,25,3))
def job(i):
    x,y,w,h,a=st[i]
    m=(lab[y:y+h,x:x+w]==i)&~bad[y:y+h,x:x+w]
    if m.sum()<500: return None
    t=g[y:y+h,x:x+w]
    mean=float(t[m].mean()); sd=float(t[m].std())
    rec={'i':int(i),'bbox':[int(x),int(y),int(w),int(h)],'area':int(m.sum()),'mean':mean,'sd':sd}
    if sd<8: rec['best']=None; return rec
    best=(-1,)
    for s in SC:
        ts=cv2.resize(t,None,fx=1/s,fy=1/s,interpolation=cv2.INTER_AREA); ms=cv2.resize(m.astype(np.uint8)*255,(ts.shape[1],ts.shape[0]),interpolation=cv2.INTER_NEAREST)
        for r in RO:
            hh,ww=ts.shape; c=(ww/2,hh/2); Mr=cv2.getRotationMatrix2D(c,r,1)
            # expand canvas so the rotation does not clip
            D=int(np.hypot(ww,hh))+2; Mr[0,2]+=(D-ww)/2; Mr[1,2]+=(D-hh)/2
            tr=cv2.warpAffine(ts,Mr,(D,D)); mr=cv2.warpAffine(ms,Mr,(D,D),flags=cv2.INTER_NEAREST)
            if (mr>0).sum()<50: continue
            res=cv2.matchTemplate(A,tr,cv2.TM_CCOEFF_NORMED,mask=mr)
            res[~np.isfinite(res)]=-1
            _,mv,_,ml=cv2.minMaxLoc(res)
            if mv>best[0]:
                # stage point that matches the template centre
                best=(float(mv),float(s),r,ml[0]+D/2,ml[1]+D/2)
    rec['best']=best
    return rec
if __name__=='__main__':
    ids=[i for i in range(1,n) if 500<=st[i][4]<=80000]
    print(len(ids),'cells to match'); t0=time.time()
    cv2.setNumThreads(1)
    with Pool(15) as pool: res=pool.map(job,ids,chunksize=1)
    res=[r for r in res if r]
    json.dump(res,open('dcells3.json','w')); print('done',time.time()-t0)
    sc=[r['best'][0] for r in res if r['best']]; print('scores',np.percentile(sc,[10,25,50,75,90]))
