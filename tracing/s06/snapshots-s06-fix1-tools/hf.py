# hf.py DIR.. : high-pass (x - blur sigma 1.5) std in flat-ish regions, render vs source (frames 670,700,720)
import cv2,numpy as np,sys
R={'cheekL':(820,430,900,520),'cheekR':(1150,430,1230,520),'forehead':(900,110,1000,160),'owlbelly':(1600,480,1700,560),'hoodieL':(150,600,350,760),'hoodieR':(1850,650,2050,800),'hand':(640,640,760,740),'room':(60,60,300,300)}
def hf(im,b):
    x0,y0,x1,y1=b; h=im-cv2.GaussianBlur(im,(0,0),1.5); return h[y0:y1,x0:x1].std()
S=lambda n: cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(np.float32)
fr=(670,700,720)
print('src   ',' '.join(f'{k}:{np.mean([hf(S(n),b) for n in fr]):.1f}' for k,b in R.items()))
for d in sys.argv[1:]:
    I=lambda n: cv2.imread(f'{d}/f-{n}.png',0).astype(np.float32)
    print(d.split('/')[-1][:6],' '.join(f'{k}:{np.mean([hf(I(n),b) for n in fr]):.1f}' for k,b in R.items()))
