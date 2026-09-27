# region stats: python3 reg.py DIR f1 f2 ...
import cv2,numpy as np,sys
R={'eyering L':(770,365,930,400),'eyering R':(1130,365,1290,400),'cheekL':(720,380,850,650),'nose side':(950,480,990,560),'bridge':(1000,300,1100,380),
 'cuff152':(560,0,1510,100),'knitL':(560,100,700,330),'forehead':(900,150,1150,230),'hair L':(560,300,760,700),'hair R':(1330,350,1520,700),
 'hoodie L':(150,520,600,850),'hoodie R':(1600,600,1950,900),'room R panel':(1900,430,2206,800),'room UR':(1560,0,1880,500)}
hf=lambda im: np.abs(im-cv2.GaussianBlur(im,(0,0),2)).mean()
def band(im): return (cv2.GaussianBlur(im,(0,0),5)-cv2.GaussianBlur(im,(0,0),25)).std()
d=sys.argv[1]
for f in map(int,sys.argv[2:]):
    r=cv2.imread(f'{d}/r{f:04d}.png',0).astype(np.float32); s=cv2.imread('../s02-fix1h-src/%04d.png'%f,0).astype(np.float32)
    print('frame',f)
    for k,(x0,y0,x1,y1) in R.items():
        a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
        print('  %-13s mean R %5.1f S %5.1f | hf R %4.1f S %4.1f | black%% R %2.0f S %2.0f | fine R %4.1f S %4.1f'%(k,a.mean(),b.mean(),hf(a),hf(b),100*(a<25).mean(),100*(b<25).mean(), (a-cv2.GaussianBlur(a,(0,0),3)).std(), (b-cv2.GaussianBlur(b,(0,0),3)).std()))
