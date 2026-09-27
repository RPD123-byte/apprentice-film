import cv2, glob, sys, re, numpy as np
d=sys.argv[1]; idxs=[int(x) for x in sys.argv[2].split(',')]
R={
 'farL x<130':(0,0,130,946),'L boxes':(130,50,450,700),'L low boxes':(130,700,400,946),'L speaker':(557,107,715,350),
 'behind lap L':(560,0,840,110),'behind lap R':(1290,0,1460,260),'above R spk':(1460,0,1720,160),
 'desk L wing':(380,300,840,540),'desk R wing':(1300,300,1780,540),'screen':(880,75,1260,265),'keys':(900,335,1250,430),
 'under desk L':(560,560,790,760),'under desk R':(1480,560,1690,760),'floor L':(400,780,800,946),'floor R':(1380,780,1800,946),
 'R per top':(1800,0,2206,300),'R per mid':(1800,300,2206,650),'R per bot':(1800,650,2206,946),
 'lamp':(1437,67,1550,212),'mug':(1437,322,1560,436),'R speaker':(1514,150,1654,390),
 'head crown':(1000,540,1150,600),'head mid':(980,640,1180,720),'head low':(990,760,1170,830),
 'hood L':(885,580,950,730),'hood R':(1205,580,1275,730),'sleeve L':(750,600,900,800),'sleeve R':(1280,600,1450,800),
 'hand L':(880,360,995,498),'hand R':(1084,444,1236,552),'chair':(815,847,1370,946),
}
def grad(g):
    g=cv2.GaussianBlur(g,(0,0),1.2); return np.abs(cv2.Sobel(g,cv2.CV_32F,1,0))+np.abs(cv2.Sobel(g,cv2.CV_32F,0,1))
for i in idxs:
    f=sorted(glob.glob(f'{d}/frame-{i:02d}-*.png'))[0]; t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('/frame-','/ref-'),0).astype(np.float32)
    ga,gb=grad(a),grad(b)
    print(f'--- t={t}   region: mean render/src | texture(grad) render/src')
    for k,(x0,y0,x1,y1) in R.items():
        print(f'{k:14s} {a[y0:y1,x0:x1].mean():6.1f} {b[y0:y1,x0:x1].mean():6.1f} | {ga[y0:y1,x0:x1].mean():6.1f} {gb[y0:y1,x0:x1].mean():6.1f}')
