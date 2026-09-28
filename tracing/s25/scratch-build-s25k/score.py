# usage: score.py RDIR [f0 f1] [--crop x0 y0 x1 y1] -> per-frame sigma8 MAE (grey) + summary by phase
import cv2, sys, numpy as np
a=sys.argv[1:]; rd=a[0]; f0,f1=2512,2762; crop=None
if '--crop' in a: i=a.index('--crop'); crop=list(map(int,a[i+1:i+5])); a=a[:i]+a[i+5:]
if len(a)>=3: f0,f1=int(a[1]),int(a[2])
res={}
for f in range(f0,f1+1):
    r=cv2.imread(f'{rd}/r-{f:05d}.png',0); s=cv2.imread(f'src/f{f:05d}.png',0)
    if r is None: continue
    if crop: x0,y0,x1,y1=crop; r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
    gr=cv2.GaussianBlur(r.astype(np.float32),(0,0),8); gs=cv2.GaussianBlur(s.astype(np.float32),(0,0),8)
    res[f]=float(np.abs(gr-gs).mean())
ks=sorted(res)
line=[]
for f in ks: line.append(f'{f/25:.2f}:{res[f]:.1f}')
for i in range(0,len(line),10): print(' '.join(line[i:i+10]))
def ph(a,b):
    v=[res[f] for f in ks if a<=f/25<b-1e-6]; return np.mean(v) if v else float('nan')
print('chaos 100.48-103.0 %.2f | stand 103.0-110.52 %.2f | all %.2f'%(ph(100.48,103.0),ph(103.0,110.52),np.mean(list(res.values()))))
print('phases: pop/crouch/rise 103-103.56 %.2f hips1 103.56-105.52 %.2f big 105.52-106.84 %.2f raise 106.84-108.52 %.2f hips2 108.52- %.2f'%(ph(103,103.56),ph(103.56,105.52),ph(105.52,106.84),ph(106.84,108.52),ph(108.52,110.52)))
