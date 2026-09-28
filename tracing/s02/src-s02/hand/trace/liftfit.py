# per-frame lift of each flying wing's tip: IoU of each half of the silhouette against the source, best of candidates
import sys, os, json, re, cv2, numpy as np
os.environ['ENTRY']='entry_owlonly.js'; F=[int(v) for v in sys.argv[1].split('-')]; sys.argv=[sys.argv[0]]
from run import Lab
sys.path.insert(0,'../s02-r3-meas'); from common import ungrade, src
T=open('../../src/shots/s02/hand/owltrack.js').read()
R=[float(v) for v in re.search(r'OWL_ROOT = \[(.*?)\]',T).group(1).split(',')]
L=Lab(); CAND=[-95,-80,-65,-50,-35,-20,-5,10,25]; res={}
for f in range(F[0],F[1]+1):
    k=f-397; x,y,s,b=R[4*k:4*k+4]
    S=(cv2.GaussianBlur(ungrade(src(f).astype(np.float32),f/25),(0,0),1.5)>150).astype(np.uint8)
    out=[]
    for side in ['L','R']:
        best=None
        for c in CAND:
            L.js('(o)=>LAB.wt(o)', {'tyL': c if side=='L' else 0, 'tyR': c if side=='R' else 0})
            img,_=L.frame(f,False)
            Rm=(cv2.GaussianBlur(cv2.cvtColor(img,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)>150).astype(np.uint8)
            ys,xs=np.nonzero(Rm)
            Z=np.zeros_like(Rm); Z[max(0,ys.min()-60):ys.max()+60,max(0,xs.min()-60):xs.max()+60]=1
            half=np.zeros_like(Rm)
            if side=='L': half[:, :max(0,int(x-60*s))]=1
            else: half[:, int(x+60*s):]=1
            A=Rm*half; B=S*Z*half
            iou=(A&B).sum()/max(1,(A|B).sum())
            if best is None or iou>best[0]: best=(iou,c)
        out.append(best[1])
    res[f]=out; print(f,out,flush=True)
L.js('(o)=>LAB.wt(o)',{'tyL':None,'tyR':None}); L.close()
json.dump(res,open(f'../s02-r3-meas/wlift_{F[0]}_{F[1]}.json','w'))
