import sys, json, numpy as np, cv2
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T, trace_all as TA
f=TA.clean_text(np.load(TA.OUT+'/Afull.npy'),'room')
base_name=sys.argv[1]; out=sys.argv[2]; thr=float(sys.argv[3])
r=cv2.imread('snapshots/s20-f2-trace/v_%s.png'%base_name,0).astype(np.float32)/255
tr0,_=T.trace(f,np.ones(f.shape,np.uint8),**{**TA.P})
mask=np.ones(f.shape,np.uint8)
d2=T.strokes(f, r, mask, -1, hi=thr*2, lo=thr, cmin=thr, minlen=4, sigs=(0.8,1.4))
b2=T.strokes(f, r, mask, +1, hi=thr*2, lo=thr, cmin=thr, minlen=4, sigs=(0.8,1.4))
print('extra dark',len(d2),'bright',len(b2))
tr0['dark']+=d2; tr0['bright']+=b2
TA.DATA='snapshots/s20-f2-trace/var'
TA.write_js(out,'ROOM_A',tr0)
