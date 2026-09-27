import sys, json, numpy as np, cv2, os
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T, trace_all as TA
f=TA.clean_text(np.load(TA.OUT+'/Afull.npy'),'room')
name=sys.argv[1]; cfg=json.loads(sys.argv[2])
P=json.loads(json.dumps(TA.P)); 
for k,v in cfg.items():
    if isinstance(v,dict): P[k].update(v)
    else: P[k]=v
for k in ('bright','dark'):
    if 'sigs' in P[k]: P[k]['sigs']=tuple(P[k]['sigs'])
tr,_=T.trace(f,np.ones(f.shape,np.uint8),**P)
TA.DATA='snapshots/s20-f2-trace/var'
TA.write_js(name,'ROOM_A',tr)
