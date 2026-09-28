import cv2, numpy as np, glob, re, math
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(SRC)
def src(f):
    cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=cap.read(); return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
R={}
for p in glob.glob('/Users/computer/rootline/apprentice-film/snapshots/s02-rev1-m1/frame-*.png'):
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); R[math.floor(t*25+0.5)]=cv2.imread(p,0)
eyes=[(830,323),(1210,323)]
def track(get,fref):
    ref=get(fref); out={}
    tm=[ref[y-22:y+22,x-22:x+22].astype(np.float32) for x,y in eyes]
    for f in sorted(R):
        im=get(f).astype(np.float32); res=[]
        for (x,y),T in zip(eyes,tm):
            win=im[y-22-12:y+22+12,x-22-45:x+22+45]
            m=cv2.matchTemplate(win,T,cv2.TM_CCOEFF_NORMED); _,mx,_,loc=cv2.minMaxLoc(m)
            res.append((loc[0]-45,loc[1]-12,round(mx,2)))
        out[f]=res
    return out
r=track(lambda f:R[f],182); s=track(src,182)
print('f   render(dxL,dyL,dxR) | source(dxL,dyL,dxR)')
for f in sorted(R):
    a=r[f];b=s[f]
    print(f, f'{f/25:.2f}', f'R {a[0][0]:+4d}{a[0][1]:+3d} {a[1][0]:+4d} ({a[0][2]},{a[1][2]})', f'| S {b[0][0]:+4d}{b[0][1]:+3d} {b[1][0]:+4d} ({b[0][2]},{b[1][2]})', ' diff', a[0][0]-b[0][0], a[1][0]-b[1][0])
