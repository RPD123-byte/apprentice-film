import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
regs={'owl':(1490,190,1700,470),'face':(1525,262,1650,350),'word':(480,280,1500,620),'tag':(540,650,1620,715),'ribL':(0,0,420,700),'ribR':(1750,0,2206,860),'cloudL':(0,640,700,946),'cloudR':(1450,700,2206,946),'sky':(700,0,1500,200)}
print('t      whole '+' '.join(f'{k:>6s}' for k in regs)+'   meanL r/s')
for p in fr:
    t=re.search(r'at-([\d.]+)s',p).group(1)
    a=cv2.imread(p).astype(np.float32); b=cv2.imread(p.replace('frame-','ref-')).astype(np.float32)
    dd=np.abs(cv2.GaussianBlur(a,(0,0),3)-cv2.GaussianBlur(b,(0,0),3)).mean(2)
    print(f'{t:7s} {dd.mean():5.2f} '+' '.join(f'{dd[y0:y1,x0:x1].mean():6.2f}' for (x0,y0,x1,y1) in regs.values())+f'   {a.mean():.1f}/{b.mean():.1f}')
