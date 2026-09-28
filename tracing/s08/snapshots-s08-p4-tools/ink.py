import numpy as np,cv2,sys
sys.path.insert(0,'snapshots/s08-p4-tools')
from cam import f0
rd=sys.argv[1]
x0=1451.3+82.75*0.9958; adv=15.5*0.9958; ytop=int(183.7+185*0.9958); ybot=int(183.7+214*0.9958)
tot_s=np.zeros(19); tot_r=np.zeros(19); E=[]
for k in range(800,815):
    S=f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),k).astype(float); Rr=f0(cv2.imread(f'{rd}/r{k}.png'),k).astype(float)
    gs=S.mean(-1); gr=Rr.mean(-1)
    for i in range(19):
        a=int(x0+i*adv); b=int(x0+(i+1)*adv)
        ps=np.median(gs[ytop-12:ytop-4,a:b]); pr=np.median(gr[ytop-12:ytop-4,a:b])
        tot_s[i]+=np.clip(ps-gs[ytop:ybot,a:b],0,None).sum(); tot_r[i]+=np.clip(pr-gr[ytop:ybot,a:b],0,None).sum()
    xa,xb=int(x0)-5,int(x0+19*adv)+5
    E.append(np.abs(cv2.GaussianBlur(S,(0,0),1.5)-cv2.GaussianBlur(Rr,(0,0),1.5)).mean(-1)[ytop-5:ybot+5,xa:xb].mean())
print('ink R/S %.3f'%(tot_r.sum()/tot_s.sum()), 'textbox err(s1.5) %.2f'%np.mean(E), ' '.join(f'{r/s:.2f}' for s,r in zip(tot_s,tot_r)))
