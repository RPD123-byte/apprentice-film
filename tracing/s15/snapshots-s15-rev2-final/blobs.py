import cv2,numpy as np,glob,re,sys
d=sys.argv[1]; frames=[int(x) for x in open(sys.argv[2]).read().split()]
fs=sorted(glob.glob(d+'/frame-*.png'), key=lambda p:int(re.search(r'frame-(\d+)-',p).group(1)))
S='s15-rev2-work/src/f%04d.png'
for p,n in zip(fs,frames):
    r=cv2.imread(p,0).astype(np.float32); s=cv2.imread(S%n,0).astype(np.float32)
    D=cv2.GaussianBlur(r,(0,0),20)-cv2.GaussianBlur(s,(0,0),20)
    out=[]
    for sign,name in [(1,'BRIGHT'),(-1,'DARK')]:
        m=((D*sign)>35).astype(np.uint8)
        k,lab,st,cen=cv2.connectedComponentsWithStats(m)
        for i in range(1,k):
            x,y,w,h,a=st[i]
            if a<6000: continue
            v=float((D*sign)[lab==i].mean())
            out.append((a,f'{name} x{x}-{x+w} y{y}-{y+h} area{a//1000}k by{v:.0f}'))
    out.sort(reverse=True)
    print(n, '; '.join(o[1] for o in out[:4]))
