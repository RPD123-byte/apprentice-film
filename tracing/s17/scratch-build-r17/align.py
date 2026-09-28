import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
orb=cv2.ORB_create(6000)
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f,0); b=cv2.imread(f.replace('frame-','ref-'),0)
    # template-match small feature patches: mug and DO NOT KNOCK plate, headline
    res=[]
    for name,box in [('mug',(760,440,930,560)),('sign',(560,160,800,240)),('laptop',(880,380,1110,470)),('lamp',(1180,300,1330,420))]:
        x0,y0,x1,y1=box
        tpl=a[y0:y1,x0:x1]
        r=cv2.matchTemplate(b,tpl,cv2.TM_CCOEFF_NORMED)
        _,mv,_,ml=cv2.minMaxLoc(r)
        res.append(f"{name}:d=({ml[0]-x0:+d},{ml[1]-y0:+d}) cc={mv:.2f}")
    print(f"{t:6.2f}", '  '.join(res))
