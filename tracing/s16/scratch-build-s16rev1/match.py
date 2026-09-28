import cv2, glob, re, sys, numpy as np
D='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s16rev1'
out=sys.argv[1]
src={}
for n in range(1136,1203):
    im=cv2.imread(f'{D}/src/f{n:04d}.png',0).astype(np.float32)
    src[n]=cv2.GaussianBlur(cv2.resize(im,(551,236),interpolation=cv2.INTER_AREA),(0,0),1.5)
def best(p):
    im=cv2.imread(p,0).astype(np.float32)
    s=cv2.GaussianBlur(cv2.resize(im,(551,236),interpolation=cv2.INTER_AREA),(0,0),1.5)
    errs=sorted((float(np.mean(np.abs(s-v))),n) for n,v in src.items())
    return errs[:3]
for p in sorted(glob.glob(out+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    T=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=p.replace('frame-','ref-')
    b=best(p); rb=best(r)
    print(f'T={T:6.2f} T*25={T*25:7.2f} ref->{rb[0][1]}({rb[0][0]:.2f})  render->{b[0][1]}({b[0][0]:.2f}) 2nd {b[1][1]}({b[1][0]:.2f})')
