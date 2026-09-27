import numpy as np, sys
s=np.load('smean138.npy').mean(2); r=np.load(sys.argv[1]).mean(2)
def fwhm(prof):
    bg=np.median(np.concatenate([prof[:4],prof[-4:]])); pk=prof.max(); h=bg+(pk-bg)/2
    idx=np.where(prof>=h)[0]
    if len(idx)==0: return 0
    # subpixel
    a,b=idx[0],idx[-1]
    fa=a-(prof[a]-h)/(prof[a]-prof[a-1]) if a>0 else a
    fb=b+(prof[b]-h)/(prof[b]-prof[b+1]) if b+1<len(prof) else b
    return fb-fa, pk-bg
for (cx,cy,rx,ry) in [(1927,95,28.5,32.5),(73.5,87,30,34),(2084.5,298.5,25,31)]:
    print('sparkle',cx,cy)
    for d in [4,8,12,16,20,24]:
        out=[]
        for img in (s,r):
            # horizontal ray (right side): vertical profile at x=cx+d
            p=img[int(cy)-12:int(cy)+13,int(round(cx+d))]; w1,_=fwhm(p)
            p=img[int(cy)+d,int(cx)-12:int(cx)+13]; w2,_=fwhm(p)  # vertical ray (down): horizontal profile
            out.append((round(w1,1),round(w2,1)))
        print(f'  d={d}: src hray {out[0][0]} vray {out[0][1]} | ren hray {out[1][0]} vray {out[1][1]}')
