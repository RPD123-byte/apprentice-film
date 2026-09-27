# iterative residual strokes: start from a variant module's trace json + its raw render
import sys, json, numpy as np, cv2, subprocess
sys.path.insert(0,'src/shots/s20/trace')
import trace_room as T, trace_all as TA
f=TA.clean_text(np.load(TA.OUT+'/Afull.npy'),'room')
lvcfg=json.loads(sys.argv[1]); iters=int(sys.argv[2]); thr=float(sys.argv[3]); name=sys.argv[4]
P=json.loads(json.dumps(TA.P))
for k,v in lvcfg.items(): P[k].update(v)
for k in ('bright','dark'): P[k]['sigs']=tuple(P[k]['sigs'])
tr,_=T.trace(f,np.ones(f.shape,np.uint8),**P)
TA.DATA='snapshots/s20-f2-trace/var'
mask=np.ones(f.shape,np.uint8)
for it in range(iters+1):
    TA.write_js(name,'ROOM_A',json.loads(json.dumps(tr)))
    subprocess.run(['node','snapshots/s20-f2-dev/dev.mjs','snapshots/s20-f2-dev/rawroom.built.html','snapshots/s20-f2-trace/v_%s.png'%name,'f=%s&dir=/snapshots/s20-f2-trace/var/'%name],capture_output=True)
    r=cv2.imread('snapshots/s20-f2-trace/v_%s.png'%name,0).astype(np.float32)/255
    print('iter',it,' '.join('s%d %.2f'%(s,np.abs(cv2.GaussianBlur(r,(0,0),s)-cv2.GaussianBlur(f,(0,0),s)).mean()*255) for s in (1,2,6)),'bias %.2f'%((r-f).mean()*255), 'strokes',len(tr['dark']),len(tr['bright']),flush=True)
    if it==iters: break
    tr['dark']+=T.strokes(f, r, mask, -1, hi=thr*2, lo=thr, cmin=thr, minlen=4, sigs=(0.8,1.4))
    tr['bright']+=T.strokes(f, r, mask, +1, hi=thr*2, lo=thr, cmin=thr, minlen=4, sigs=(0.8,1.4))
