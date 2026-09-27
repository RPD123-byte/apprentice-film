# patches.py F : per 64x64 patch of the shard ring, the stage-page similarity (scale, rotation, position) by NCC search
import cv2, numpy as np, json, sys, time
from multiprocessing import Pool
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
F=int(sys.argv[1]); P=int(sys.argv[3]) if len(sys.argv)>3 else 96; STRIDE=int(sys.argv[2]) if len(sys.argv)>2 else 32
A=cv2.cvtColor(cv2.imread('../medA.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
cap=cv2.VideoCapture(V); cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
# colour-page area (already right) and the owl are skipped
PA=[[112.7,0.8219,166.7,100.5],[112.9,0.8288,165.8,101.5],[113.1,0.8505,147.1,91.6],[113.3,0.8869,110.1,72.4],[113.45,0.9211,70.6,52.0],[113.6,0.9385,55.2,39.3],[113.8,0.9616,35.8,25.7],[114.05,0.9792,18.9,13.7]]
def arr(t):
    if t<=PA[0][0]: return PA[0][1:]
    for i in range(1,len(PA)):
        if t<=PA[i][0]:
            a,b=PA[i-1],PA[i]; u=(t-a[0])/(b[0]-a[0]); return [a[k]+(b[k]-a[k])*u for k in (1,2,3)]
    return PA[-1][1:]
cap.set(1,2937); ok,cc=cap.read(); s,tx,ty=arr(F/25)
Wc=cv2.warpAffine(cc,np.float32([[s,0,tx],[0,s,ty]]),(2206,946))
dcol=cv2.GaussianBlur(np.abs(f.astype(np.float32)-Wc.astype(np.float32)).sum(2),(0,0),3)
colmask=dcol<45
try:
    om=np.fromfile(f'../fit/m/{F}.bin',np.uint8).reshape(473,1103); om=cv2.resize(om,(2206,946))>127
except Exception: om=np.zeros(g.shape,bool)
SC=np.arange(1.5,2.71,0.1); RO=list(range(-24,25,6))
def job(xy):
    x,y=xy; p=g[y:y+P,x:x+P]
    cands=[]
    for s in SC:
        ps=cv2.resize(p,None,fx=1/s,fy=1/s,interpolation=cv2.INTER_AREA)
        h,w=ps.shape
        for r in RO:
            Mr=cv2.getRotationMatrix2D((w/2,h/2),r,1); pr=cv2.warpAffine(ps,Mr,(w,h),borderMode=cv2.BORDER_REFLECT)
            c=pr[h//10:h-h//10,w//10:w-w//10]
            res=cv2.matchTemplate(A,c,cv2.TM_CCOEFF_NORMED)
            for _ in range(2):
                _,mv,_,ml=cv2.minMaxLoc(res)
                cands.append((float(mv),float(s),r,ml[0]+c.shape[1]/2,ml[1]+c.shape[0]/2))
                cv2.rectangle(res,(ml[0]-6,ml[1]-6),(ml[0]+6,ml[1]+6),-1,-1)
    cands.sort(reverse=True)
    # keep the 4 best distinct stage positions
    keep=[]
    for cnd in cands:
        if all(np.hypot(cnd[3]-k[3],cnd[4]-k[4])>12 for k in keep): keep.append(cnd)
        if len(keep)==4: break
    return [x+P/2,y+P/2,keep]
if __name__=='__main__':
    todo=[]
    for y in range(0,946-P+1,STRIDE):
        for x in range(0,2206-P+1,STRIDE):
            p=g[y:y+P,x:x+P]
            if colmask[y:y+P,x:x+P].mean()>0.5 or om[y:y+P,x:x+P].mean()>0.2: continue
            if p.std()<14 or p.mean()<25: continue
            todo.append((x,y))
    print(len(todo),'patches'); t0=time.time()
    cv2.setNumThreads(1)
    with Pool(15) as pool: res=pool.map(job,todo,chunksize=4)
    json.dump(res,open(f'patchesK-{F}.json','w')); print('done',time.time()-t0)
