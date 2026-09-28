# edge drawing v2: silhouette from the top-side median (clean dark background), values from the bottom-side median
# (inside the screen: no margin glow over the owl, so the drawing's own darks)
import sys; sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s22')
from common import *
import trace as TR, json
top=np.load(S+'/top_pre_med.npy'); bot=np.load(S+'/bot_pre_med.npy')
DASH0=162.5
rough=cv2.dilate((cv2.GaussianBlur(top,(0,0),1)>0.6).astype(np.uint8),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
w=(1-rough).astype(np.float32); w[160:172]=0
def ncv(v,w,s): return cv2.GaussianBlur(v*w,(0,0),s)/np.maximum(cv2.GaussianBlur(w,(0,0),s),1e-4)
halo=ncv(top,w,5); halo2=ncv(top,w,14); halo=np.where(cv2.GaussianBlur(w,(0,0),5)>0.05,halo,halo2)
hu=TR.up(halo); tu=TR.up(cv2.GaussianBlur(top,(0,0),0.6))
yu=(np.arange(top.shape[0]*TR.UP)[:,None]+0.5)/TR.UP-0.5
SIL=(tu-hu)>0.2
SIL[np.broadcast_to(yu>DASH0,SIL.shape)]=False
bu=TR.up(cv2.GaussianBlur(bot,(0,0),0.8))
SIL&=~(np.broadcast_to(yu>140,SIL.shape)&(bu<0.4))
def silf(vu): return SIL
T=TR.trace(bot,silf,deltas=(0.06,0.14,0.24,0.36,0.5,0.66),base_thr=0.85)
T['origin']=[-115,-60]
json.dump(T,open(S+'/edge_trace2.json','w'))
img,a=TR.render(T,blur=0.7)
comp=img+(1-a)*0.1
out=np.clip(np.hstack([comp,bot]),0,1)*255
cv2.imwrite(S+'/edge_trace2_cmp.png',cv2.resize(out,None,fx=2.5,fy=2.5,interpolation=cv2.INTER_LINEAR).astype(np.uint8))
m=cv2.erode((a>0.98).astype(np.uint8),np.ones((3,3)))>0
print('interior err blur1 %.1f'%(np.abs(cv2.GaussianBlur(img,(0,0),1)-cv2.GaussianBlur(bot,(0,0),1))[m].mean()*255), len(json.dumps(T)))
