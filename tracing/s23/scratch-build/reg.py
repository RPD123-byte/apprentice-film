import cv2, glob, re, numpy as np
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
fs=sorted(glob.glob('snapshots/s06-rev1-f1/frame-*.png')+glob.glob('snapshots/s06-rev1-f2/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
R={'eyes':(760,290,1330,410),'brows':(750,180,1350,290),'mouth':(900,630,1180,770),'nose':(960,480,1160,590),'owl':(1500,120,1840,620),'owleyes':(1580,300,1760,410),'hair':(560,80,1500,640),'fist':(520,430,900,780),'beanie':(560,0,1510,230),'laptop':(220,800,1890,946),'roomL':(0,0,520,800),'roomR':(1860,0,2206,800),'hoodL':(40,560,700,946),'hoodR':(1350,540,1900,946)}
import collections
tab=collections.defaultdict(list)
for i,p in enumerate(fs):
    n=667+i
    if n in (667,726): continue
    r=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32); s=cv2.cvtColor(cv2.imread(f'{S}/src/{n}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    r5=cv2.GaussianBlur(r,(0,0),5); s5=cv2.GaussianBlur(s,(0,0),5); r1=cv2.GaussianBlur(r,(0,0),1.5); s1=cv2.GaussianBlur(s,(0,0),1.5)
    row=[n]
    for k,(x0,y0,x1,y1) in R.items():
        a=np.abs(r5[y0:y1,x0:x1]-s5[y0:y1,x0:x1]).mean(); b=np.abs(r1[y0:y1,x0:x1]-s1[y0:y1,x0:x1]).mean(); d=(r5[y0:y1,x0:x1]-s5[y0:y1,x0:x1]).mean()
        tab[k].append((n,a,b,d))
for k,v in tab.items():
    a=np.array([x[1] for x in v]); b=np.array([x[2] for x in v]); d=np.array([x[3] for x in v])
    worst=sorted(v,key=lambda x:-x[1])[:4]
    print(f'{k:8s} mae5 mean {a.mean():.2f} max {a.max():.2f}  mae1.5 {b.mean():.2f}  bias {d.mean():+.2f} (min {d.min():+.2f} max {d.max():+.2f}) worst', [(w[0],round(w[1],2)) for w in worst])
