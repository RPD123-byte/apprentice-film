import sys, time, json, numpy as np, cv2
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T
f=np.load('snapshots/s20-f2-trace/clean.npy')
mask=np.zeros(f.shape,np.uint8); mask[60:1006,60:1160]=1
t0=time.time()
out,base=T.trace(f,mask)
print('time',time.time()-t0)
print('levels rings',[len(L['rings']) for L in out['levels']], 'pts', sum(len(r) for L in out['levels'] for r in L['rings']))
print('bright',len(out['bright']),sum(len(s) for s in out['bright']),'dark',len(out['dark']),sum(len(s) for s in out['dark']))
json.dump(out,open('snapshots/s20-f2-trace/t1.json','w'))
cv2.imwrite('snapshots/s20-f2-trace/t1base.png',(base*255).astype(np.uint8))
