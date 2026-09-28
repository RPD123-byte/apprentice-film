# sweep.py out: render all 135 frames 47.84–53.20 (+47.80), print full σ6, owl σ1.5 per phase
import sys, os, cv2, numpy as np, json, time
sys.path.insert(0,'.')
from lab import *
from owlm import om
out=sys.argv[1]; os.makedirs(out,exist_ok=True)
L=Lab()
ts=[47.80]+[round(47.84+0.04*k,2) for k in range(135)]
res={}
for t in ts:
    f=L.frame(t); s=src(t); d=L.ms()
    r={'full6':mae(f,s),'ms':d}
    if t>=48.56: r['om']=om(f,s,t,1.5)
    res[f'{t:.2f}']=r
    if t in (47.80,47.84,48.20,50.04,51.64,52.60,53.00,53.20) or abs(t*100%40)<1e-6: cv2.imwrite(f'{out}/r{t:.2f}.jpg',f,[cv2.IMWRITE_JPEG_QUALITY,90])
json.dump(res,open(f'{out}/sweep.json','w'))
def ph(a,b,key):
    v=[r[key] for k,r in res.items() if a-1e-6<=float(k)<=b+1e-6 and key in r]; return np.mean(v) if v else float('nan'), len(v)
for name,a,b in [('pull',47.84,48.52),('crouch',48.56,49.08),('rise',49.12,52.48),('launch',52.52,52.64),('dash',52.68,53.20),('all',47.84,53.20)]:
    f6=ph(a,b,'full6'); o=ph(a,b,'om'); ms=ph(a,b,'ms')
    print(f'{name:7s} n={f6[1]:3d} full6 {f6[0]:.2f} om1.5 {o[0]:.2f} draw ms {ms[0]:.0f}')
mx=max((r['ms'],k) for k,r in res.items() if k not in ('47.80','47.84','48.44'))
print('max draw ms (excluding first frames):',mx)
L.close()
