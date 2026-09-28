# texe.py f dir1 dir2... : texture energy (std of band-pass luminance) in owl sub-regions, source vs renders
import cv2, numpy as np, sys
M='/Users/computer/rootline/apprentice-film/snapshots/end-s25-tfix-meas'
f=int(sys.argv[1]); dirs=sys.argv[2:]
R={'chest':(1000,540,1120,620),'belly':(980,640,1140,760),'lowbelly':(960,760,1160,800),'Lwing':(870,580,930,700),'Rwing':(1190,620,1270,700),'face':(990,400,1150,520)}
def bp(p):
    a=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
    return a, cv2.GaussianBlur(a,(0,0),1)-cv2.GaussianBlur(a,(0,0),5), cv2.GaussianBlur(a,(0,0),6)
ims=[('src',bp(f'{M}/src_{f:05d}.png'))]+[(d.split('/')[-1],bp(f'{d}/{f}.png')) for d in dirs]
print('region    '+'  '.join(f'{n:>22s}' for n,_ in ims))
for k,(x0,y0,x1,y1) in R.items():
    print(f'{k:9s} '+'  '.join(f'tex {b[y0:y1,x0:x1].std():5.1f} mean {a[y0:y1,x0:x1].mean():5.1f}' for n,(a,b,c) in ims))
