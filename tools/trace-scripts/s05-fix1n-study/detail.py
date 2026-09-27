# detail.py OUTDIR k : high-pass detail (std of img - blur4) render vs source in named regions + sigma1 MAE there
import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d,k=sys.argv[1],int(sys.argv[2])
f=[f for f in glob.glob(d+'/frame-*.png') if 578+math.floor(float(re.search(r'at-([\d.]+)s',f).group(1))*30+1e-6)==k][0]
a=cv2.imread(f).astype(np.float32).mean(2); b=(frames.frame(k)*255).astype(np.float32).mean(2)
R={'beanie':(1600,90,1850,250),'shirtback':(1650,520,2000,800),'owlhead':(1500,200,1700,440),'keyboard':(350,560,800,760),'sleeve':(1200,640,1450,780),'face':(1380,300,1520,520),'hair':(1500,300,1750,480),'lefthand':(560,650,800,800),'room':(0,0,300,300)}
hp=lambda x: x-cv2.GaussianBlur(x,(0,0),4)
for n,(x0,y0,x1,y1) in R.items():
    A=a[y0:y1,x0:x1]; B=b[y0:y1,x0:x1]
    e1=np.abs(cv2.GaussianBlur(A,(0,0),1)-cv2.GaussianBlur(B,(0,0),1)).mean(); e0=np.abs(A-B).mean()
    print(f'{n:10s} detail render {hp(A).std():5.1f} src {hp(B).std():5.1f} | MAE s0 {e0:5.1f} s1 {e1:5.1f}')
