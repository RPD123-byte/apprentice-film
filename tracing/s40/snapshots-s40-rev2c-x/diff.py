import cv2, sys, glob, numpy as np
d, idx, out = sys.argv[1], sys.argv[2], sys.argv[3]
fa=glob.glob(f'{d}/frame-{idx}-*.png')[0]; fb=glob.glob(f'{d}/ref-{idx}-*.png')[0]
a=cv2.imread(fa).astype(np.float32); b=cv2.imread(fb).astype(np.float32)
ab=cv2.GaussianBlur(a,(0,0),3); bb=cv2.GaussianBlur(b,(0,0),3)
dd=np.abs(ab-bb).mean(2)
print(fa, 'whole', round(float(dd.mean()),2))
regs={'sky_top':(700,0,1500,200),'ribL':(0,0,420,700),'ribR':(1750,0,2206,860),'cloudL':(0,640,700,946),'cloudR':(1450,700,2206,946),'word':(480,280,1500,620),'owl':(1490,190,1700,470),'tag':(540,650,1620,715),'stopext':(1560,440,1700,600)}
for k,(x0,y0,x1,y1) in regs.items(): print(k, round(float(dd[y0:y1,x0:x1].mean()),2), 'meanBGR r', [int(v) for v in a[y0:y1,x0:x1].reshape(-1,3).mean(0)], 's', [int(v) for v in b[y0:y1,x0:x1].reshape(-1,3).mean(0)])
hm=cv2.applyColorMap(np.clip(dd*6,0,255).astype(np.uint8),cv2.COLORMAP_JET)
cv2.imwrite(out,cv2.resize(hm,None,fx=0.5,fy=0.5))
