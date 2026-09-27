import sys, time, json, numpy as np, cv2
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T
f=np.load('snapshots/s20-f2-trace/clean.npy')
mask=np.zeros(f.shape,np.uint8); mask[60:1006,60:1160]=1
LV=[0.03,0.055,0.08,0.11,0.145,0.185,0.23,0.28,0.335,0.395,0.46,0.53,0.6,0.67,0.74,0.81,0.88,0.94]
t0=time.time()
out,base=T.trace(f,mask,mode='close',C=5,use_bright=True,
   bright=dict(hi=0.06,lo=0.03,cmin=0.03,minlen=4,sigs=(0.9,1.6)),
   reg=dict(levels=LV,eps=0.9,minarea=8,blur=0.6),
   dark=dict(hi=0.06,lo=0.03,cmin=0.035,minlen=4,sigs=(0.9,1.6)))
print('time',time.time()-t0)
print('levels rings',[len(L['rings']) for L in out['levels']], 'pts', sum(len(r) for L in out['levels'] for r in L['rings']))
print('bright',len(out['bright']),sum(len(s) for s in out['bright']),'dark',len(out['dark']),sum(len(s) for s in out['dark']))
json.dump(out,open('snapshots/s20-f2-trace/%s.json'%sys.argv[1],'w'))
