# final metrics: base vs final, per region (render - source), blurred MAE sigma 6
import cv2, numpy as np, sys
regs={'whole':(0,0,2206,946),'room x>=1540':(1540,0,2206,946),'room minus speaker':(1540,0,2030,946),'speaker':(2040,370,2206,946),'woofer':(2080,640,2206,900),
'mid room':(1700,230,1930,520),'lower room':(1760,650,2030,946),'beanie':(0,0,480,570),'cuff bottom':(0,515,300,555),'slab upper band':(700,770,820,840),
'slab texture':(650,800,850,940),'crease band':(890,860,950,940),'right plane low':(930,915,1060,946),'neck':(170,812,268,946),'shirt':(320,890,560,946),'lock tip':(85,665,160,730),
'outside owl box':None}
def load(d,i,t): return cv2.imread(f'{d}/frame-{i}-at-{t}s.png').astype(np.float32), cv2.imread(f'{d}/ref-{i}-at-{t}s.png').astype(np.float32)
def m(F,R,box):
    f=cv2.GaussianBlur(F.mean(2),(0,0),6); r=cv2.GaussianBlur(R.mean(2),(0,0),6)
    if box is None:
        msk=np.ones(f.shape,bool); msk[:,660:1960]=False
        return np.abs(f-r)[msk].mean(), F.mean(2)[msk].mean()-R.mean(2)[msk].mean()
    x0,y0,x1,y1=box
    return np.abs(f-r)[y0:y1,x0:x1].mean(), F.mean(2)[y0:y1,x0:x1].mean()-R.mean(2)[y0:y1,x0:x1].mean()
for bi,fi,t in [('00','00','32.6'),('01','02','33'),('02','06','33.4')]:
    Fb,Rb=load('snapshots/s09-fix1-base',bi,t); Ff,Rf=load('snapshots/s09-fix1-final',fi,t)
    print(f'--- t={t}: region: MAE6 base -> final (mean diff base -> final)')
    for k,b in regs.items():
        a1,d1=m(Fb,Rb,b); a2,d2=m(Ff,Rf,b)
        print(f'{k:20s} {a1:6.2f} -> {a2:6.2f}   ({d1:+6.1f} -> {d2:+6.1f})')
