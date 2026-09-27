import sys; sys.path.insert(0,'src/shots/s20/trace')
import composite2 as C, numpy as np, cv2, json
M=C.M
frames=list(range(1578,1736))
imgs={}
for n in frames:
    g=cv2.cvtColor(cv2.imread(C.SRC%n),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    imgs[n]=cv2.GaussianBlur(g,(0,0),2)
# static reference per setup: median over the setup's frames
A=[n for n in frames if n<1671]; B1=[n for n in frames if 1671<=n<1685]; B2=[n for n in frames if n>=1696]
refs={}
for name,fs in (('A',A),('B1',B1),('B2',B2)): refs[name]=np.median(np.stack([imgs[n] for n in fs[::2]]),axis=0)
out={}
for n in frames:
    ref=refs['A'] if n<1671 else refs['B1'] if n<1685 else refs['B2']
    d=np.abs(imgs[n]-ref)>0.10
    d[:, :500]=False
    d=cv2.morphologyEx(d.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    ys,xs=np.nonzero(d)
    if len(xs)<50: out[n]=None; print(n/25,'none'); continue
    x0,x1=np.percentile(xs,[0.5,99.5]); y0,y1=np.percentile(ys,[0.5,99.5])
    out[n]=[int(x0),int(y0),int(x1),int(y1)]
    print('%.2f'%(n/25), out[n], len(xs))
json.dump(out,open('snapshots/s20-f2-trace/owlbox.json','w'))
