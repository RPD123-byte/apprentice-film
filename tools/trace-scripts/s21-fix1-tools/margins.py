import cv2, numpy as np, glob, re, sys
g=lambda p: cv2.GaussianBlur(cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
d=sys.argv[1]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    R=g(f); S=g(f.replace('frame-','ref-'))
    print(f'{t:.3f}')
    for y in (15,60,110):
        print('  top y=%3d '%y+' '.join(f'{x}:{R[y,x]-S[y,x]:+.0f}' for x in range(150,2201,250)))
    for x in (30,100):
        print('  left x=%3d '%x+' '.join(f'{y}:{R[y,x]-S[y,x]:+.0f}' for y in range(150,941,100)))
    print('  bottom y=920 '+' '.join(f'{x}:{R[920,x]-S[920,x]:+.0f}' for x in range(150,2201,250)))
