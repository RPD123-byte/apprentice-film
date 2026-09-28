import cv2,numpy as np,glob,re,sys
root='snapshots/'
def rp(f):
    for d in ['s02-rev2-a','s02-rev2-b']:
        for p in glob.glob(root+d+'/frame-*.png'):
            t=float(re.search(r'at-([\d.]+)s',p).group(1)); tt=int(t*30)/30
            if int(tt*25+0.5)==f: return p
R={'eyering L':(770,365,930,400),'eyering R':(1130,365,1290,400),'cheek L':(740,420,880,520),'cheek R':(1160,420,1300,520),
 'beanie':(700,0,1400,90),'room R panel':(1900,430,2206,800),'room L':(0,40,450,450),'room UR':(1560,0,1880,500),'hoodie L':(150,560,600,850),'hoodie R':(1600,600,1950,900),'hair R':(1330,350,1520,700),'hair L':(560,300,760,700),'forehead':(900,150,1150,230)}
for f in map(int,sys.argv[1:]):
    r=cv2.imread(rp(f),0).astype(np.float32); s=cv2.imread(root+'s02-fix1h-src/%04d.png'%f,0).astype(np.float32)
    print('frame',f)
    for k,(x0,y0,x1,y1) in R.items():
        a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
        hf=lambda im: np.abs(im-cv2.GaussianBlur(im,(0,0),2)).mean()
        print('  %-13s mean R %5.1f S %5.1f | hf-detail R %4.1f S %4.1f | black%% R %2.0f S %2.0f'%(k,a.mean(),b.mean(),hf(a),hf(b),100*(a<25).mean(),100*(b<25).mean()))
