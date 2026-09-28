import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22')
from common import *
import trace as TR, json
med=np.load(S+'/top_pre_med.npy')
v=med.copy()
DASH0=162.5
rough=cv2.dilate((cv2.GaussianBlur(v,(0,0),1)>0.6).astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
w=(1-rough).astype(np.float32); w[160:172]=0
def ncv(v,w,s): return cv2.GaussianBlur(v*w,(0,0),s)/np.maximum(cv2.GaussianBlur(w,(0,0),s),1e-4)
halo=ncv(v,w,5); halo2=ncv(v,w,14); halo=np.where(cv2.GaussianBlur(w,(0,0),5)>0.05,halo,halo2)
THR=float(sys.argv[1]) if len(sys.argv)>1 else 0.2
hu=TR.up(halo)
yu=(np.arange(v.shape[0]*TR.UP)[:,None]+0.5)/TR.UP-0.5
def silf(vu):
    m=(vu-hu)>THR
    m[np.broadcast_to(yu>DASH0,m.shape)]=False
    return m
T=TR.trace(v,silf,deltas=(0.06,0.14,0.24,0.36,0.5),base_thr=0.85)
print('sil rings',len(T['sil']),sum(len(r) for r in T['sil']),'levels',[(L['v'],len(L['rings']),sum(len(r) for r in L['rings'])) for L in T['levels']])
T['origin']=[-115,-60]   # crop (0,0) relative to the cup
json.dump(T,open(S+'/edge_trace.json','w'))
img,a=TR.render(T,blur=0.7)
comp=img+(1-a)*halo
comp[160:]=np.where(a[160:]>0.02,comp[160:],v[160:])
m=cv2.dilate((a>0.02).astype(np.uint8),np.ones((5,5)))>0
for b in (1,2,4):
    e=np.abs(cv2.GaussianBlur(comp,(0,0),b)-cv2.GaussianBlur(v,(0,0),b))[m].mean()*255
    print('err blur%d %.1f/255'%(b,e))
out=np.clip(np.hstack([comp,v]),0,1)*255
cv2.imwrite(S+'/edge_trace_cmp.png',cv2.resize(out,None,fx=2.5,fy=2.5,interpolation=cv2.INTER_LINEAR).astype(np.uint8))
print(len(json.dumps(T)),'bytes')
