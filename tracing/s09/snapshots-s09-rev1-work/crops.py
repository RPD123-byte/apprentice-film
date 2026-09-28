import cv2, numpy as np, sys
d,idx,t=sys.argv[1],sys.argv[2],sys.argv[3]
f=cv2.imread(f'{d}/frame-{idx}-at-{t}s.png'); r=cv2.imread(f'{d}/ref-{idx}-at-{t}s.png')
regs={'crown':(0,0,440,300,2),'cuff':(0,240,490,580,2),'hair':(0,560,560,946,2),'slab':(540,680,1200,946,1.5),'feet':(1000,760,1560,946,2),
'roomtop':(1530,0,2060,470,1.5),'roombot':(1530,440,2060,946,1.5),'speaker':(1990,340,2206,946,1.5),'owlface':(700,150,1160,650,1.5),'phones':(1100,0,1460,450,1.5),'wing':(1500,500,2000,900,1.3)}
for k,(x0,y0,x1,y1,s) in regs.items():
    a=f[y0:y1,x0:x1]; b=r[y0:y1,x0:x1]
    im=np.hstack([a,np.full((y1-y0,6,3),(0,0,255),np.uint8),b])
    im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>=2 else cv2.INTER_LINEAR)
    cv2.imwrite(f'snapshots/s09-rev1-work/z-{t}-{k}.png',im)
