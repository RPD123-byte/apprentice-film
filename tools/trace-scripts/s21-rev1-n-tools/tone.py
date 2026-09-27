import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
R={'Lmargin y200-600 x20-120':(20,200,120,600),'Lmargin y700-900 x20-120':(20,700,120,900),'Lmargin x125-140 y300-600':(125,300,140,600),
   'Top x700-1500 y10-100':(700,10,1500,100),'Top x1600-2150 y10-100':(1600,10,2150,100),'Right x2110-2190 y300-700':(2110,300,2190,700),
   'Bottom x600-1600 y925-944':(600,925,1600,944),'Page x200-2000 y150-900':(200,150,2000,900)}
print('t'.ljust(7),' | '.join(k[:22].ljust(22) for k in R))
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f,0).astype(float); b=cv2.imread(f.replace('frame-','ref-'),0).astype(float)
    row=[]
    for k,(x0,y0,x1,y1) in R.items():
        row.append(f"{a[y0:y1,x0:x1].mean():5.1f}/{b[y0:y1,x0:x1].mean():5.1f}".ljust(22))
    print(f"{t:6.2f} "," | ".join(row))
