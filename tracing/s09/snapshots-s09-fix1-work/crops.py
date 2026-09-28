import cv2, numpy as np, sys
# usage: crops.py DIR IDX T OUTPREFIX [region names...]
d,idx,t,pre=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4]
names=sys.argv[5:]
f=cv2.imread(f'{d}/frame-{idx}-at-{t}s.png'); r=cv2.imread(f'{d}/ref-{idx}-at-{t}s.png')
regs={'crown':(0,0,440,300,2),'cuff':(0,240,490,580,2),'hair':(0,560,560,946,1.6),'neck':(120,780,600,946,2.5),'slab':(540,680,1200,946,1.5),'feet':(1000,760,1560,946,2),
'roomtop':(1530,0,2060,470,1.6),'roombot':(1530,440,2060,946,1.6),'roomtopL':(1530,200,1960,560,2.2),'lowR':(1740,480,2060,946,2),'plant':(1960,160,2200,440,2.5),'speaker':(1990,340,2206,946,1.5),'owlface':(700,150,1160,650,1.5),'wing':(1500,500,2000,900,1.3),'lock':(40,620,220,760,4)}
gam=len(sys.argv)>0 and pre.endswith('g')
for k,(x0,y0,x1,y1,s) in regs.items():
    if names and k not in names: continue
    a=f[y0:y1,x0:x1]; b=r[y0:y1,x0:x1]
    if gam:
        lut=np.array([min(255,int(255*((i/255)**0.5))) for i in range(256)],np.uint8); a=cv2.LUT(a,lut); b=cv2.LUT(b,lut)
    im=np.vstack([a,np.full((6,x1-x0,3),(0,0,255),np.uint8),b]) if (x1-x0)>1.6*(y1-y0) else np.hstack([a,np.full((y1-y0,6,3),(0,0,255),np.uint8),b])
    im=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST if s>=2 else cv2.INTER_LINEAR)
    cv2.imwrite(f'{pre}-{k}.jpg',im,[cv2.IMWRITE_JPEG_QUALITY,90])
