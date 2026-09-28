import cv2,numpy as np,sys,glob,re
d=sys.argv[1]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    for kind,path in [('ren',f),('ref',f.replace('frame-','ref-'))]:
        g=cv2.cvtColor(cv2.imread(path),cv2.COLOR_BGR2GRAY)
        th=150 if t<39.98 else 225
        m=(g>th).astype(np.uint8); m[:530 if t<39.5 else 450,:]=0
        if t>=39.98: m[:,:700]=0; m[:,1450:]=0; m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
        n,lab,st,cen=cv2.connectedComponentsWithStats(m)
        if n<2: print(t,kind,'none'); continue
        k=1+np.argmax(st[1:,4]); x,y,w,h,a=st[k]
        print(f'{t:6.2f} {kind} bbox x {x}-{x+w} y {y}-{y+h} cen=({cen[k][0]:.0f},{cen[k][1]:.0f}) area={a}')
