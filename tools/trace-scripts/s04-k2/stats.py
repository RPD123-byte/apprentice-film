import cv2,glob,re,numpy as np,sys
fs=[]
for d in sys.argv[1:]: fs+=glob.glob(d+'/frame-*.png')
rows={}
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); fi=round(t*25)
    if fi<478 or fi>577 or fi in rows: continue
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    m6=np.abs(cv2.GaussianBlur(a,(0,0),6)-cv2.GaussianBlur(b,(0,0),6)).mean()
    m2=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)).mean()
    bp=lambda x: np.abs(cv2.GaussianBlur(x,(0,0),1)-cv2.GaussianBlur(x,(0,0),3)).mean()
    rows[fi]=(t,m6,m2,bp(a),bp(b),a.mean(),b.mean())
ks=sorted(rows); v=np.array([rows[k][1:] for k in ks])
print('frames',len(ks))
print('sigma6 MAE mean %.2f median %.2f max %.2f (at %.2f)'%(v[:,0].mean(),np.median(v[:,0]),v[:,0].max(),rows[ks[int(v[:,0].argmax())]][0]))
print('sigma2 MAE mean %.2f max %.2f'%(v[:,1].mean(),v[:,1].max()))
print('texture energy render %.2f source %.2f'%(v[:,2].mean(),v[:,3].mean()))
print('mean level render %.1f source %.1f'%(v[:,4].mean(),v[:,5].mean()))
for lo,hi,name in [(478,502,'landing 19.12-20.08'),(503,520,'hold 20.12-20.80'),(521,552,'arc to 22.08'),(553,577,'arc 22.12-23.08')]:
    sel=[k for k in ks if lo<=k<=hi]; w=np.array([rows[k][1] for k in sel]); w2=np.array([rows[k][2] for k in sel])
    print(name, 'sigma6 %.2f (max %.2f) sigma2 %.2f'%(w.mean(),w.max(),w2.mean()))
old=[19.12,19.32,19.52,19.72,19.92,20.12,20.32,20.52,20.72,20.92,21.12,21.32,21.36,21.44,21.52,21.72,21.92,22.12,22.32,22.52,22.72,22.92,23.04,23.08]
print("at the previous pass's 24 in-segment times: %.2f"%np.mean([rows[round(t*25)][1] for t in old]))
