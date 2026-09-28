import sys, time, cv2, numpy as np, json
sys.path.insert(0,'.')
from lab import *
from owlm import om
L=Lab()
t0,t1=float(sys.argv[1]),float(sys.argv[2]); out=sys.argv[3]; step=float(sys.argv[4]) if len(sys.argv)>4 else 0.04
os.makedirs(out,exist_ok=True)
OWL=(330,280,930,610)
res=[]
n=int(round((t1-t0)/step))+1
for i in range(n):
    t=round(t0+i*step,2)
    a=time.time(); f=L.frame(t); dt=time.time()-a
    s=src(t)
    cv2.imwrite(f'{out}/f{t:.2f}.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,93])
    r=dict(t=t,ms=round(dt*1000),full=round(mae(f,s),2),owl=round(mae(f,s,box=OWL),2),om=round(om(f,s,t,1.5),2),om4=round(om(f,s,t,4),2))
    res.append(r); print(r,flush=True)
json.dump(res,open(f'{out}/sweep.json','w'))
L.close()
